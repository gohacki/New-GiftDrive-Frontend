// File: pages/api/drives/organization/[orgId]/check.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]"; // Adjust path
import pool from "../../../../../config/database";         // Adjust path

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
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
        const [countResult] = await pool.query('SELECT COUNT(*) as driveCount FROM drives WHERE org_id = ?', [orgId]);
        return res.status(200).json({ hasDrives: countResult[0].driveCount > 0 });
    } catch (error) {
        console.error(`Error checking drives for org ${orgId}:`, error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}