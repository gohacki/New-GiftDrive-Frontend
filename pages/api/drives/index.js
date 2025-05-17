// File: pages/api/drives/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces"; // Your S3 client
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
    if (req.method === 'GET') {
        // --- Logic for GET / (List all drives with aggregation) ---
        try {
            const [drives] = await pool.query(`
                SELECT d.*, o.city AS org_city, o.state AS org_state
                FROM drives d
                JOIN organizations o ON d.org_id = o.org_id
                ORDER BY d.start_date DESC
            `);

            const driveData = await Promise.all(
                drives.map(async (drive) => {
                    const driveId = drive.drive_id;
                    // Your existing aggregation logic
                    const [[driveItemsNeededRow]] = await pool.query(
                        'SELECT COALESCE(SUM(quantity), 0) AS total_drive_needed FROM drive_items WHERE drive_id = ? AND is_active = 1',
                        [driveId]
                    );
                    const totalDriveNeeded = Number(driveItemsNeededRow.total_drive_needed) || 0;

                    const [[childItemsNeededRow]] = await pool.query(
                        `SELECT COALESCE(SUM(ci.quantity), 0) AS total_child_needed
                         FROM unique_children uc
                         JOIN child_items ci ON uc.child_id = ci.child_id
                         WHERE uc.drive_id = ? AND ci.is_active = 1`,
                        [driveId]
                    );
                    const totalChildNeeded = Number(childItemsNeededRow.total_child_needed) || 0;
                    const totalNeeded = totalDriveNeeded + totalChildNeeded;

                    const [[driveItemsPurchasedRow]] = await pool.query(
                        `SELECT COALESCE(SUM(oi.quantity), 0) AS total_drive_purchased
                         FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
                         WHERE oi.drive_id = ? AND oi.child_id IS NULL AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
                        [driveId]
                    );
                    const totalDrivePurchased = Number(driveItemsPurchasedRow.total_drive_purchased) || 0;

                    const [[childItemsPurchasedRow]] = await pool.query(
                        `SELECT COALESCE(SUM(oi.quantity), 0) AS total_child_purchased
                         FROM order_items oi
                         JOIN unique_children uc ON oi.child_id = uc.child_id
                         JOIN orders o ON oi.order_id = o.order_id
                         WHERE uc.drive_id = ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
                        [driveId]
                    );
                    const totalChildPurchased = Number(childItemsPurchasedRow.total_child_purchased) || 0;
                    const totalPurchased = totalDrivePurchased + totalChildPurchased;

                    return { ...drive, totalNeeded, totalPurchased };
                })
            );
            return res.status(200).json(driveData);
        } catch (error) {
            console.error('Error fetching drives for list:', error);
            return res.status(500).json({ error: 'Internal server error fetching drives' });
        }
    } else if (req.method === 'POST') {
        // --- Logic for POST / (Create new drive) ---
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }
        // Add role check if needed: if (!session.user.is_org_admin) return res.status(403).json(...)

        try {
            const { fields, files } = await parseForm(req);
            const { name, description, start_date, end_date } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

            if (!name || !description || !start_date || !end_date) {
                return res.status(400).json({ error: 'Name, description, start date, and end date are required.' });
            }

            let photoUrl = null;
            if (photoFile) {
                // Validate file type and size here if not handled by formidable's options
                const allowedTypes = /jpeg|jpg|png|gif/;
                const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
                const mimetype = allowedTypes.test(photoFile.mimetype);

                if (!(extname && mimetype)) {
                    return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
                }
                if (photoFile.size > 5 * 1024 * 1024) { // 5MB
                    return res.status(400).json({ error: 'File is too large. Max 5MB.' });
                }

                const s3Key = `images/drives/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);

                await s3.putObject({ // Using direct s3.putObject
                    Bucket: process.env.DO_SPACES_BUCKET,
                    Key: s3Key,
                    Body: fileStream,
                    ACL: 'public-read',
                    ContentType: photoFile.mimetype,
                });
                photoUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath); // Clean up temp file
            }

            const [result] = await pool.query(
                'INSERT INTO drives (org_id, name, description, start_date, end_date, photo) VALUES (?, ?, ?, ?, ?, ?)',
                [session.user.org_id, name, description, start_date, end_date, photoUrl]
            );
            const [newDrive] = await pool.query('SELECT * FROM drives WHERE drive_id = ?', [result.insertId]);
            return res.status(201).json(newDrive[0]);

        } catch (error) {
            console.error('Error adding new drive:', error);
            if (error.message.includes('Invalid file type') || error.message.includes('File is too large')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error creating drive.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}