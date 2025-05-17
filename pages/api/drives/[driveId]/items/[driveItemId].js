// File: pages/api/drives/[driveId]/items/[driveItemId].js
import { validationResult, body, param } from 'express-validator';
import { runMiddleware } from '../../../../../lib/runMiddleware'; // Adjust path
import pool from '@/config/database';

// getSessionAndVerifyDriveOwnership helper from above or imported

// --- Re-define getSessionAndVerifyDriveOwnership here or import from a shared utils ---
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

async function getSessionAndVerifyDriveOwnership(req, res, driveIdFromParams) {
    // ... (implementation from above)
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return { authorized: false, user: null, status: 401, message: "Not authenticated" };
    }
    const user = session.user;
    const driveId = parseInt(driveIdFromParams, 10);
    if (isNaN(driveId) || driveId <= 0) {
        return { authorized: false, user, status: 400, message: 'Invalid Drive ID in path.' };
    }
    try {
        const [driveOrgRows] = await pool.query(
            `SELECT org_id FROM drives WHERE drive_id = ?`, [driveId]
        );
        if (driveOrgRows.length === 0) {
            return { authorized: false, user, status: 404, message: 'Drive not found.' };
        }
        const driveOrgId = driveOrgRows[0].org_id;
        if (!user.is_super_admin && (!user.is_org_admin || user.org_id !== driveOrgId)) {
            return { authorized: false, user, status: 403, message: 'Forbidden: Not authorized for this drive.' };
        }
        return { authorized: true, user, driveId, status: 200, message: "Authorized" };
    } catch (error) {
        console.error("Error in getSessionAndVerifyDriveOwnership:", error);
        return { authorized: false, user, status: 500, message: "Internal server error validating drive ownership." };
    }
}
// --- End Helper ---

const validatePutParamsAndBody = [
    param('driveId').isInt({ gt: 0 }),
    param('driveItemId').isInt({ gt: 0 }),
    body('quantity').notEmpty().isInt({ gt: 0 }),
    body('base_catalog_item_id').optional().isInt({ gt: 0 }),
    body('selected_rye_variant_id').optional().isString(),
    // ... other body validations
    body('selected_rye_marketplace').optional().isString(),
    body('variant_display_name').optional({ checkFalsy: true }).isString(),
    body('variant_display_price').optional({ checkFalsy: true }).isFloat({ gt: -0.01 }),
    body('variant_display_photo').optional({ checkFalsy: true }).isURL(),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validateDeleteParams = [
    param('driveId').isInt({ gt: 0 }),
    param('driveItemId').isInt({ gt: 0 }),
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
    const { driveId: driveIdFromQuery, driveItemId: driveItemIdFromQuery } = req.query;

    const authCheck = await getSessionAndVerifyDriveOwnership(req, res, driveIdFromQuery);
    if (!authCheck.authorized) {
        return res.status(authCheck.status).json({ error: authCheck.message });
    }
    const driveId = authCheck.driveId; // Use verified driveId

    if (req.method === 'PUT') {
        for (const middleware of validatePutParamsAndBody) { /* ... run middleware ... */
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }
        const driveItemId = parseInt(driveItemIdFromQuery, 10);
        // Your existing PUT logic
        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;
        try {
            const [currentItemRows] = await pool.query(
                'SELECT * FROM drive_items WHERE drive_item_id = ? AND drive_id = ? AND is_active = 1',
                [driveItemId, driveId]
            );
            if (currentItemRows.length === 0) return res.status(404).json({ error: 'Active drive item not found.' });
            const currentDriveItem = currentItemRows[0];

            let newBaseCatalogItemId = base_catalog_item_id ? parseInt(base_catalog_item_id, 10) : currentDriveItem.item_id;
            let newSelectedRyeVariantId = selected_rye_variant_id || currentDriveItem.selected_rye_variant_id;
            let newSelectedRyeMarketplace = selected_rye_marketplace ? selected_rye_marketplace.toUpperCase() : currentDriveItem.selected_rye_marketplace;

            let baseItemDetailsForDisplay = {};
            if (newBaseCatalogItemId !== currentDriveItem.item_id || !variant_display_name || !variant_display_photo || variant_display_price === null) {
                const [itemCheck] = await pool.query('SELECT name, image_url, price FROM items WHERE item_id = ?', [newBaseCatalogItemId]);
                if (itemCheck.length === 0) return res.status(400).json({ error: `Base catalog item ID ${newBaseCatalogItemId} not found.` });
                baseItemDetailsForDisplay = itemCheck[0];
            }

            const finalDisplayName = variant_display_name || baseItemDetailsForDisplay.name || currentDriveItem.variant_display_name;
            const finalDisplayPrice = (variant_display_price !== null && variant_display_price !== undefined) ? parseFloat(variant_display_price) : (baseItemDetailsForDisplay.price !== null && baseItemDetailsForDisplay.price !== undefined ? parseFloat(baseItemDetailsForDisplay.price) : currentDriveItem.variant_display_price);
            const finalDisplayPhoto = variant_display_photo || baseItemDetailsForDisplay.image_url || currentDriveItem.variant_display_photo;

            if (newBaseCatalogItemId !== currentDriveItem.item_id || newSelectedRyeVariantId !== currentDriveItem.selected_rye_variant_id) {
                const [existingItem] = await pool.query(
                    'SELECT drive_item_id FROM drive_items WHERE drive_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1 AND drive_item_id != ?',
                    [driveId, newBaseCatalogItemId, newSelectedRyeVariantId, driveItemId]
                );
                if (existingItem.length > 0) return res.status(409).json({ error: 'This specific item variant configuration already exists.' });
            }

            const [updateResult] = await pool.query(
                `UPDATE drive_items SET
                   item_id = ?, base_catalog_item_id = ?, quantity = ?,
                   selected_rye_variant_id = ?, selected_rye_marketplace = ?,
                   variant_display_name = ?, variant_display_price = ?, variant_display_photo = ?
                 WHERE drive_item_id = ?`,
                [
                    newBaseCatalogItemId, newBaseCatalogItemId, quantity,
                    newSelectedRyeVariantId, newSelectedRyeMarketplace,
                    finalDisplayName, finalDisplayPrice, finalDisplayPhoto,
                    driveItemId
                ]
            );
            if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Drive item not found or no changes made.' });

            const [updatedItemRow] = await pool.query(
                `SELECT di.*, i.name as base_item_name, i.description as base_item_description, i.price as base_item_price, i.image_url as base_item_photo, i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, i.is_rye_linked as base_is_rye_linked
                 FROM drive_items di JOIN items i ON di.item_id = i.item_id
                 WHERE di.drive_item_id = ?`, [driveItemId]
            );
            return res.status(200).json({ message: 'Drive item updated successfully.', driveItem: updatedItemRow[0] });
        } catch (error) {
            console.error('Error updating drive item:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

    } else if (req.method === 'DELETE') {
        for (const middleware of validateDeleteParams) { /* ... run middleware ... */
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }
        const driveItemId = parseInt(driveItemIdFromQuery, 10);
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();
            // Your existing DELETE logic
            const [itemExistsRows] = await connection.query('SELECT drive_item_id FROM drive_items WHERE drive_item_id = ? AND drive_id = ?', [driveItemId, driveId]);
            if (itemExistsRows.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'Item not found for this drive.' }); }

            const [orderCheckRows] = await connection.query('SELECT COUNT(*) as orderCount FROM order_items WHERE source_drive_item_id = ?', [driveItemId]);
            const hasBeenOrdered = orderCheckRows[0].orderCount > 0;

            if (hasBeenOrdered) {
                const [updateResult] = await connection.query('UPDATE drive_items SET is_active = 0 WHERE drive_item_id = ?', [driveItemId]);
                if (updateResult.affectedRows > 0) { await connection.commit(); return res.status(200).json({ message: 'Item deactivated (has been ordered).' }); }
                else { await connection.rollback(); return res.status(404).json({ error: 'Item not found or no change made.' }); }
            } else {
                await connection.query('DELETE FROM cart_contents WHERE source_drive_item_id = ?', [driveItemId]);
                const [deleteResult] = await connection.query('DELETE FROM drive_items WHERE drive_item_id = ?', [driveItemId]);
                if (deleteResult.affectedRows > 0) { await connection.commit(); return res.status(200).json({ message: 'Item permanently deleted.' }); }
                else { await connection.rollback(); return res.status(404).json({ error: 'Item not found for deletion.' }); }
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error removing/deactivating item from drive:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}