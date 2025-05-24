import pool from '../../../../../config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../../auth/[...nextauth]';
import { param, validationResult } from 'express-validator';
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
    return { authorized: false, user, status: 403, message: "Forbidden: You are not authorized for this organization." };
}

const validateDeleteAdminParams = [
    param('orgId').isInt({ gt: 0 }).withMessage('Organization ID must be a positive integer.'),
    param('adminId').isInt({ gt: 0 }).withMessage('Admin Account ID must be a positive integer.'),
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
    const { orgId: orgIdFromQuery, adminId: adminIdFromQuery } = req.query;

    req.params = { orgId: orgIdFromQuery, adminId: adminIdFromQuery };

    const auth = await verifyOrgAdminAccess(req, res, orgIdFromQuery);
    if (!auth.authorized) {
        return res.status(auth.status).json({ error: auth.message });
    }
    const { orgId, user: removerUser } = auth;
    const adminIdToRemove = parseInt(adminIdFromQuery, 10);

    if (req.method === 'DELETE') {
        for (const middleware of validateDeleteAdminParams) {
            let errorOccurred = false;
            await new Promise((resolve) => {
                middleware(req, res, (result) => {
                    if (result instanceof Error || res.writableEnded) errorOccurred = true;
                    resolve(result);
                });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        if (removerUser.id === adminIdToRemove && !removerUser.is_super_admin) {
            return res.status(400).json({ error: "You cannot remove yourself as an organization administrator via this function." });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [adminToRemoveDetailsRows] = await connection.query(
                'SELECT account_id, username, email, org_id, is_org_admin FROM accounts WHERE account_id = ? AND is_active = TRUE AND deactivated_at IS NULL',
                [adminIdToRemove]
            );

            if (adminToRemoveDetailsRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Administrator to remove not found or is inactive.' });
            }
            const adminToRemoveDetails = adminToRemoveDetailsRows[0];

            if (!adminToRemoveDetails.is_org_admin || adminToRemoveDetails.org_id !== orgId) {
                await connection.rollback();
                return res.status(404).json({ error: 'This user is not an administrator of your organization.' });
            }

            const [adminCountRows] = await connection.query(
                'SELECT COUNT(*) as adminCount FROM accounts WHERE org_id = ? AND is_org_admin = TRUE AND is_active = TRUE AND deactivated_at IS NULL',
                [orgId]
            );
            const adminCount = adminCountRows[0].adminCount;

            if (adminCount <= 1 && !removerUser.is_super_admin) {
                await connection.rollback();
                return res.status(400).json({ error: 'Cannot remove the last administrator of the organization. Please assign another admin first or contact support if you are the account owner.' });
            }

            await connection.query(
                'UPDATE accounts SET is_org_admin = FALSE, org_id = NULL WHERE account_id = ?',
                [adminIdToRemove]
            );

            await connection.commit();

            // Send email notification
            try {
                const [orgDetailsRows] = await pool.query('SELECT name FROM organizations WHERE org_id = ?', [orgId]);
                const orgName = orgDetailsRows.length > 0 ? orgDetailsRows[0].name : `Organization ID ${orgId}`;

                await sendEmail({
                    to: adminToRemoveDetails.email,
                    subject: `Admin Access Removed for ${orgName} on GiftDrive`,
                    text: `Hello ${adminToRemoveDetails.username || adminToRemoveDetails.email},\n\nYour administrator access for the organization "${orgName}" on GiftDrive.org has been removed by ${removerUser.username || removerUser.email}.\n\nIf you believe this is an error, please contact an administrator of the organization or GiftDrive support.\n\nThanks,\nThe GiftDrive Team`,
                    html: `
                    <p>Hello ${adminToRemoveDetails.username || adminToRemoveDetails.email},</p>
                    <p>Your administrator access for the organization "<strong>${orgName}</strong>" on GiftDrive.org has been removed by ${removerUser.username || removerUser.email}.</p>
                    <p>If you believe this is an error, please contact an administrator of the organization or GiftDrive support.</p>
                    <p>Thanks,<br/>The GiftDrive Team</p>
                  `
                });
                console.log(`Admin removal email sent to ${adminToRemoveDetails.email} for org ${orgName}.`);
            } catch (emailError) {
                console.error(`Failed to send admin removal email to ${adminToRemoveDetails.email} for org ${orgId}. Error:`, emailError);
                // Do not fail the entire operation due to email sending failure.
            }

            return res.status(200).json({ message: `Administrator ${adminToRemoveDetails.username || adminToRemoveDetails.email} removed successfully.` });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Error removing admin ${adminIdToRemove} from org ${orgId}:`, error);
            return res.status(500).json({ error: 'Failed to remove organization administrator.' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}