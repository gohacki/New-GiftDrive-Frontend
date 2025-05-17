// File: pages/api/drives/organization/[orgId]/index.js
import pool from "../../../../../config/database"; // Adjust path

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

    // This route is public in your Express setup.
    try {
        const [drives] = await pool.query(
            'SELECT * FROM drives WHERE org_id = ? ORDER BY start_date DESC',
            [orgId]
        );
        return res.status(200).json(drives);
    } catch (error) {
        console.error('Error fetching all drives for organization:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}