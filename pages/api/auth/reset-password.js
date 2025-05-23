// pages/api/auth/reset-password.js
import pool from '../../../config/database';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';

const validateReset = [
    body('token').notEmpty().isHexadecimal().withMessage('A valid reset token is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
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

    for (const middleware of validateReset) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { token, password } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [tokenRows] = await connection.query(
            'SELECT account_id, expires_at FROM password_reset_tokens WHERE token = ?',
            [token]
        );

        if (tokenRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid or expired password reset token. Please request a new one.' });
        }

        const tokenData = tokenRows[0];
        if (new Date() > new Date(tokenData.expires_at)) {
            await connection.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]); // Clean up expired token
            await connection.commit();
            return res.status(400).json({ error: 'Password reset token has expired. Please request a new one.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.query(
            'UPDATE accounts SET password_hash = ? WHERE account_id = ?',
            [hashedPassword, tokenData.account_id]
        );

        // Invalidate the token after successful use
        await connection.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

        await connection.commit();

        return res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    } finally {
        if (connection) connection.release();
    }
}