// File: pages/api/organizations/[orgId].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import { DeleteObjectCommand } from "@aws-sdk/client-s3"; // PutObjectCommand is not needed here if PUT is separate
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { getOrganizationDetailsWithDrives } from '../../../lib/services/organizationService'; // IMPORT THE SERVICE

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

async function verifyOrgOwnership(orgId, user) { /* ... same verifyOrgOwnership helper ... */
    if (!user) return { authorized: false, message: "Not authenticated", status: 401 };
    if (!orgId || isNaN(parseInt(orgId, 10))) return { authorized: false, message: "Invalid Organization ID", status: 400 };
    const numericOrgId = parseInt(orgId, 10);
    if (user.is_super_admin) return { authorized: true, message: "Authorized as super admin", status: 200 };
    if (!user.is_org_admin || user.org_id !== numericOrgId) return { authorized: false, message: "Forbidden: Not authorized for this organization", status: 403 };
    return { authorized: true, message: "Authorized as org admin", status: 200 };
}


export default async function handler(req, res) {
    const { orgId: orgIdFromQuery } = req.query;

    if (req.method === 'GET') {
        try {
            const organizationData = await getOrganizationDetailsWithDrives(orgIdFromQuery); // USE THE SERVICE
            if (!organizationData) {
                return res.status(404).json({ message: 'Organization not found' });
            }
            return res.status(200).json(organizationData);
        } catch (error) {
            console.error('Error fetching organization by ID (API Route):', error);
            if (error.message.includes("Invalid Organization ID")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'PUT') {
        // ... (Your existing PUT logic remains the same) ...
        const session = await getServerSession(req, res, authOptions);
        const numericOrgId = parseInt(orgIdFromQuery, 10); // ensure numericOrgId is defined
        if (isNaN(numericOrgId)) {
            return res.status(400).json({ error: "Invalid Organization ID." });
        }
        const ownershipCheck = await verifyOrgOwnership(numericOrgId, session?.user);
        if (!ownershipCheck.authorized) {
            return res.status(ownershipCheck.status).json({ error: ownershipCheck.message });
        }
        try {
            const { fields, files } = await parseForm(req);
            const { name, description, address, city, state, zip_code, website_link, phone, country = 'US' } = fields;
            const photoFile = files.photo ? (Array.isArray(files.photo) ? files.photo[0] : files.photo) : null;

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
                const allowedTypes = /jpeg|jpg|png|gif|webp/;
                const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
                const mimetype = allowedTypes.test(photoFile.mimetype);

                if (!(extname && mimetype)) {
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
                }
                if (photoFile.size > 5 * 1024 * 1024) { // 5MB limit
                    fs.unlinkSync(photoFile.filepath);
                    return res.status(400).json({ error: 'File is too large. Max 5MB.' });
                }

                if (currentPhotoUrl) {
                    try {
                        // More robust key extraction for S3
                        const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                            ? process.env.DO_SPACES_ENDPOINT
                            : `https://${process.env.DO_SPACES_ENDPOINT}`;
                        const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;
                        let oldKey;
                        if (currentPhotoUrl.startsWith(fullBaseUrl)) {
                            oldKey = currentPhotoUrl.substring(fullBaseUrl.length);
                        } else {
                            // Fallback for potentially different URL structures (less common if consistent)
                            const urlParts = currentPhotoUrl.split('/');
                            oldKey = urlParts.slice(urlParts.indexOf('images')).join('/'); // Assumes 'images' is part of path
                        }
                        if (oldKey) {
                            await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: oldKey }));
                        }
                    } catch (s3DelErr) { console.error("Error deleting old org photo:", s3DelErr); }
                }
                const s3Key = `images/orgs/${Date.now().toString()}${path.extname(photoFile.originalFilename)}`;
                const fileStream = fs.createReadStream(photoFile.filepath);
                // For S3 v3 SDK, PutObjectCommand is used with s3.send()
                const { PutObjectCommand } = await import("@aws-sdk/client-s3"); // Dynamic import if not globally available
                await s3.send(new PutObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: s3Key, Body: fileStream, ACL: 'public-read', ContentType: photoFile.mimetype }));

                let endpoint = process.env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '');
                photoUrlToUpdate = `https://${process.env.DO_SPACES_BUCKET}.${endpoint}/${s3Key}`;
                fs.unlinkSync(photoFile.filepath);
            }

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
        // ... (Your existing DELETE logic remains the same) ...
        const session = await getServerSession(req, res, authOptions);
        const numericOrgId = parseInt(orgIdFromQuery, 10); // ensure numericOrgId is defined
        if (isNaN(numericOrgId)) {
            return res.status(400).json({ error: "Invalid Organization ID." });
        }

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

            if (photoUrl) {
                try {
                    const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                        ? process.env.DO_SPACES_ENDPOINT
                        : `https://${process.env.DO_SPACES_ENDPOINT}`;
                    const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;
                    let photoKey;
                    if (photoUrl.startsWith(fullBaseUrl)) {
                        photoKey = photoUrl.substring(fullBaseUrl.length);
                    } else {
                        const urlParts = photoUrl.split('/');
                        photoKey = urlParts.slice(urlParts.indexOf('images')).join('/');
                    }
                    if (photoKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: photoKey }));
                } catch (s3DelErr) { console.error("Error deleting org photo from S3 during org delete:", s3DelErr); }
            }

            await connection.query('UPDATE accounts SET org_id = NULL, is_org_admin = FALSE WHERE org_id = ?', [numericOrgId]);

            // Cascade deletion or nullification for drives and their related items
            const [drivesToDeleteRows] = await connection.query('SELECT drive_id, photo FROM drives WHERE org_id = ?', [numericOrgId]);
            for (const drive of drivesToDeleteRows) {
                if (drive.photo) {
                    try {
                        const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                            ? process.env.DO_SPACES_ENDPOINT
                            : `https://${process.env.DO_SPACES_ENDPOINT}`;
                        const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;
                        let drivePhotoKey;
                        if (drive.photo.startsWith(fullBaseUrl)) {
                            drivePhotoKey = drive.photo.substring(fullBaseUrl.length);
                        } else {
                            const urlParts = drive.photo.split('/');
                            drivePhotoKey = urlParts.slice(urlParts.indexOf('images')).join('/');
                        }
                        if (drivePhotoKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET, Key: drivePhotoKey }));
                    } catch (s3DelErr) { console.error(`Error deleting photo for drive ${drive.drive_id}:`, s3DelErr); }
                }
                // Clear cart_contents referencing items from this drive
                await connection.query(`DELETE cc FROM cart_contents cc JOIN drive_items di ON cc.source_drive_item_id = di.drive_item_id WHERE di.drive_id = ?`, [drive.drive_id]);
                await connection.query(`DELETE cc FROM cart_contents cc JOIN child_items ci ON cc.source_child_item_id = ci.child_item_id JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id = ?`, [drive.drive_id]);
                // Nullify order_items
                await connection.query('UPDATE order_items SET source_drive_item_id = NULL WHERE source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id = ?)', [drive.drive_id]);
                await connection.query('UPDATE order_items SET source_child_item_id = NULL WHERE source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id = ?)', [drive.drive_id]);
                // Delete drive items, child items, unique children
                await connection.query('DELETE FROM drive_items WHERE drive_id = ?', [drive.drive_id]);
                await connection.query('DELETE FROM child_items WHERE child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?)', [drive.drive_id]);
                await connection.query('DELETE FROM unique_children WHERE drive_id = ?', [drive.drive_id]);
            }
            await connection.query('DELETE FROM drives WHERE org_id = ?', [numericOrgId]);
            // Finally delete the organization
            await connection.query('DELETE FROM organizations WHERE org_id = ?', [numericOrgId]);
            await connection.commit();
            return res.status(200).json({ message: 'Organization and all associated data deleted successfully' });
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