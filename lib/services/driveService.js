// File: lib/services/driveService.js
import pool from '../../config/database';

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

export async function getCoreDriveDetails(driveId) {
    const numericDriveId = parseInt(driveId, 10);
    if (isNaN(numericDriveId)) {
        throw new Error("Invalid Drive ID format.");
    }
    const [driveRows] = await pool.query(
        `SELECT d.*, o.name as organization_name, o.photo as organization_photo, o.city as org_city, o.state as org_state
         FROM drives d
         JOIN organizations o ON d.org_id = o.org_id
         WHERE d.drive_id = ?`,
        [numericDriveId]
    );
    if (driveRows.length === 0) return null;
    const driveData = driveRows[0];
    const [childrenRows] = await pool.query(
        `SELECT uc.child_id, dc.name as child_name, dc.photo as child_photo
         FROM unique_children uc
         JOIN default_children dc ON uc.default_child_id = dc.default_child_id
         WHERE uc.drive_id = ?`,
        [numericDriveId]
    );
    driveData.children = childrenRows || [];
    return driveData;
}

export async function getDriveAggregates(driveId) {
    const numericDriveId = parseInt(driveId, 10);
    if (isNaN(numericDriveId)) {
        throw new Error("Invalid Drive ID format.");
    }

    // Total Needed: Excludes items marked as is_hidden_from_public
    const [[driveItemsNeededRow]] = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) AS total_drive_needed FROM drive_items WHERE drive_id = ? AND is_active = 1 AND is_hidden_from_public = FALSE',
        [numericDriveId]
    );
    const totalDriveNeeded = Number(driveItemsNeededRow.total_drive_needed) || 0;

    const [[childItemsNeededRow]] = await pool.query(
        `SELECT COALESCE(SUM(ci.quantity), 0) AS total_child_needed
         FROM unique_children uc
         JOIN child_items ci ON uc.child_id = ci.child_id
         WHERE uc.drive_id = ? AND ci.is_active = 1 AND ci.is_hidden_from_public = FALSE`,
        [numericDriveId]
    );
    const totalChildNeeded = Number(childItemsNeededRow.total_child_needed) || 0;
    const totalNeeded = totalDriveNeeded + totalChildNeeded;

    // Total Purchased: Only for items currently NOT hidden
    const [[driveItemsPurchasedRow]] = await pool.query(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS total_drive_purchased
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.order_id
         JOIN drive_items di ON oi.source_drive_item_id = di.drive_item_id
         WHERE di.drive_id = ?
           AND di.is_hidden_from_public = FALSE
           AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
        [numericDriveId]
    );
    const totalDrivePurchased = Number(driveItemsPurchasedRow.total_drive_purchased) || 0;

    const [[childItemsPurchasedRow]] = await pool.query(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS total_child_purchased
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.order_id
         JOIN child_items ci ON oi.source_child_item_id = ci.child_item_id
         JOIN unique_children uc ON ci.child_id = uc.child_id
         WHERE uc.drive_id = ?
           AND ci.is_hidden_from_public = FALSE
           AND o.status NOT IN ('cancelled', 'failed', 'refunded')`,
        [numericDriveId]
    );
    const totalChildPurchased = Number(childItemsPurchasedRow.total_child_purchased) || 0;
    const totalPurchased = totalDrivePurchased + totalChildPurchased;

    // Donors Count: Only for donations towards items currently NOT hidden
    const [[donorsCountRow]] = await pool.query(
        `SELECT COUNT(DISTINCT o.account_id) AS donorsCount
         FROM orders o
         JOIN order_items oi ON o.order_id = o.order_id
         WHERE o.status NOT IN ('cancelled', 'failed', 'refunded')
           AND (
             (oi.source_drive_item_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM drive_items di
               WHERE di.drive_item_id = oi.source_drive_item_id AND di.drive_id = ? AND di.is_hidden_from_public = FALSE
             )) OR
             (oi.source_child_item_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM child_items ci
               JOIN unique_children uc ON ci.child_id = uc.child_id
               WHERE ci.child_item_id = oi.source_child_item_id AND uc.drive_id = ? AND ci.is_hidden_from_public = FALSE
             ))
           )`,
        [numericDriveId, numericDriveId]
    );
    const donorsCount = Number(donorsCountRow.donorsCount) || 0;

    return { totalNeeded, totalPurchased, donorsCount };
}

export async function getDriveSpecificItems(driveId) {
    const numericDriveId = parseInt(driveId, 10);
    if (isNaN(numericDriveId)) {
        throw new Error("Invalid Drive ID format.");
    }
    const [rows] = await pool.query(`
        SELECT
          di.drive_item_id, di.drive_id, di.item_id, di.quantity AS needed,
          di.selected_rye_variant_id, di.selected_rye_marketplace,
          di.variant_display_name, di.variant_display_price, di.variant_display_photo,
          di.is_hidden_from_public,
          i.name AS base_item_name, i.description AS base_item_description,
          i.price AS base_item_price, i.image_url AS base_item_photo,
          i.rye_product_id AS base_rye_product_id, i.marketplace AS base_marketplace,
          i.is_rye_linked AS base_is_rye_linked,
          COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_drive_item_id = di.drive_item_id), 0) AS purchased
        FROM drive_items di JOIN items i ON di.item_id = i.item_id
        WHERE di.drive_id = ? AND di.is_active = 1
    `, [numericDriveId]);
    return rows.map(r => ({
        drive_item_id: r.drive_item_id,
        drive_id: r.drive_id,
        item_id: r.item_id,
        needed: Number(r.needed) || 0,
        purchased: Number(r.purchased) || 0,
        remaining: Math.max(0, (Number(r.needed) || 0) - (Number(r.purchased) || 0)),
        selected_rye_variant_id: r.selected_rye_variant_id,
        selected_rye_marketplace: r.selected_rye_marketplace,
        variant_display_name: r.variant_display_name,
        variant_display_price: r.variant_display_price !== null ? parseFloat(r.variant_display_price) : null,
        variant_display_photo: r.variant_display_photo,
        is_hidden_from_public: Boolean(r.is_hidden_from_public),
        base_item_name: r.base_item_name,
        base_item_photo: r.base_item_photo,
        base_item_price: r.base_item_price !== null ? parseFloat(r.base_item_price) : null,
        base_item_description: r.base_item_description,
        base_rye_product_id: r.base_rye_product_id,
        base_marketplace: r.base_marketplace,
        is_rye_linked: Boolean(r.base_is_rye_linked),
    }));
}

export async function getDriveTopDonors(driveId) {
    const numericDriveId = parseInt(driveId, 10);
    if (isNaN(numericDriveId)) {
        throw new Error("Invalid Drive ID format.");
    }
    const [topDonors] = await pool.query(
        `SELECT
            a.username AS name,
            a.profile_picture_url AS avatar,
            SUM(oi.quantity) AS items
        FROM orders o
        JOIN accounts a ON o.account_id = a.account_id
        JOIN order_items oi ON o.order_id = o.order_id
        LEFT JOIN drive_items di ON oi.source_drive_item_id = di.drive_item_id
        LEFT JOIN child_items ci ON oi.source_child_item_id = ci.child_item_id
        LEFT JOIN unique_children uc ON ci.child_id = uc.child_id
        WHERE
            o.status NOT IN ('cancelled', 'failed', 'refunded') AND
            (
                (di.drive_item_id IS NOT NULL AND di.drive_id = ? AND di.is_hidden_from_public = FALSE) OR
                (ci.child_item_id IS NOT NULL AND uc.drive_id = ? AND ci.is_hidden_from_public = FALSE)
            )
        GROUP BY o.account_id, a.username, a.profile_picture_url
        ORDER BY items DESC, a.username ASC
        LIMIT 3`,
        [numericDriveId, numericDriveId]
    );
    return topDonors.map(donor => ({
        name: donor.name,
        items: Number(donor.items) || 0,
        avatar: donor.avatar || '/img/default-avatar.svg',
        badge: ''
    }));
}

export async function getDriveRecentDonations(driveId) {
    const numericDriveId = parseInt(driveId, 10);
    if (isNaN(numericDriveId)) {
        throw new Error("Invalid Drive ID format.");
    }
    const [recentDonations] = await pool.query(
        `SELECT
            a.username AS donorName,
            COALESCE(di.variant_display_name, ci.variant_display_name, i.name) AS itemName,
            o.order_date AS time,
            a.profile_picture_url AS avatar
        FROM orders o
        JOIN accounts a ON o.account_id = a.account_id
        JOIN order_items oi ON o.order_id = o.order_id
        JOIN items i ON oi.item_id = i.item_id
        LEFT JOIN drive_items di ON oi.source_drive_item_id = di.drive_item_id
        LEFT JOIN child_items ci ON oi.source_child_item_id = ci.child_item_id
        LEFT JOIN unique_children uc ON ci.child_id = uc.child_id
        WHERE
            o.status NOT IN ('cancelled', 'failed', 'refunded') AND
            (
                (di.drive_item_id IS NOT NULL AND di.drive_id = ? AND di.is_hidden_from_public = FALSE) OR
                (ci.child_item_id IS NOT NULL AND uc.drive_id = ? AND ci.is_hidden_from_public = FALSE)
            )
        ORDER BY o.order_date DESC
        LIMIT 5`,
        [numericDriveId, numericDriveId]
    );
    return recentDonations.map(donation => ({
        donorName: donation.donorName,
        itemName: donation.itemName,
        time: formatTimeAgo(donation.time),
        avatar: donation.avatar || '/img/default-avatar.svg',
        badge: ''
    }));
}