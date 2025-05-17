// File: pages/api/drives/[driveId]/aggregate.js
import pool from "../../../../config/database"; // Adjust path

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { driveId: driveIdFromQuery } = req.query;
    const driveId = parseInt(driveIdFromQuery, 10);

    if (isNaN(driveId)) {
        return res.status(400).json({ error: "Invalid Drive ID format." });
    }

    // This route is public in your Express setup.
    // If auth is needed, add getServerSession and checks here.

    try {
        // Your existing aggregation logic
        const [[driveItemsNeededRow]] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total_drive_needed FROM drive_items WHERE drive_id = ? AND is_active = 1',
            [driveId]
        );
        const totalDriveNeeded = Number(driveItemsNeededRow.total_drive_needed) || 0;

        const [[childItemsNeededRow]] = await pool.query(
            `SELECT COALESCE(SUM(ci.quantity), 0) AS total_child_needed
             FROM unique_children uc
             JOIN child_items ci ON uc.child_id = ci.child_id
             WHERE uc.drive_id = ? AND ci.is_active = 1`,
            [driveId]
        );
        const totalChildNeeded = Number(childItemsNeededRow.total_child_needed) || 0;
        const totalNeeded = totalDriveNeeded + totalChildNeeded;

        const [[driveItemsPurchasedRow]] = await pool.query(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS total_drive_purchased
             FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
             WHERE oi.drive_id = ? AND oi.child_id IS NULL AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
            [driveId]
        );
        const totalDrivePurchased = Number(driveItemsPurchasedRow.total_drive_purchased) || 0;

        const [[childItemsPurchasedRow]] = await pool.query(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS total_child_purchased
             FROM order_items oi
             JOIN unique_children uc ON oi.child_id = uc.child_id
             JOIN orders o ON oi.order_id = o.order_id
             WHERE uc.drive_id = ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
            [driveId]
        );
        const totalChildPurchased = Number(childItemsPurchasedRow.total_child_purchased) || 0;
        const totalPurchased = totalDrivePurchased + totalChildPurchased;

        // Fetch donors count for this specific drive
        const [[donorsCountRow]] = await pool.query(
            `SELECT COUNT(DISTINCT o.account_id) AS donorsCount
             FROM orders o
             JOIN order_items oi ON o.order_id = oi.order_id
             WHERE (oi.drive_id = ? OR oi.child_id IN (SELECT child_id FROM unique_children WHERE drive_id = ?))
             AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
            [driveId, driveId]
        );
        const donorsCount = Number(donorsCountRow.donorsCount) || 0;


        console.log(`Aggregate for Drive ${driveId}: Needed=${totalNeeded}, Purchased=${totalPurchased}, Donors=${donorsCount}`);
        return res.status(200).json({ totalNeeded, totalPurchased, donorsCount });

    } catch (error) {
        console.error(`Error fetching aggregate for drive ${driveId}:`, error);
        return res.status(500).json({ error: 'Internal server error while fetching drive aggregates' });
    }
}