// File: pages/api/drives/[driveId].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces"; // Your S3 client
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"; // Updated for v3
import formidable from 'formidable'; // For parsing multipart/form-data
import path from 'path';
import fs from 'fs'; // Needed for formidable to temporarily save file

// Helper to disable default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to parse form with formidable
const parseForm = (req) => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false }); // Don't allow multiple files for 'photo'
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            // formidable nests fields in arrays, convert to single values if not an array
            const singleFields = {};
            for (const key in fields) {
                singleFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
            }
            resolve({ fields: singleFields, files });
        });
    });
};


export default async function handler(req, res) {
    const { driveId: driveIdFromQuery } = req.query;
    const numericDriveId = parseInt(driveIdFromQuery, 10);

    if (req.method === 'GET') {
        if (isNaN(numericDriveId)) {
            return res.status(400).json({ error: "Invalid Drive ID." });
        }
        try {
            // Fetch the specific drive and include necessary organization details
            const [driveRows] = await pool.query(
                `SELECT d.*, o.name as organization_name, o.photo as organization_photo, o.city as org_city, o.state as org_state
                 FROM drives d
                 JOIN organizations o ON d.org_id = o.org_id
                 WHERE d.drive_id = ?`,
                [numericDriveId]
            );

            if (driveRows.length === 0) {
                return res.status(404).json({ message: 'Drive not found' });
            }
            const driveData = driveRows[0];

            // Fetch associated children for this drive
            const [childrenRows] = await pool.query(
                `SELECT uc.child_id, dc.name as child_name, dc.photo as child_photo
                 FROM unique_children uc
                 JOIN default_children dc ON uc.default_child_id = dc.default_child_id
                 WHERE uc.drive_id = ?`,
                [numericDriveId]
            );
            driveData.children = childrenRows || [];

            // Note: Additional details like drive items and aggregates (totalNeeded, totalPurchased)
            // are fetched by the frontend page's getServerSideProps via separate API calls
            // (e.g., /api/drives/[id]/items and /api/drives/[id]/aggregate).
            // This endpoint primarily returns the core drive data + org info + basic children info.

            return res.status(200).json(driveData);
        } catch (error) {
            console.error(`Error fetching drive ${numericDriveId}:`, error);
            return res.status(500).json({ error: 'Internal server error fetching drive details' });
        }
    } else if (req.method === 'PUT') {
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }
        if (isNaN(numericDriveId)) {
            return res.status(400).json({ error: "Invalid Drive ID." });
        }
        // Authorization check: User must be an admin of the drive's org or a super admin
        const [driveOrgCheck] = await pool.query('SELECT org_id FROM drives WHERE drive_id = ?', [numericDriveId]);
        if (driveOrgCheck.length === 0) {
            return res.status(404).json({ error: 'Drive not found.' });
        }
        if (!session.user.is_super_admin && session.user.org_id !== driveOrgCheck[0].org_id) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this drive.' });
        }

        try {
            const { fields, files } = await parseForm(req);
            const { name, description, start_date, end_date } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

            if (!name || !description || !start_date || !end_date) {
                if (photoFile) fs.unlinkSync(photoFile.filepath); // Clean up temp if validation fails early
                return res.status(400).json({ error: 'Name, description, start date, and end date are required.' });
            }
            // Add date validation if necessary (e.g., end_date >= start_date)

            const [currentDrive] = await pool.query('SELECT photo FROM drives WHERE drive_id = ?', [numericDriveId]);
            let photoUrlToUpdate = currentDrive[0]?.photo;

            if (photoFile) {
                const allowedTypes = /jpeg|jpg|png|gif|webp/; // Added webp
                const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
                const mimetype = allowedTypes.test(photoFile.mimetype);
                if (!(extname && mimetype)) {
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
                }
                if (photoFile.size > 5 * 1024 * 1024) { // 5MB
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'File is too large. Max 5MB.' });
                }

                if (photoUrlToUpdate) { // Delete old photo from S3
                    try {
                        const oldKey = photoUrlToUpdate.split(`${process.env.DO_SPACES_ENDPOINT}/`)[1];
                        if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));
                    } catch (s3DelErr) { console.error("Error deleting old drive photo:", s3DelErr); /* Log and continue */ }
                }

                const s3Key = `images/drives/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);

                await s3.send(new PutObjectCommand({ // Corrected for S3 v3 SDK
                    Bucket: process.env.DO_SPACES_BUCKET,
                    Key: s3Key,
                    Body: fileStream,
                    ACL: 'public-read',
                    ContentType: photoFile.mimetype,
                }));
                photoUrlToUpdate = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath); // Clean up temp file
            }

            await pool.query(
                'UPDATE drives SET name = ?, description = ?, start_date = ?, end_date = ?, photo = ? WHERE drive_id = ?',
                [name, description, start_date, end_date, photoUrlToUpdate, numericDriveId]
            );
            const [updatedDrive] = await pool.query('SELECT * FROM drives WHERE drive_id = ?', [numericDriveId]);
            return res.status(200).json(updatedDrive[0]);
        } catch (error) {
            console.error(`Error updating drive ${numericDriveId}:`, error);
            return res.status(500).json({ error: 'Internal server error updating drive.' });
        }
    } else if (req.method === 'DELETE') {
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }
        if (isNaN(numericDriveId)) {
            return res.status(400).json({ error: "Invalid Drive ID." });
        }
        // Authorization check
        const [driveOrgCheck] = await pool.query('SELECT org_id, photo FROM drives WHERE drive_id = ?', [numericDriveId]);
        if (driveOrgCheck.length === 0) {
            return res.status(404).json({ error: 'Drive not found.' });
        }
        if (!session.user.is_super_admin && session.user.org_id !== driveOrgCheck[0].org_id) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this drive.' });
        }
        const photoUrlToDelete = driveOrgCheck[0].photo;

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Delete associated cart_contents for items in this drive
            await connection.query(
                `DELETE cc FROM cart_contents cc
                 JOIN drive_items di ON cc.source_drive_item_id = di.drive_item_id
                 WHERE di.drive_id = ?`,
                [numericDriveId]
            );
            // Delete associated cart_contents for child_items in this drive
            await connection.query(
                `DELETE cc FROM cart_contents cc
                 JOIN child_items ci ON cc.source_child_item_id = ci.child_item_id
                 JOIN unique_children uc ON ci.child_id = uc.child_id
                 WHERE uc.drive_id = ?`,
                [numericDriveId]
            );

            // Set order_items source IDs to NULL if they point to items from this drive
            await connection.query('UPDATE order_items SET source_drive_item_id = NULL WHERE source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id = ?)', [numericDriveId]);
            await connection.query('UPDATE order_items SET source_child_item_id = NULL WHERE source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id = ?)', [numericDriveId]);

            // Delete drive_items and child_items associated with the drive
            await connection.query('DELETE FROM drive_items WHERE drive_id = ?', [numericDriveId]);
            await connection.query('DELETE FROM child_items WHERE child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?)', [numericDriveId]);
            // Delete unique_children associated with the drive
            await connection.query('DELETE FROM unique_children WHERE drive_id = ?', [numericDriveId]);

            // Delete the drive itself
            const [deleteResult] = await connection.query('DELETE FROM drives WHERE drive_id = ?', [numericDriveId]);

            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Drive not found or already deleted.' });
            }

            // If drive photo exists, delete from S3
            if (photoUrlToDelete) {
                try {
                    const oldKey = photoUrlToDelete.split(`${process.env.DO_SPACES_ENDPOINT}/`)[1];
                    if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));
                } catch (s3DelErr) { console.error("Error deleting drive photo from S3 during drive delete:", s3DelErr); /* Log and continue, DB deletion is more critical */ }
            }
            await connection.commit();
            return res.status(200).json({ message: 'Drive and associated data deleted successfully.' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Error deleting drive ${numericDriveId}:`, error);
            return res.status(500).json({ error: 'Internal server error deleting drive.' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}