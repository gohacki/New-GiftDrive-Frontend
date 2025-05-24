import pool from '../../../../../config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]';
import { body, param, validationResult } from 'express-validator';
import { runMiddleware } from '../../../../../lib/runMiddleware';
import { sendEmail } from '../../../../../lib/emailService'; // Make sure this path is correct

// Reusable Auth Helper
async function verifyOrgAdminAccess(req, res, orgIdFromParams) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return { authorized: false, user: null, status: 401, message: "Not authenticated." };
    }
    const user = session.user;
    const orgId = parseInt(orgIdFromParams, 10);

    if (isNaN(orgId) || orgId <= 0) {
        return { authorized: false, user, status: 400, message: 'Invalid Organization ID.' };
    }

    if (user.is_super_admin) {
        return { authorized: true, user, orgId, status: 200, message: "Authorized as super admin." };
    }
    if (user.is_org_admin && user.org_id === orgId) {
        return { authorized: true, user, orgId, status: 200, message: "Authorized as org admin." };
    }
    return { authorized: false, user, status: 403, message: "Forbidden: You are not authorized to manage admins for this organization." };
}

const validateOrgIdParam = [
    param('orgId').isInt({ gt: 0 }).withMessage('Organization ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validateInviteAdmin = [
    param('orgId').isInt({ gt: 0 }).withMessage('Organization ID must be a positive integer.'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required for invitation.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

export default async function handler(req, res) {
    const { orgId: orgIdFromQuery } = req.query;

    req.params = { orgId: orgIdFromQuery };

    const auth = await verifyOrgAdminAccess(req, res, orgIdFromQuery);
    if (!auth.authorized) {
        return res.status(auth.status).json({ error: auth.message });
    }
    const { orgId } = auth;

    if (req.method === 'GET') {
        for (const middleware of validateOrgIdParam) {
            let errorOccurred = false;
            await new Promise((resolve) => {
                middleware(req, res, (result) => {
                    if (result instanceof Error || res.writableEnded) errorOccurred = true;
                    resolve(result);
                });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        try {
            const [admins] = await pool.query(
                'SELECT account_id, username, email, profile_picture_url FROM accounts WHERE org_id = ? AND is_org_admin = TRUE AND is_active = TRUE AND deactivated_at IS NULL',
                [orgId]
            );
            return res.status(200).json(admins);
        } catch (error) {
            console.error(`Error fetching admins for org ${orgId}:`, error);
            return res.status(500).json({ error: 'Failed to fetch organization administrators.' });
        }
    } else if (req.method === 'POST') { // Invite admin
        for (const middleware of validateInviteAdmin) {
            let errorOccurred = false;
            await new Promise((resolve) => {
                middleware(req, res, (result) => {
                    if (result instanceof Error || res.writableEnded) errorOccurred = true;
                    resolve(result);
                });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        const { email: invitedEmail } = req.body;

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [orgDetailsRows] = await connection.query('SELECT name FROM organizations WHERE org_id = ?', [orgId]);
            if (orgDetailsRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Inviting organization not found.' });
            }
            const orgName = orgDetailsRows[0].name;

            const [usersToInvite] = await connection.query(
                'SELECT account_id, username, org_id, is_org_admin FROM accounts WHERE email = ? AND is_active = TRUE AND deactivated_at IS NULL',
                [invitedEmail]
            );

            if (usersToInvite.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'User with this email not found or account is inactive. Please ask them to register first.' });
            }
            const userToInvite = usersToInvite[0];

            if (userToInvite.is_org_admin) {
                await connection.rollback();
                if (userToInvite.org_id === orgId) {
                    return res.status(409).json({ error: 'This user is already an administrator for your organization.' });
                } else {
                    return res.status(409).json({ error: 'This user is already an administrator for another organization.' });
                }
            }

            if (userToInvite.org_id && userToInvite.org_id !== orgId) {
                await connection.rollback();
                return res.status(409).json({ error: 'This user is currently associated with another organization. They must be unlinked first.' });
            }

            await connection.query(
                'UPDATE accounts SET org_id = ?, is_org_admin = TRUE WHERE account_id = ?',
                [orgId, userToInvite.account_id]
            );

            await connection.commit();

            // Send email notification
            try {
                const dashboardLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/admin/dashboard`;
                const inviterName = auth.user.username || auth.user.email;
                await sendEmail({
                    to: invitedEmail,
                    subject: `You're now an Admin for ${orgName} on GiftDrive!`,
                    text: `Hello ${userToInvite.username || invitedEmail},\n\nGreat news! ${inviterName} has made you an administrator for the organization "${orgName}" on GiftDrive.org.\n\nYou can now access the organization dashboard to manage drives, view statistics, and more. Please log in to access your new privileges:\n${dashboardLink}\n\nIf you have any questions, please contact ${inviterName} or the organization directly.\n\nThanks,\nThe GiftDrive Team`,
                    html: `
                        <p>Hello ${userToInvite.username || invitedEmail},</p>
                        <p>Great news! <strong>${inviterName}</strong> has made you an administrator for the organization "<strong>${orgName}</strong>" on GiftDrive.org.</p>
                        <p>You can now access the organization dashboard to manage drives, view statistics, and more. Please log in to access your new privileges:</p>
                        <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 15px; background-color: #11393B; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
                        <p>If you have any questions, please contact ${inviterName} or the organization directly.</p>
                        <p>Thanks,<br/>The GiftDrive Team</p>
                    `
                });
                console.log(`Admin invitation email successfully sent to ${invitedEmail} for org ${orgName}.`);
            } catch (emailError) {
                console.error(`Failed to send admin invitation email to ${invitedEmail} for org ${orgId} (Org Name: ${orgName}). Error:`, emailError);
                // Do not fail the entire operation due to email sending failure.
                // Log it and potentially add to a retry queue or notify admin.
            }

            return res.status(200).json({ message: `${userToInvite.username || invitedEmail} has been successfully invited as an admin for ${orgName}. They have been notified via email.` });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Error inviting admin to org ${orgId}:`, error);
            return res.status(500).json({ error: 'Failed to invite organization administrator.' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}