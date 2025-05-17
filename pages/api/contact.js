// File: pages/api/contact.js
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import { runMiddleware } from '../../lib/runMiddleware'; // Assuming your helper is in lib/

// Validation middleware for POST
const validateContactForm = [
    body('fullName').trim().notEmpty().withMessage('Full Name is required.').isLength({ min: 2, max: 100 }).withMessage('Full Name must be between 2 and 100 characters.'),
    body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email address.').normalizeEmail(),
    body('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ min: 3, max: 150 }).withMessage('Subject must be between 3 and 150 characters.'),
    body('message').trim().notEmpty().withMessage('Message is required.').isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters.'),
    async (req, res, next) => {
        // runMiddleware returns a promise
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                // If validation fails, send response immediately and stop further processing
                return res.status(400).json({ errors: errors.array() });
            }
            cb(); // Proceed if no errors
        });
        // If res.writableEnded is true, it means a response was already sent (e.g., by validation error)
        if (!res.writableEnded) {
            next();
        }
    }
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Apply validation middleware
    // We iterate and await each middleware. If one sends a response, we stop.
    for (const middleware of validateContactForm) {
        let errorOccurred = false;
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => {
                if (result instanceof Error) {
                    errorOccurred = true;
                    reject(result); // Middleware itself threw an error
                }
                resolve(result);
            });
        });
        // If the response has been ended by the middleware (e.g., validation error response),
        // then we should not proceed.
        if (errorOccurred || res.writableEnded) {
            return;
        }
    }
    // If we reach here, validation passed and no response was sent by middleware.

    const { fullName, email, subject, message } = req.body;

    try {
        // Nodemailer Transporter Setup
        if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.CONTACT_FORM_RECEIVER_EMAIL) {
            console.error("Contact API: Email service is not configured. Missing environment variables.");
            return res.status(500).json({ error: 'Message could not be sent due to a server configuration issue.' });
        }

        const transporterOptions = {
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10),
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // You can add debug options to Nodemailer for more verbose logging
            // logger: true, // uncomment for simple logging
            // debug: true, // uncomment for detailed SMTP command logging
        };

        // For local development with self-signed certificates (e.g., local SMTP server like MailHog/MailCatcher)
        // Be cautious with this in production.
        if (process.env.NODE_ENV !== 'production' && (process.env.EMAIL_HOST?.includes('localhost') || process.env.EMAIL_HOST?.includes('127.0.0.1'))) {
            transporterOptions.tls = { rejectUnauthorized: false };
            console.log("Contact API: Using insecure TLS for local development SMTP.");
        }


        const transporter = nodemailer.createTransport(transporterOptions);

        // Mail Options
        const mailOptions = {
            from: `"${fullName} (GiftDrive Contact)" <${process.env.CONTACT_FORM_SENDER_EMAIL || process.env.EMAIL_USER}>`,
            to: process.env.CONTACT_FORM_RECEIVER_EMAIL,
            replyTo: email,
            subject: `GiftDrive Contact: ${subject}`,
            text: `You have a new contact form submission:\n\nName: ${fullName}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
                <hr>
                <p><small>This message was sent from the GiftDrive contact form.</small></p>
              </div>
            `,
        };

        console.log('Attempting to send contact email with options:', mailOptions);
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        console.log('Nodemailer response:', info.response); // Log full response for more info

        return res.status(200).json({ message: 'Your message has been sent successfully!' });

    } catch (error) {
        console.error('Error sending contact email:', error); // Log the full error object
        console.error('Nodemailer error code:', error.code);
        console.error('Nodemailer error responseCode:', error.responseCode);
        console.error('Nodemailer error command:', error.command);


        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('socket close') || error.message.toLowerCase().includes('connection timed out')) {
            return res.status(503).json({ error: 'Email server connection issue. Please try again later.' }); // Service Unavailable
        }
        if (error.code === 'EENVELOPE' || error.code === 'ESOCKET' || error.responseCode === 550 || error.responseCode === 554) {
            // 550/554 are often recipient issues (mailbox full, doesn't exist, policy rejection)
            return res.status(502).json({ error: 'There was an issue delivering the email. Please check the recipient address or try again later.' }); // Bad Gateway (upstream issue)
        }
        if (error.code === 'EAUTH') {
            console.error("Nodemailer authentication failed. Check EMAIL_USER and EMAIL_PASS.");
            return res.status(500).json({ error: 'Server authentication error with the email service.' });
        }
        // Generic fallback
        return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
}