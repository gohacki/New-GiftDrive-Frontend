// File: pages/api/drives/organization/[orgId]/past.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import pool from "../../../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    // This route was admin-only in Express
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = session.user;
    const orgIdFromQuery = req.query.orgId;
    const orgId = parseInt(orgIdFromQuery, 10);

    if (isNaN(orgId)) {
        return res.status(400).json({ error: 'Invalid Organization ID format.' });
    }

    // Authorization: User must be an admin of this org OR a super admin
    if (!user.is_super_admin && (!user.is_org_admin || user.org_id !== orgId)) {
        return res.status(403).json({ error: 'Forbidden: Not authorized for this organization.' });
    }

    try {
        const [drives] = await pool.query(
            'SELECT * FROM drives WHERE org_id = ? AND end_date < NOW() ORDER BY end_date DESC',
            [orgId]
        );
        return res.status(200).json(drives);
    } catch (error) {
        console.error('Error fetching past drives:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}