// File: pages/api/drives/organization/[orgId]/current.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import pool from "../../../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const orgIdFromQuery = req.query.orgId;
    const orgId = parseInt(orgIdFromQuery, 10);

    if (isNaN(orgId)) {
        return res.status(400).json({ error: 'Invalid Organization ID format.' });
    }

    // If this route is meant to be public, remove the session checks below.
    // For admin-only access (consistent with past/future):
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = session.user;
    if (!user.is_super_admin && (!user.is_org_admin || user.org_id !== orgId)) {
        return res.status(403).json({ error: 'Forbidden: Not authorized for this organization.' });
    }
    // End admin-only access block

    try {
        const [drives] = await pool.query(
            'SELECT * FROM drives WHERE org_id = ? AND start_date <= NOW() AND end_date >= NOW() ORDER BY start_date DESC',
            [orgId]
        );
        return res.status(200).json(drives);
    } catch (error) {
        console.error('Error fetching current drives:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}