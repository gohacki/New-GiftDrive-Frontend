// pages/api/auth/resend-verification-email.js
import pool from '../../../config/database';
import { sendEmail } from '../../../lib/emailService';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';
import { getServerSession } from "next-auth/next"; // To check if user is logged in
import { authOptions } from "./[...nextauth]";    // Your NextAuth options

const validateResendRequest = [
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required.'),
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

    for (const middleware of validateResendRequest) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { email } = req.body;
    const session = await getServerSession(req, res, authOptions);

    // Security check: If user is logged in, ensure they are requesting for their own email.
    if (session && session.user && session.user.email !== email) {
        // Log this attempt, might be suspicious, but return generic message for security.
        console.warn(`Attempt to resend verification for ${email} by logged-in user ${session.user.email}`);
        return res.status(200).json({ message: 'If an account with this email exists and is unverified, a new verification link has been sent.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [users] = await connection.query(
            'SELECT account_id, username, email_verified_at FROM accounts WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            await connection.rollback();
            console.log(`Resend verification requested for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If an account with this email exists and is unverified, a new verification link has been sent.' });
        }

        const user = users[0];

        if (user.email_verified_at) {
            await connection.commit(); // Commit if no changes needed
            return res.status(200).json({ message: 'This email address has already been verified.' });
        }

        // Generate new token and expiry
        const newVerificationToken = crypto.randomBytes(32).toString('hex');
        const newVerificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000); // 24 hours

        await connection.query(
            'UPDATE accounts SET email_verification_token = ?, email_verification_token_expires_at = ? WHERE account_id = ?',
            [newVerificationToken, newVerificationTokenExpiresAt, user.account_id]
        );

        const verificationLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/verify-email?token=${newVerificationToken}`;
        const emailSubject = 'Verify Your Email Address - GiftDrive (New Link)';
        const emailText = `Hello ${user.username || 'User'},\n\nPlease verify your email address for GiftDrive by clicking the link below:\n${verificationLink}\n\nIf you did not request this, please ignore this email. This link will expire in 24 hours.\n\nThanks,\nThe GiftDrive Team`;
        const emailHtml = `
            <p>Hello ${user.username || 'User'},</p>
            <p>Please verify your email address for GiftDrive by clicking the link below:</p>
            <p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">Verify Your Email Address</a></p>
            <p>If you did not request this, please ignore this email. This link will expire in 24 hours.</p>
            <p>Thanks,<br/>The GiftDrive Team</p>
        `;

        await sendEmail({
            to: email,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
        });

        await connection.commit();

        return res.status(200).json({ message: 'A new verification link has been sent to your email address.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error resending verification email:', error);
        return res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    } finally {
        if (connection) connection.release();
    }
}