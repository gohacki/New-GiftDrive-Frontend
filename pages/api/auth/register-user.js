// pages/api/auth/register-user.js
import pool from '../../../config/database';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendEmail } from '../../../lib/emailService';
import { body, validationResult } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware';

const validateRegistration = [
    body('username').trim().notEmpty().withMessage('Username is required.').isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
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

    for (const middleware of validateRegistration) {
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
        });
        if (res.writableEnded) return;
    }

    const { username, email, password } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.query('SELECT account_id FROM accounts WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000); // Token expires in 24 hours

        const [result] = await connection.query(
            'INSERT INTO accounts (username, email, password_hash, email_verification_token, email_verification_token_expires_at, is_org_admin, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, verificationToken, verificationTokenExpiresAt, false, false] // Defaults for new users
        );
        const newUserId = result.insertId;

        const verificationLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        const emailSubject = 'Verify Your Email Address - GiftDrive';
        const emailText = `Hello ${username},\n\nWelcome to GiftDrive! Please verify your email address by clicking the link below:\n${verificationLink}\n\nIf you did not create an account, please ignore this email. This link will expire in 24 hours.\n\nThanks,\nThe GiftDrive Team`;
        const emailHtml = `
            <p>Hello ${username},</p>
            <p>Welcome to GiftDrive! Please verify your email address by clicking the link below:</p>
            <p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">Verify Your Email Address</a></p>
            <p>If you did not create an account, please ignore this email. This link will expire in 24 hours.</p>
            <p>Thanks,<br/>The GiftDrive Team</p>
        `;

        try {
            await sendEmail({
                to: email,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
            });
        } catch (emailError) {
            // Log the email sending error but don't necessarily fail the registration.
            // User can request a new verification email later.
            console.error(`Failed to send verification email to ${email} during registration:`, emailError);
            // Decide if this should be a hard fail. For now, we'll proceed with registration.
        }


        await connection.commit();

        // The NextAuth.js `signIn` after registration will now pick up the unverified user.
        // The `jwt` and `session` callbacks in NextAuth should be updated to include `email_verified_at`.
        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            userId: newUserId, // Optionally return user ID
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Registration API Error:', error);
        // Avoid exposing detailed error messages in production
        let errorMessage = 'An error occurred during registration.';
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'An account with this email or username already exists.';
        }
        res.status(500).json({ message: errorMessage });
    } finally {
        if (connection) connection.release();
    }
}