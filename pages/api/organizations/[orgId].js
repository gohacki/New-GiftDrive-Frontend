// File: pages/api/organizations/[orgId].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
// trackPageView logic will be integrated into the GET handler

export const config = { // For PUT with file upload
    api: { bodyParser: false },
};

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

// Helper to verify if user can manage this org
async function verifyOrgOwnership(orgId, user) {
    if (!user) return { authorized: false, message: "Not authenticated", status: 401 };
    if (!orgId || isNaN(parseInt(orgId, 10))) return { authorized: false, message: "Invalid Organization ID", status: 400 };

    const numericOrgId = parseInt(orgId, 10);
    if (user.is_super_admin) {
        return { authorized: true, message: "Authorized as super admin", status: 200 };
    }
    if (!user.is_org_admin || user.org_id !== numericOrgId) {
        return { authorized: false, message: "Forbidden: Not authorized for this organization", status: 403 };
    }
    return { authorized: true, message: "Authorized as org admin", status: 200 };
}


export default async function handler(req, res) {
    const { orgId: orgIdFromQuery } = req.query;
    const numericOrgId = parseInt(orgIdFromQuery, 10);

    if (isNaN(numericOrgId)) {
        return res.status(400).json({ error: "Invalid Organization ID." });
    }

    if (req.method === 'GET') {
        // trackPageView logic
        try {
            // It's generally okay for page view tracking to not block the main response
            pool.query(
                `INSERT INTO page_views (org_id, view_date, view_count)
                 VALUES (?, CURDATE(), 1)
                 ON DUPLICATE KEY UPDATE view_count = view_count + 1`,
                [numericOrgId]
            ).catch(trackError => console.error("Page view tracking error:", trackError));
        } catch (e) { console.error("Page view tracking sync error:", e); }

        // Public data fetching
        try {
            const [orgResults] = await pool.query('SELECT org_id, name, description, photo, address, city, state, zip_code, website_link, phone, is_featured, country FROM organizations WHERE org_id = ?', [numericOrgId]);
            if (orgResults.length === 0) {
                return res.status(404).json({ message: 'Organization not found' });
            }
            const organization = orgResults[0];
            const [drives] = await pool.query('SELECT drive_id, name, description, photo, start_date, end_date FROM drives WHERE org_id = ? AND end_date >= CURDATE() ORDER BY start_date ASC', [numericOrgId]); // Fetch active/future drives
            organization.drives = drives || [];
            return res.status(200).json(organization);
        } catch (error) {
            console.error('Error fetching organization by ID:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'PUT') {
        const session = await getServerSession(req, res, authOptions);
        const ownershipCheck = await verifyOrgOwnership(numericOrgId, session?.user);
        if (!ownershipCheck.authorized) {
            return res.status(ownershipCheck.status).json({ error: ownershipCheck.message });
        }

        try {
            const { fields, files } = await parseForm(req);
            const { name, description, address, city, state, zip_code, website_link, phone, country = 'US' } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

            // Validation
            if (!name || !phone || !address || !city || !state || !zip_code || !country) {
                if (photoFile) fs.unlinkSync(photoFile.filepath);
                return res.status(400).json({ error: 'Org name, phone, full address required' });
            }
            if (!/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
                if (photoFile) fs.unlinkSync(photoFile.filepath);
                return res.status(400).json({ error: 'Invalid phone number format (E.164).' });
            }


            const [orgResults] = await pool.query('SELECT photo FROM organizations WHERE org_id = ?', [numericOrgId]);
            if (orgResults.length === 0) {
                if (photoFile) fs.unlinkSync(photoFile.filepath);
                return res.status(404).json({ error: 'Organization not found' });
            }
            const currentPhotoUrl = orgResults[0].photo;
            let photoUrlToUpdate = currentPhotoUrl;

            if (photoFile) {
                // File validation & S3 upload (similar to POST /organizations)
                // ... (add file type/size validation) ...
                if (currentPhotoUrl) { // Delete old photo
                    try {
                        const oldKey = currentPhotoUrl.split(`${process.env.DO_SPACES_ENDPOINT}/`)[1];
                        if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));
                    } catch (s3DelErr) { console.error("Error deleting old org photo:", s3DelErr); }
                }
                const s3Key = `images/orgs/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);
                await s3.putObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: s3Key, Body: fileStream, ACL: 'public-read', ContentType: photoFile.mimetype });
                photoUrlToUpdate = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath);
            }

            // Update query
            await pool.query(
                `UPDATE organizations SET name = ?, description = ?, address = ?, city = ?, state = ?, zip_code = ?, website_link = ?, phone = ?, country = ?, photo = ? WHERE org_id = ?`,
                [name, description, address, city, state, zip_code, website_link, phone.trim(), country.trim().toUpperCase(), photoUrlToUpdate, numericOrgId]
            );
            const [updatedOrg] = await pool.query('SELECT * FROM organizations WHERE org_id = ?', [numericOrgId]);
            return res.status(200).json({ message: 'Organization updated successfully', organization: updatedOrg[0] });
        } catch (error) {
            console.error('Error updating organization:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

    } else if (req.method === 'DELETE') {
        const session = await getServerSession(req, res, authOptions);
        // Only Super Admin can delete organizations
        if (!session || !session.user || !session.user.is_super_admin) {
            return res.status(403).json({ message: "Forbidden: Not authorized" });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [orgRows] = await connection.query('SELECT photo FROM organizations WHERE org_id = ?', [numericOrgId]);
            if (orgRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Organization not found' });
            }
            const photoUrl = orgRows[0].photo;

            // Delete photo from S3
            if (photoUrl) {
                try {
                    const photoKey = photoUrl.split(`${process.env.DO_SPACES_ENDPOINT}/`)[1];
                    if (photoKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: photoKey }));
                } catch (s3DelErr) { console.error("Error deleting org photo from S3 during org delete:", s3DelErr); /* Potentially log and continue */ }
            }

            // Update related accounts
            await connection.query('UPDATE accounts SET org_id = NULL, is_org_admin = FALSE WHERE org_id = ?', [numericOrgId]);
            // TODO: Handle drives, children, items associated with this org. This can be complex.
            // For simplicity, we might just delete the org and rely on DB constraints or manual cleanup.
            // A safer approach would be to disallow deletion if drives exist, or archive them.
            // Example: Delete drives (this will cascade or require further deletions for drive_items, etc.)
            // await connection.query('DELETE FROM drives WHERE org_id = ?', [numericOrgId]);

            await connection.query('DELETE FROM organizations WHERE org_id = ?', [numericOrgId]);
            await connection.commit();
            return res.status(200).json({ message: 'Organization deleted successfully' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error deleting organization:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}