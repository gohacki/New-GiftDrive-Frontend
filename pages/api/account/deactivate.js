// pages/api/account/deactivate.js
import pool from '../../../config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';
import bcrypt from 'bcrypt';

const validateDeactivation = [
    body('password').notEmpty().withMessage('Password is required to confirm deactivation.'),
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

    // Only apply validation if the user has a password (not an OAuth-only account)
    // For OAuth-only accounts, we might skip password confirmation or have a different flow.
    // For simplicity here, we assume password confirmation is desired.
    // The frontend should ideally not show the password field if it's an OAuth-only user.
    const [userAccount] = await pool.query('SELECT password_hash, provider FROM accounts WHERE account_id = ?', [userId]);
    if (userAccount.length === 0) {
        return res.status(404).json({ error: 'User account not found.' });
    }
    const hasPassword = !!userAccount[0].password_hash;

    if (hasPassword) {
        for (const middleware of validateDeactivation) {
            await new Promise((resolve, reject) => {
                middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
            });
            if (res.writableEnded) return;
        }
    }

    const { password } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (hasPassword) {
            const isPasswordValid = await bcrypt.compare(password, userAccount[0].password_hash);
            if (!isPasswordValid) {
                await connection.rollback();
                return res.status(400).json({ error: 'Incorrect password. Account deactivation failed.' });
            }
        }
        // If !hasPassword (OAuth user), we proceed without password check.
        // Consider if additional confirmation is needed for OAuth users (e.g., type "DEACTIVATE").

        // Mark the account as deactivated
        // We set email and username to indicate deactivation to prevent re-registration with same email/username
        // while preserving some anonymized record.
        const deactivatedEmail = `deactivated_${userId}_${Date.now()}@example.com`;
        const deactivatedUsername = `deactivated_user_${userId}`;

        await connection.query(
            'UPDATE accounts SET email = ?, username = ?, password_hash = NULL, email_verified_at = NULL, email_verification_token = NULL, email_verification_token_expires_at = NULL, google_id = NULL, facebook_id = NULL, profile_picture_url = NULL, org_id = NULL, is_org_admin = FALSE, is_super_admin = FALSE, deactivated_at = NOW(), is_active = FALSE WHERE account_id = ?',
            [deactivatedEmail, deactivatedUsername, userId]
        );

        // Invalidate active password reset tokens
        await connection.query('DELETE FROM password_reset_tokens WHERE account_id = ?', [userId]);

        // Optional: Handle other user-related data:
        // - Anonymize or delete user's personal data from other tables (e.g., if they created drives as an admin, what happens to those?)
        // - For now, we'll keep their orders linked by account_id for historical/reporting purposes, but the account itself is non-functional.
        // - If they were an org_admin of an org with no other admins, this needs careful consideration.
        //   For this implementation, we are just deactivating the user account. Org data remains.

        await connection.commit();

        // The session for this user is still active until it expires or they are signed out.
        // The client should handle signing the user out after successful deactivation.

        return res.status(200).json({ message: 'Account deactivated successfully. You will be logged out.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error deactivating account:', error);
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    } finally {
        if (connection) connection.release();
    }
}