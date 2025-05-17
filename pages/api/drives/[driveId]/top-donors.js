// pages/api/drives/[driveId]/top-donors.js
import pool from "../../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { driveId } = req.query;
    const numericDriveId = parseInt(driveId, 10);

    if (isNaN(numericDriveId)) {
        return res.status(400).json({ error: "Invalid Drive ID." });
    }

    try {
        const [topDonors] = await pool.query(
            `SELECT
                a.username AS name,
                -- a.photo AS avatar, -- REMOVED a.photo
                SUM(oi.quantity) AS items
            FROM orders o
            JOIN accounts a ON o.account_id = a.account_id
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE
                (oi.drive_id = ? OR oi.child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?))
                AND o.status NOT IN ('cancelled', 'failed', 'refunded')
            GROUP BY o.account_id, a.username -- REMOVED a.photo from GROUP BY
            ORDER BY items DESC, a.username ASC
            LIMIT 3`,
            [numericDriveId, numericDriveId]
        );

        const formattedDonors = topDonors.map(donor => ({
            ...donor,
            items: Number(donor.items) || 0,
            avatar: donor.avatar || '/img/default-avatar.png', // donor.avatar will be undefined, so default will be used
            badge: ''
        }));

        return res.status(200).json(formattedDonors);
    } catch (error) {
        console.error(`Error fetching top donors for drive ${numericDriveId}:`, error); // This is line 36 now
        return res.status(500).json({ error: 'Failed to fetch top donors.' });
    }
}