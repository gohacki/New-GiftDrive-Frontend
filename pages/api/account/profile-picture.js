// pages/api/account/profile-picture.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import s3 from "../../../config/spaces";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

const parseForm = (req) => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            const photoFile = files.profilePicture ? (Array.isArray(files.profilePicture) ? files.profilePicture[0] : files.profilePicture) : null;
            resolve({ photoFile });
        });
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.id) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    const userId = session.user.id;

    try {
        const { photoFile } = await parseForm(req);

        if (!photoFile) {
            return res.status(400).json({ error: 'No profile picture file provided.' });
        }

        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(photoFile.originalFilename).toLowerCase());
        const mimetype = allowedTypes.test(photoFile.mimetype);

        if (!(extname && mimetype)) {
            fs.unlinkSync(photoFile.filepath);
            return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
        }
        if (photoFile.size > 2 * 1024 * 1024) {
            fs.unlinkSync(photoFile.filepath);
            return res.status(400).json({ error: 'File is too large. Max 2MB.' });
        }

        const [userRows] = await pool.query('SELECT profile_picture_url FROM accounts WHERE account_id = ?', [userId]);
        const currentPhotoUrl = userRows[0]?.profile_picture_url;

        if (currentPhotoUrl) {
            try {
                // Extract the key more reliably, assuming the base URL structure
                const endpointBase = process.env.DO_SPACES_ENDPOINT.startsWith('https://')
                    ? process.env.DO_SPACES_ENDPOINT
                    : `https://${process.env.DO_SPACES_ENDPOINT}`;
                const fullBaseUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpointBase.replace(/^https?:\/\//, '')}/`;

                if (currentPhotoUrl.startsWith(fullBaseUrl)) {
                    const oldKey = currentPhotoUrl.substring(fullBaseUrl.length);
                    if (oldKey) {
                        await s3.send(new DeleteObjectCommand({
                            Bucket: process.env.DO_SPACES_BUCKET,
                            Key: oldKey,
                        }));
                        console.log(`Deleted old avatar from S3: ${oldKey}`);
                    }
                } else {
                    // Fallback for older URLs or different structures, might need adjustment
                    const possibleOldKey = currentPhotoUrl.substring(currentPhotoUrl.indexOf('images/avatars/'));
                    if (possibleOldKey) {
                        await s3.send(new DeleteObjectCommand({
                            Bucket: process.env.DO_SPACES_BUCKET,
                            Key: possibleOldKey,
                        }));
                        console.log(`Deleted old avatar (fallback method) from S3: ${possibleOldKey}`);
                    }
                }
            } catch (s3DelErr) {
                console.error("Error deleting old profile picture from S3:", s3DelErr);
            }
        }

        const s3Key = `images/avatars/${userId}-${Date.now()}${path.extname(photoFile.originalFilename)}`;
        const fileStream = fs.createReadStream(photoFile.filepath);

        await s3.send(new PutObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: s3Key,
            Body: fileStream,
            ACL: 'public-read',
            ContentType: photoFile.mimetype,
        }));
        fs.unlinkSync(photoFile.filepath);

        // ---- CORRECTED URL CONSTRUCTION ----
        let endpoint = process.env.DO_SPACES_ENDPOINT;
        // Remove protocol if it exists to avoid duplication
        endpoint = endpoint.replace(/^https?:\/\//, '');
        const newProfilePictureUrl = `https://${process.env.DO_SPACES_BUCKET}.${endpoint}/${s3Key}`;
        // ---- END CORRECTION ----


        await pool.query(
            'UPDATE accounts SET profile_picture_url = ? WHERE account_id = ?',
            [newProfilePictureUrl, userId]
        );

        return res.status(200).json({
            message: 'Profile picture updated successfully.',
            profile_picture_url: newProfilePictureUrl
        });

    } catch (error) {
        console.error('Error updating profile picture:', error);
        // Ensure temporary file is cleaned up on error
        // Note: formidable might store files in a temporary directory which it cleans up,
        // but if you manually handle file paths (e.g. photoFile.filepath), ensure cleanup.
        // The fs.unlinkSync calls are already present for validation errors.
        return res.status(500).json({ error: 'Internal server error while updating profile picture.' });
    }
}