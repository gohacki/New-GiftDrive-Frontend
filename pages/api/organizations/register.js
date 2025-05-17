// File: pages/api/organizations/register.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

export const config = { api: { bodyParser: false } };
const parseForm = (req) => { /* ... (same parseForm helper) ... */
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
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = session.user;

    if (user.is_org_admin && user.org_id) { // Check if already an org admin
        return res.status(400).json({ error: 'You are already associated with an organization.' });
    }

    try {
        const { fields, files } = await parseForm(req);
        const { name, description, address, city, state, zip_code, website_link, phone, country = 'US' } = fields;
        const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

        // Validation (same as POST /organizations)
        if (!name || !phone || !address || !city || !state || !zip_code || !country) {
            if (photoFile) fs.unlinkSync(photoFile.filepath);
            return res.status(400).json({ error: 'Organization name, phone, and full address (including country) are required' });
        }
        if (!/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
            if (photoFile) fs.unlinkSync(photoFile.filepath);
            return res.status(400).json({ error: 'Invalid phone number format (E.164).' });
        }

        let photoUrl = null;
        if (photoFile) {
            // File type/size validation & S3 upload
            // ... (same as POST /organizations) ...
            const allowedTypes = /jpeg|jpg|png|gif/;
            const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
            const mimetype = allowedTypes.test(photoFile.mimetype);
            if (!(extname && mimetype)) { fs.unlinkSync(photoFile.filepath); return res.status(400).json({ error: 'Only images are allowed.' }); }
            if (photoFile.size > 5 * 1024 * 1024) { fs.unlinkSync(photoFile.filepath); return res.status(400).json({ error: 'File too large. Max 5MB.' }); }

            const s3Key = `images/orgs/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
            const fileStream = fs.createReadStream(photoFile.filepath);
            await s3.putObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: s3Key, Body: fileStream, ACL: 'public-read', ContentType: photoFile.mimetype });
            photoUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${s3Key}`;
            fs.unlinkSync(photoFile.filepath);
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO organizations (name, description, photo, address, city, state, zip_code, website_link, phone, country, is_featured)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
                [name, description, photoUrl, address, city, state, zip_code, website_link, phone.trim(), country.trim().toUpperCase()]
            );
            const org_id = result.insertId;

            await connection.query(
                'UPDATE accounts SET org_id = ?, is_org_admin = TRUE WHERE account_id = ?',
                [org_id, user.id] // user.id from Auth.js session
            );
            await connection.commit();

            // It's good practice to refetch the user's session data if roles/org_id changed
            // However, the session token won't update immediately without a new sign-in or session update trigger.
            // The client might need to re-fetch user data or the session will update on next interaction.

            const [newOrg] = await pool.query('SELECT * FROM organizations WHERE org_id = ?', [org_id]);
            return res.status(201).json({ message: 'Organization registered successfully', organization: newOrg[0] });
        } catch (dbError) {
            if (connection) await connection.rollback();
            throw dbError; // Re-throw to be caught by outer try-catch
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Error registering organization:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}