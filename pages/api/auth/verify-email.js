// pages/api/auth/verify-email.js
import pool from '../../../config/database';
import { query, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';

const validateVerification = [
    query('token').notEmpty().isHexadecimal().withMessage('A valid verification token is required.'),
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
    if (req.method !== 'GET') { // Verification is typically done via a GET request from a link
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    for (const middleware of validateVerification) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { token } = req.query;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [users] = await connection.query(
            'SELECT account_id, email_verified_at, email_verification_token_expires_at FROM accounts WHERE email_verification_token = ?',
            [token]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid verification token. It might have already been used or does not exist.' });
        }

        const user = users[0];

        if (user.email_verified_at) {
            await connection.commit(); // Commit any pending transaction like token cleanup (if any)
            return res.status(200).json({ message: 'Email address already verified.' });
        }

        if (new Date() > new Date(user.email_verification_token_expires_at)) {
            // Optionally, you could delete the expired token here or allow re-request
            // For now, just inform the user.
            await connection.rollback();
            return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
        }

        await connection.query(
            'UPDATE accounts SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_token_expires_at = NULL WHERE account_id = ?',
            [user.account_id]
        );

        await connection.commit();

        // At this point, the user's session/JWT with NextAuth does NOT yet reflect this change.
        // The user might need to log out and log back in for their session to update
        // OR you implement a way for NextAuth to re-evaluate the session (e.g., via `update` function from `useSession`).
        // For simplicity here, we'll inform them.

        return res.status(200).json({ message: 'Email address verified successfully! You can now log in.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error verifying email:', error);
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    } finally {
        if (connection) connection.release();
    }
}