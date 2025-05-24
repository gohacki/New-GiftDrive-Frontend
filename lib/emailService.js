// lib/emailService.js
import nodemailer from 'nodemailer';

// Ensure these environment variables are set
const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, CONTACT_FORM_SENDER_EMAIL, EMAIL_SECURE } = process.env;

if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS || !CONTACT_FORM_SENDER_EMAIL) {
    console.error("Email service is not configured. Missing one or more required environment variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, CONTACT_FORM_SENDER_EMAIL).");
}

const transporterOptions = {
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10),
    secure: EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    // You can add debug options for more verbose logging if needed
    // logger: process.env.NODE_ENV !== 'production',
    // debug: process.env.NODE_ENV !== 'production',
};

if (process.env.NODE_ENV !== 'production' && (EMAIL_HOST?.includes('localhost') || EMAIL_HOST?.includes('127.0.0.1'))) {
    transporterOptions.tls = { rejectUnauthorized: false };
    console.log("emailService: Using insecure TLS for local development SMTP.");
}

const transporter = nodemailer.createTransport(transporterOptions);

/**
 * Sends an email.
 * @param {object} mailDetails
 * @param {string} mailDetails.to Recipient's email address.
 * @param {string} mailDetails.subject Email subject.
 * @param {string} mailDetails.text Plain text body.
 * @param {string} mailDetails.html HTML body.
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails or service is not configured.
 */
export async function sendEmail({ to, subject, text, html }) {
    if (!EMAIL_HOST) {
        console.error("emailService.sendEmail: Attempted to send email, but service is not configured.");
        throw new Error("Email service is not configured server-side. Cannot send email.");
    }

    const mailOptions = {
        from: `"GiftDrive" <${CONTACT_FORM_SENDER_EMAIL}>`,
        to,
        subject,
        text,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully via emailService: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email via emailService:', error);
        // Provide a more generic error message to the calling function/user
        throw new Error(`Failed to send email. Please try again later or contact support if the issue persists. (Code: ${error.code || 'UNKNOWN'})`);
    }
}