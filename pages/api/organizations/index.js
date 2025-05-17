// File: pages/api/organizations/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

export const config = { // Disable default body parser for POST (file upload)
    api: { bodyParser: false },
};

const parseForm = (req) => { /* ... (same parseForm helper as in drives/index.js) ... */
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
    const session = await getServerSession(req, res, authOptions);

    if (req.method === 'GET') {
        if (!session || !session.user || !session.user.is_super_admin) { // Admin check
            return res.status(403).json({ message: "Forbidden: Not authorized" });
        }
        try {
            const [organizations] = await pool.query('SELECT org_id, name, description, photo, address, city, state, zip_code, website_link, phone, is_featured, country FROM organizations');
            return res.status(200).json(organizations);
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'POST') {
        if (!session || !session.user || !session.user.is_super_admin) { // Admin check
            return res.status(403).json({ message: "Forbidden: Not authorized" });
        }

        try {
            const { fields, files } = await parseForm(req);
            const { name, description, address, city, state, zip_code, website_link, phone, country = 'US' } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

            // Validation (same as Express)
            if (!name || !phone || !address || !city || !state || !zip_code || !country) {
                // If a file was uploaded, attempt to delete it from S3 if validation fails early
                if (photoFile) fs.unlinkSync(photoFile.filepath); // Delete temp
                return res.status(400).json({ error: 'Organization name, phone, and full address (including country) are required' });
            }
            if (!/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
                if (photoFile) fs.unlinkSync(photoFile.filepath);
                return res.status(400).json({ error: 'Invalid phone number format. Please use E.164 format (e.g., +12125551212).' });
            }

            let photoUrl = null;
            if (photoFile) {
                // File type/size validation (same as drives/index.js)
                const allowedTypes = /jpeg|jpg|png|gif/;
                const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
                const mimetype = allowedTypes.test(photoFile.mimetype);
                if (!(extname && mimetype)) { fs.unlinkSync(photoFile.filepath); return res.status(400).json({ error: 'Only images are allowed.' }); }
                if (photoFile.size > 5 * 1024 * 1024) { fs.unlinkSync(photoFile.filepath); return res.status(400).json({ error: 'File too large. Max 5MB.' }); }

                const s3Key = `images/orgs/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);
                await s3.putObject({
                    Bucket: process.env.DO_SPACES_BUCKET, Key: s3Key, Body: fileStream,
                    ACL: 'public-read', ContentType: photoFile.mimetype,
                });
                photoUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath);
            }

            const [result] = await pool.query(
                `INSERT INTO organizations (name, description, photo, address, city, state, zip_code, website_link, phone, country, is_featured)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`, // Default is_featured to FALSE
                [name, description, photoUrl, address, city, state, zip_code, website_link, phone.trim(), country.trim().toUpperCase()]
            );
            const [newOrg] = await pool.query('SELECT * FROM organizations WHERE org_id = ?', [result.insertId]);
            return res.status(201).json({ message: 'Organization added successfully', organization: newOrg[0] });
        } catch (error) {
            console.error('Error adding organization:', error);
            // If S3 upload succeeded but DB insert failed, you might want to delete the S3 object.
            // This requires careful handling of photoUrl if it was set.
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}