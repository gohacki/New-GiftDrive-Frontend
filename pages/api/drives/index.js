// File: pages/api/drives/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

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
    if (req.method === 'GET') {
        try {
            const [drives] = await pool.query(`
                SELECT d.drive_id, d.org_id, d.name, d.description, d.photo, 
                       d.start_date, d.end_date, d.created_at,
                       o.city AS org_city, o.state AS org_state
                FROM drives d
                JOIN organizations o ON d.org_id = o.org_id
                ORDER BY d.start_date DESC
            `);

            if (drives.length === 0) {
                return res.status(200).json([]);
            }

            const driveIds = drives.map(d => d.drive_id);

            // Fetch all needed aggregates in fewer queries
            const [driveItemsNeededRows] = await pool.query(
                'SELECT drive_id, COALESCE(SUM(quantity), 0) AS total_drive_needed FROM drive_items WHERE drive_id IN (?) AND is_active = 1 GROUP BY drive_id',
                [driveIds]
            );
            const [childItemsNeededRows] = await pool.query(
                `SELECT uc.drive_id, COALESCE(SUM(ci.quantity), 0) AS total_child_needed
                 FROM unique_children uc
                 JOIN child_items ci ON uc.child_id = ci.child_id
                 WHERE uc.drive_id IN (?) AND ci.is_active = 1 GROUP BY uc.drive_id`,
                [driveIds]
            );
            const [driveItemsPurchasedRows] = await pool.query(
                `SELECT oi.drive_id, COALESCE(SUM(oi.quantity), 0) AS total_drive_purchased
                 FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
                 WHERE oi.drive_id IN (?) AND oi.child_id IS NULL AND o.status NOT IN ('cancelled', 'failed', 'refunded') GROUP BY oi.drive_id`,
                [driveIds]
            );
            const [childItemsPurchasedRows] = await pool.query(
                `SELECT uc.drive_id, COALESCE(SUM(oi.quantity), 0) AS total_child_purchased
                 FROM order_items oi
                 JOIN unique_children uc ON oi.child_id = uc.child_id
                 JOIN orders o ON oi.order_id = o.order_id
                 WHERE uc.drive_id IN (?) AND o.status NOT IN ('cancelled', 'failed', 'refunded') GROUP BY uc.drive_id`,
                [driveIds]
            );

            // Map aggregates to drives
            const driveItemsNeededMap = new Map(driveItemsNeededRows.map(r => [r.drive_id, Number(r.total_drive_needed) || 0]));
            const childItemsNeededMap = new Map(childItemsNeededRows.map(r => [r.drive_id, Number(r.total_child_needed) || 0]));
            const driveItemsPurchasedMap = new Map(driveItemsPurchasedRows.map(r => [r.drive_id, Number(r.total_drive_purchased) || 0]));
            const childItemsPurchasedMap = new Map(childItemsPurchasedRows.map(r => [r.drive_id, Number(r.total_child_purchased) || 0]));

            const driveData = drives.map(drive => {
                const totalDriveNeeded = driveItemsNeededMap.get(drive.drive_id) || 0;
                const totalChildNeeded = childItemsNeededMap.get(drive.drive_id) || 0;
                const totalNeeded = totalDriveNeeded + totalChildNeeded;

                const totalDrivePurchased = driveItemsPurchasedMap.get(drive.drive_id) || 0;
                const totalChildPurchased = childItemsPurchasedMap.get(drive.drive_id) || 0;
                const totalPurchased = totalDrivePurchased + totalChildPurchased;

                return { ...drive, totalNeeded, totalPurchased };
            });

            return res.status(200).json(driveData);
        } catch (error) {
            console.error('Error fetching drives for list:', error);
            return res.status(500).json({ error: 'Internal server error fetching drives' });
        }
    } else if (req.method === 'POST') {
        // ... (Your POST logic remains the same, but ensure it releases connections if using pool.getConnection())
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user || !session.user.org_id) {
            return res.status(401).json({ message: 'Not authenticated or not an organization admin.' });
        }

        let tempFilePath = null; // To track uploaded file for cleanup on error
        try {
            const { fields, files } = await parseForm(req);
            const { name, description, start_date, end_date } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;
            tempFilePath = photoFile?.filepath;


            if (!name || !description || !start_date || !end_date) {
                return res.status(400).json({ error: 'Name, description, start date, and end date are required.' });
            }

            let photoUrl = null;
            if (photoFile) {
                const allowedTypes = /jpeg|jpg|png|gif|webp/;
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

                await s3.putObject({
                    Bucket: process.env.DO_SPACES_BUCKET,
                    Key: s3Key,
                    Body: fileStream,
                    ACL: 'public-read',
                    ContentType: photoFile.mimetype,
                });
                let endpoint = process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '');
                photoUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpoint}/${s3Key}`;
            }

            const [result] = await pool.query(
                'INSERT INTO drives (org_id, name, description, start_date, end_date, photo) VALUES (?, ?, ?, ?, ?, ?)',
                [session.user.org_id, name, description, start_date, end_date, photoUrl]
            );
            const [newDrive] = await pool.query('SELECT * FROM drives WHERE drive_id = ?', [result.insertId]);
            return res.status(201).json(newDrive[0]);

        } catch (error) {
            console.error('Error adding new drive:', error);
            if (error.message?.includes('Invalid file type') || error.message?.includes('File is too large')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error creating drive.' });
        } finally {
            if (tempFilePath) { // Clean up temp file if it exists
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkErr) {
                    console.warn("Error cleaning up temp file:", unlinkErr);
                }
            }
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}