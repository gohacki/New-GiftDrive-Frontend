// pages/api/auth/request-password-reset.js
import pool from '../../../config/database';
import { sendEmail } from '../../../lib/emailService';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';

const validateRequest = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
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

    for (const middleware of validateRequest) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { email } = req.body;

    try {
        const [users] = await pool.query('SELECT account_id, username FROM accounts WHERE email = ?', [email]);
        if (users.length === 0) {
            // IMPORTANT: For security, don't reveal if an email exists or not.
            // Send a generic success message even if the email is not found.
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
        }
        const user = users[0];

        // Invalidate any existing tokens for this user
        await pool.query('DELETE FROM password_reset_tokens WHERE account_id = ?', [user.account_id]);

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour

        await pool.query(
            'INSERT INTO password_reset_tokens (account_id, token, expires_at) VALUES (?, ?, ?)',
            [user.account_id, token, expiresAt]
        );

        const resetLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/reset-password?token=${token}`;
        const emailSubject = 'Password Reset Request - GiftDrive';
        const emailText = `Hello ${user.username || 'User'},\n\nYou requested a password reset for your GiftDrive account. Click the link below to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email. This link will expire in 1 hour.\n\nThanks,\nThe GiftDrive Team`;
        const emailHtml = `
            <p>Hello ${user.username || 'User'},</p>
            <p>You requested a password reset for your GiftDrive account. Click the link below to reset your password:</p>
            <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Reset Your Password</a></p>
            <p>If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
            <p>Thanks,<br/>The GiftDrive Team</p>
        `;

        await sendEmail({
            to: email,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
        });

        return res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error requesting password reset:', error);
        // Send a generic error to the client to prevent information leakage
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
}