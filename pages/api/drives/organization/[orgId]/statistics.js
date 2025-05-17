// File: pages/api/drives/organization/[orgId]/statistics.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import pool from "../../../../../config/database";

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

    // Authorization
    if (!user.is_super_admin && (!user.is_org_admin || user.org_id !== orgId)) {
        return res.status(403).json({ error: 'Forbidden: Not authorized to view statistics for this organization.' });
    }

    const { startDate, endDate } = req.query; // Dates are ISO strings
    const parsedStartDate = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format for startDate or endDate.' });
    }

    try {
        // Your existing statistics aggregation logic
        const [activeDriveRows] = await pool.query(`
            SELECT drive_id FROM drives
            WHERE org_id = ? AND start_date <= ? AND end_date >= ?
        `, [orgId, parsedEndDate, parsedStartDate]);
        const activeDriveIds = activeDriveRows.map(row => row.drive_id);

        const statistics = { /* ... initial statistics object ... */
            activeDrivesCount: activeDriveIds.length, totalKidsInActiveDrives: 0, kidsFullyGifted: 0,
            kidsPartiallyGifted: 0, kidsUngifted: 0, totalItemsNeeded: 0, totalItemsPurchased: 0,
            giftsPurchased: 0, giftsInCarts: 0, giftsUnpurchased: 0, totalMoneySpent: 0,
            avgMoneyDonatedPerPerson: 0, uniqueDonorsCount: 0, topDonors: [], pageViews: 0,
            pageViewsOverTime: [], donationsOverTime: [],
        };

        if (activeDriveIds.length === 0) {
            return res.status(200).json(statistics);
        }

        // --- Donee (Kid) Statistics ---
        const [childIdsRows] = await pool.query('SELECT child_id FROM unique_children WHERE drive_id IN (?)', [activeDriveIds]);
        const childIds = childIdsRows.map(row => row.child_id);
        statistics.totalKidsInActiveDrives = childIds.length;

        if (childIds.length > 0) {
            const [childItemsNeededRows] = await pool.query(
                'SELECT child_id, SUM(quantity) AS totalNeeded FROM child_items WHERE child_id IN (?) AND is_active = 1 GROUP BY child_id',
                [childIds]
            );
            const [childItemsPurchasedRows] = await pool.query(
                `SELECT ci.child_id, SUM(oi.quantity) AS totalPurchased
                 FROM order_items oi
                 JOIN child_items ci ON oi.source_child_item_id = ci.child_item_id
                 JOIN orders o ON oi.order_id = o.order_id
                 WHERE ci.child_id IN (?) AND o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
                 GROUP BY ci.child_id`, // Make sure oi.child_id refers to unique_children.child_id
                [childIds, parsedStartDate, parsedEndDate]
            );
            const neededMap = new Map(childItemsNeededRows.map(r => [r.child_id, Number(r.totalNeeded) || 0]));
            const purchasedMap = new Map(childItemsPurchasedRows.map(r => [r.child_id, Number(r.totalPurchased) || 0]));

            childIds.forEach(id => {
                const needed = neededMap.get(id) || 0;
                const purchased = purchasedMap.get(id) || 0;
                if (needed > 0) {
                    if (purchased === 0) statistics.kidsUngifted++;
                    else if (purchased >= needed) statistics.kidsFullyGifted++;
                    else statistics.kidsPartiallyGifted++;
                } else {
                    statistics.kidsUngifted++;
                }
            });
        }

        // --- Item Statistics ---
        const [[totalChildItemsNeededRow]] = await pool.query(
            'SELECT COALESCE(SUM(ci.quantity), 0) AS total FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?) AND ci.is_active = 1',
            [activeDriveIds]
        );
        const [[totalDriveItemsNeededRow]] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) AS total FROM drive_items WHERE drive_id IN (?) AND is_active = 1',
            [activeDriveIds]
        );
        statistics.totalItemsNeeded = (Number(totalChildItemsNeededRow.total) || 0) + (Number(totalDriveItemsNeededRow.total) || 0);

        const [[totalItemsPurchasedRow]] = await pool.query(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS total
             FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
             WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
             AND (oi.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                  oi.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                 )`,
            [parsedStartDate, parsedEndDate, activeDriveIds, activeDriveIds]
        );
        statistics.totalItemsPurchased = Number(totalItemsPurchasedRow.total) || 0;
        statistics.giftsPurchased = statistics.totalItemsPurchased;

        const [[giftsInCartsRow]] = await pool.query(
            `SELECT COALESCE(SUM(cc.quantity), 0) AS total
             FROM cart_contents cc JOIN carts c ON cc.cart_id = c.id
             WHERE c.status = 'active' AND
                   (cc.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                    cc.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                   )`,
            [activeDriveIds, activeDriveIds]
        );
        statistics.giftsInCarts = Number(giftsInCartsRow.total) || 0;
        statistics.giftsUnpurchased = Math.max(0, statistics.totalItemsNeeded - statistics.giftsPurchased - statistics.giftsInCarts);

        // --- Financial & Donor Statistics ---
        const [[moneySpentRow]] = await pool.query(
            `SELECT COALESCE(SUM(oi.price * oi.quantity), 0) AS total
             FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
             WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
             AND (oi.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                  oi.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                 )`,
            [parsedStartDate, parsedEndDate, activeDriveIds, activeDriveIds]
        );
        statistics.totalMoneySpent = Number(moneySpentRow.total) || 0;

        const [[uniqueDonorsRow]] = await pool.query(
            `SELECT COUNT(DISTINCT o.account_id) AS count
             FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
             AND (oi.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                  oi.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                 )`,
            [parsedStartDate, parsedEndDate, activeDriveIds, activeDriveIds]
        );
        statistics.uniqueDonorsCount = Number(uniqueDonorsRow.count) || 0;
        statistics.avgMoneyDonatedPerPerson = statistics.uniqueDonorsCount > 0 ? statistics.totalMoneySpent / statistics.uniqueDonorsCount : 0;

        const [topDonorsRows] = await pool.query( /* ... same query as before, ensuring drive_id scoping ... */
            `SELECT acc.username AS name, SUM(oi.price * oi.quantity) AS amount
             FROM orders o JOIN accounts acc ON o.account_id = acc.account_id
             JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
             AND (oi.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                  oi.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                 )
             GROUP BY acc.account_id, acc.username ORDER BY amount DESC LIMIT 5`,
            [parsedStartDate, parsedEndDate, activeDriveIds, activeDriveIds]
        );
        statistics.topDonors = topDonorsRows.map(r => ({ name: r.name, amount: parseFloat(r.amount) }));

        const [donationsOverTimeRows] = await pool.query( /* ... same query, ensuring drive_id scoping ... */
            `SELECT DATE(o.order_date) as date, SUM(oi.price * oi.quantity) as totalValue
             FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled', 'failed', 'refunded')
             AND (oi.source_drive_item_id IN (SELECT drive_item_id FROM drive_items WHERE drive_id IN (?)) OR
                  oi.source_child_item_id IN (SELECT ci.child_item_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE uc.drive_id IN (?))
                 )
             GROUP BY DATE(o.order_date) ORDER BY DATE(o.order_date) ASC`,
            [parsedStartDate, parsedEndDate, activeDriveIds, activeDriveIds]
        );
        statistics.donationsOverTime = donationsOverTimeRows.map(r => ({ date: r.date, totalValue: parseFloat(r.totalValue) }));


        // --- Page View Statistics ---
        const [[pageViewsRow]] = await pool.query(
            'SELECT COALESCE(SUM(view_count), 0) AS total FROM page_views WHERE org_id = ? AND view_date BETWEEN ? AND ?',
            [orgId, parsedStartDate, parsedEndDate]
        );
        statistics.pageViews = Number(pageViewsRow.total) || 0;

        const [pageViewsOverTimeRows] = await pool.query(
            'SELECT view_date AS date, view_count AS views FROM page_views WHERE org_id = ? AND view_date BETWEEN ? AND ? ORDER BY view_date ASC',
            [orgId, parsedStartDate, parsedEndDate]
        );
        statistics.pageViewsOverTime = pageViewsOverTimeRows;

        return res.status(200).json(statistics);
    } catch (error) {
        console.error(`Error fetching statistics for org ${orgId}:`, error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}