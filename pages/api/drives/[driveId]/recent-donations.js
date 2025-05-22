// pages/api/drives/[driveId]/recent-donations.js
import pool from "../../../../config/database";

// Helper to format time ago (simple version)
function formatTimeAgo(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds} secs ago`;
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hrs ago`;
    return `${days} days ago`;
}


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
        const [recentDonations] = await pool.query(
            `SELECT
                a.username AS donorName,
                i.name AS itemName,
                o.order_date AS time,
                a.profile_picture_url AS avatar  -- UPDATED to fetch profile_picture_url
            FROM orders o
            JOIN accounts a ON o.account_id = a.account_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN items i ON oi.item_id = i.item_id
            WHERE
                (oi.drive_id = ? OR oi.child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?))
                AND o.status NOT IN ('cancelled', 'failed', 'refunded')
            ORDER BY o.order_date DESC
            LIMIT 5`,
            [numericDriveId, numericDriveId]
        );

        const formattedDonations = recentDonations.map(donation => ({
            donorName: donation.donorName, // Keep existing fields
            itemName: donation.itemName,
            time: formatTimeAgo(donation.time),
            avatar: donation.avatar || '/img/default-avatar.svg', // Use fetched avatar or default
            badge: '' // Keep if used elsewhere, or remove if not needed
        }));

        return res.status(200).json(formattedDonations);
    } catch (error) {
        console.error(`Error fetching recent donations for drive ${numericDriveId}:`, error);
        return res.status(500).json({ error: 'Failed to fetch recent donations.' });
    }
}