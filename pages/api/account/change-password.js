// pages/api/account/change-password.js
import pool from '../../../config/database';
import bcrypt from 'bcrypt';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';

const validateChangePassword = [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        if (!res.writableEnded) next();
    }
];

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

    for (const middleware of validateChangePassword) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { currentPassword, newPassword } = req.body;

    try {
        const [users] = await pool.query('SELECT password_hash FROM accounts WHERE account_id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' }); // Should not happen if session is valid
        }
        const user = users[0];

        if (!user.password_hash) {
            // This user likely signed up via OAuth and doesn't have a local password set.
            // They should not be able to "change" a password that doesn't exist.
            return res.status(400).json({ error: 'Password change is not applicable for accounts created via social login.' });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE accounts SET password_hash = ? WHERE account_id = ?',
            [hashedNewPassword, userId]
        );

        // Optionally, you might want to invalidate other active sessions for this user here.
        // This is more complex and might involve a session store or revoking JWTs.
        // For now, we'll keep it simple.

        return res.status(200).json({ message: 'Password changed successfully.' });

    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
}