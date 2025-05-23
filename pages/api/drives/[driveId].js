// File: pages/api/drives/[driveId].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { getCoreDriveDetails } from '../../../lib/services/driveService'; // IMPORT THE SERVICE

export const config = { api: { bodyParser: false } };
const parseForm = (req) => { /* ... same parseForm helper ... */
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
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

    if (req.method === 'GET') {
        try {
            const driveData = await getCoreDriveDetails(driveIdFromQuery); // USE THE SERVICE FUNCTION
            if (!driveData) {
                return res.status(404).json({ message: 'Drive not found' });
            }
            // Note: GSSP will now call getCoreDriveDetails directly, and then other service functions for aggregates, items etc.
            // This API endpoint might now only need to return core details if its sole purpose was to serve GSSP previously.
            // If other parts of your app consume this API for *just* core details, this is fine.
            // If GSSP was the *only* consumer, you might not even need to modify this GET, but it's good practice.
            return res.status(200).json(driveData);
        } catch (error) {
            console.error(`Error fetching drive ${driveIdFromQuery}:`, error);
            if (error.message.includes("Invalid Drive ID")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error fetching drive details' });
        }
    } else if (req.method === 'PUT') {
        // ... (PUT logic remains the same, as it modifies data, no change to service call needed here unless you want to encapsulate S3 upload too)
        // ... Your existing PUT code ...
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }
        const numericDriveId = parseInt(driveIdFromQuery, 10);
        if (isNaN(numericDriveId)) {
            return res.status(400).json({ error: "Invalid Drive ID." });
        }
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
                if (photoFile) fs.unlinkSync(photoFile.filepath);
                return res.status(400).json({ error: 'Name, description, start date, and end date are required.' });
            }

            const [currentDriveRows] = await pool.query('SELECT photo FROM drives WHERE drive_id = ?', [numericDriveId]); // Corrected to use numericDriveId
            const currentDrive = currentDriveRows[0];
            let photoUrlToUpdate = currentDrive?.photo;


            if (photoFile) {
                const allowedTypes = /jpeg|jpg|png|gif|webp/;
                const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
                const mimetype = allowedTypes.test(photoFile.mimetype);
                if (!(extname && mimetype)) {
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
                }
                if (photoFile.size > 5 * 1024 * 1024) {
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'File is too large. Max 5MB.' });
                }

                if (photoUrlToUpdate) {
                    try {
                        // More robust key extraction
                        const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                            ? process.env.DO_SPACES_ENDPOINT
                            : `https://${process.env.DO_SPACES_ENDPOINT}`;
                        const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;
                        let oldKey;
                        if (photoUrlToUpdate.startsWith(fullBaseUrl)) {
                            oldKey = photoUrlToUpdate.substring(fullBaseUrl.length);
                        } else {
                            // Fallback for potentially different URL structures (less common if consistent)
                            const urlParts = photoUrlToUpdate.split('/');
                            oldKey = urlParts.slice(urlParts.indexOf('images')).join('/'); // Assumes 'images' is part of path
                        }
                        if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));

                    } catch (s3DelErr) { console.error("Error deleting old drive photo:", s3DelErr); }
                }

                const s3Key = `images/drives/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);

                await s3.send(new PutObjectCommand({
                    Bucket: process.env.DO_SPACES_BUCKET,
                    Key: s3Key,
                    Body: fileStream,
                    ACL: 'public-read',
                    ContentType: photoFile.mimetype,
                }));
                let endpoint = process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '');
                photoUrlToUpdate = `https://${process.env.DO_SPACES_BUCKET}.${endpoint}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath);
            }

            await pool.query(
                'UPDATE drives SET name = ?, description = ?, start_date = ?, end_date = ?, photo = ? WHERE drive_id = ?',
                [name, description, start_date, end_date, photoUrlToUpdate, numericDriveId]
            );
            const [updatedDriveRows] = await pool.query('SELECT * FROM drives WHERE drive_id = ?', [numericDriveId]); // Corrected to use numericDriveId
            return res.status(200).json(updatedDriveRows[0]);
        } catch (error) {
            console.error(`Error updating drive ${numericDriveId}:`, error); // Corrected to use numericDriveId
            return res.status(500).json({ error: 'Internal server error updating drive.' });
        }
    } else if (req.method === 'DELETE') {
        // ... (DELETE logic remains the same) ...
        // ... Your existing DELETE code ...
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }
        const numericDriveId = parseInt(driveIdFromQuery, 10); // Define numericDriveId for DELETE as well
        if (isNaN(numericDriveId)) {
            return res.status(400).json({ error: "Invalid Drive ID." });
        }

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

            await connection.query(
                `DELETE cc FROM cart_contents cc
                 JOIN drive_items di ON cc.source_drive_item_id = di.drive_item_id
                 WHERE di.drive_id = ?`,
                [numericDriveId]
            );
            await connection.query(
                `DELETE cc FROM cart_contents cc
                 JOIN child_items ci ON cc.source_child_item_id = ci.child_item_id
                 JOIN unique_children uc ON ci.child_id = uc.child_id
                 WHERE uc.drive_id = ?`,
                [numericDriveId]
            );

            await connection.query('UPDATE order_items SET source_drive_item_id = NULL WHERE source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id = ?)', [numericDriveId]);
            await connection.query('UPDATE order_items SET source_child_item_id = NULL WHERE source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id = ?)', [numericDriveId]);

            await connection.query('DELETE FROM drive_items WHERE drive_id = ?', [numericDriveId]);
            await connection.query('DELETE FROM child_items WHERE child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?)', [numericDriveId]);
            await connection.query('DELETE FROM unique_children WHERE drive_id = ?', [numericDriveId]);

            const [deleteResult] = await connection.query('DELETE FROM drives WHERE drive_id = ?', [numericDriveId]);

            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Drive not found or already deleted.' });
            }

            if (photoUrlToDelete) {
                try {
                    const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                        ? process.env.DO_SPACES_ENDPOINT
                        : `https://${process.env.DO_SPACES_ENDPOINT}`;
                    const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;
                    let oldKey;
                    if (photoUrlToDelete.startsWith(fullBaseUrl)) {
                        oldKey = photoUrlToDelete.substring(fullBaseUrl.length);
                    } else {
                        const urlParts = photoUrlToDelete.split('/');
                        oldKey = urlParts.slice(urlParts.indexOf('images')).join('/');
                    }
                    if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));
                } catch (s3DelErr) { console.error("Error deleting drive photo from S3 during drive delete:", s3DelErr); }
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