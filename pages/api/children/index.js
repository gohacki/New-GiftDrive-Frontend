// File: pages/api/children/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { validationResult, body } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware'; // Assuming you have this helper

// Validation middleware for POST
const validatePost = [
    body('default_child_id').notEmpty().isInt({ gt: 0 }).withMessage('Default Child ID is required.'),
    body('drive_id').notEmpty().isInt({ gt: 0 }).withMessage('Drive ID is required.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        next();
    }
];

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

    // Apply validation middleware
    for (const middleware of validatePost) {
        let errorOccurred = false;
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => {
                if (result instanceof Error) { errorOccurred = true; reject(result); }
                resolve(result);
            });
        });
        if (errorOccurred || res.writableEnded) return;
    }

    const { default_child_id, drive_id } = req.body;
    const userOrgId = user.org_id; // Org admin's org_id

    if (!userOrgId || !user.is_org_admin) {
        return res.status(403).json({ error: 'Forbidden: Not an organization admin or org_id missing from session.' });
    }

    try {
        // Permission check: Ensure the drive_id belongs to the admin's organization
        const [driveCheck] = await pool.query('SELECT org_id FROM drives WHERE drive_id = ?', [drive_id]);
        if (driveCheck.length === 0 || driveCheck[0].org_id !== userOrgId) {
            return res.status(403).json({ error: "Forbidden: Drive does not belong to your organization or drive not found." });
        }

        const [defaultChildCheck] = await pool.query('SELECT default_child_id FROM default_children WHERE default_child_id = ?', [default_child_id]);
        if (defaultChildCheck.length === 0) {
            return res.status(400).json({ error: "Invalid default_child_id." });
        }

        const [result] = await pool.query(
            'INSERT INTO unique_children (drive_id, default_child_id) VALUES (?, ?)',
            [drive_id, default_child_id]
        );
        const newUniqueChildId = result.insertId;

        const [newChildData] = await pool.query(
            `SELECT uc.child_id, uc.drive_id, dc.name as child_name, dc.photo as child_photo
             FROM unique_children uc
             JOIN default_children dc ON uc.default_child_id = dc.default_child_id
             WHERE uc.child_id = ?`, [newUniqueChildId]
        );

        return res.status(201).json({ message: 'Child added to drive successfully', child: newChildData[0] });
    } catch (error) {
        console.error('Error adding child to drive:', error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint fails')) {
            return res.status(400).json({ error: 'Invalid default_child_id or drive_id provided.' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}