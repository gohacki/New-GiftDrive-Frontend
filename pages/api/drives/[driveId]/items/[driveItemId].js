// File: pages/api/drives/[driveId]/items/[driveItemId].js
import { validationResult, body, param } from 'express-validator';
import { runMiddleware } from '../../../../../lib/runMiddleware';
import pool from '@/config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

async function getSessionAndVerifyDriveOwnership(req, res, driveIdFromParams) {
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
        console.error("[API Auth Helper] Error in getSessionAndVerifyDriveOwnership:", error);
        return { authorized: false, user, status: 500, message: "Internal server error validating drive ownership." };
    }
}

const validatePutParamsAndBody = [
    param('driveId').isInt({ gt: 0 }),
    param('driveItemId').isInt({ gt: 0 }),
    body('quantity').notEmpty().isInt({ gt: 0 }).withMessage('Quantity must be a positive integer.'),
    body('base_catalog_item_id').optional().isInt({ gt: 0 }),
    body('selected_rye_variant_id').optional().isString(),
    body('selected_rye_marketplace').optional().isString(),
    body('variant_display_name').optional({ checkFalsy: true }).isString(),
    body('variant_display_price').optional({ checkFalsy: true }).isFloat({ gt: -0.01 }),
    body('variant_display_photo').optional({ checkFalsy: true }).isURL(),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                console.log("PUT Validation Errors:", errors.array());
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validatePatchParamsAndBody = [
    param('driveId').isInt({ gt: 0 }),
    param('driveItemId').isInt({ gt: 0 }),
    body('action').isIn(['hide', 'unhide', 'reduce_needed_to_purchased']).withMessage('Invalid action specified.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                console.log("PATCH Validation Errors:", errors.array());
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        if (!res.writableEnded) next();
    }
];


const validateDeleteParams = [
    param('driveId').isInt({ gt: 0 }).withMessage('Drive ID must be a positive integer.'),
    param('driveItemId').isInt({ gt: 0 }).withMessage('Drive Item ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                console.log("DELETE Validation Errors:", errors.array());
                return res.status(400).json({ errors: errors.array() });
            }
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

    const tempReqForValidation = {
        ...req, params: {
            driveId: driveIdFromQuery,
            driveItemId: driveItemIdFromQuery
        }
    };


    if (req.method === 'PUT') {
        for (const middleware of validatePutParamsAndBody) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(tempReqForValidation, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }
        const driveIdForDb = authCheck.driveId;
        const driveItemIdForDb = parseInt(driveItemIdFromQuery, 10);

        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;

        try {
            const [[purchasedRow]] = await pool.query(
                'SELECT COALESCE(SUM(oi.quantity), 0) AS purchased FROM order_items oi WHERE oi.source_drive_item_id = ?',
                [driveItemIdForDb]
            );
            const purchasedQuantity = Number(purchasedRow.purchased);

            if (quantity < purchasedQuantity) {
                return res.status(400).json({ error: `Cannot set needed quantity (${quantity}) below the purchased quantity (${purchasedQuantity}).` });
            }

            const [currentItemRows] = await pool.query(
                'SELECT * FROM drive_items WHERE drive_item_id = ? AND drive_id = ? AND is_active = 1',
                [driveItemIdForDb, driveIdForDb]
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
                    [driveIdForDb, newBaseCatalogItemId, newSelectedRyeVariantId, driveItemIdForDb]
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
                    driveItemIdForDb
                ]
            );
            if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Drive item not found or no changes made.' });

            const [updatedItemRow] = await pool.query(
                `SELECT di.*, i.name as base_item_name, i.description as base_item_description, i.price as base_item_price, i.image_url as base_item_photo, i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, i.is_rye_linked as base_is_rye_linked
                 FROM drive_items di JOIN items i ON di.item_id = i.item_id
                 WHERE di.drive_item_id = ?`, [driveItemIdForDb]
            );
            return res.status(200).json({ message: 'Drive item updated successfully.', driveItem: updatedItemRow[0] });
        } catch (error) {
            console.error('Error updating drive item:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

    } else if (req.method === 'PATCH') {
        for (const middleware of validatePatchParamsAndBody) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(tempReqForValidation, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }

        const driveIdForDb = authCheck.driveId;
        const driveItemIdForDb = parseInt(driveItemIdFromQuery, 10);
        const { action } = req.body;

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [itemDetailsRows] = await connection.query( // Changed from [[itemDetails]]
                `SELECT di.quantity AS needed, di.is_hidden_from_public,
                        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_drive_item_id = di.drive_item_id), 0) AS purchased
                 FROM drive_items di
                 WHERE di.drive_item_id = ? AND di.drive_id = ? AND di.is_active = 1`,
                [driveItemIdForDb, driveIdForDb]
            );

            if (itemDetailsRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Active drive item not found.' });
            }
            const itemDetails = itemDetailsRows[0];

            if (action === 'hide') {
                await connection.query('UPDATE drive_items SET is_hidden_from_public = TRUE WHERE drive_item_id = ?', [driveItemIdForDb]);
                await connection.commit();
                return res.status(200).json({ message: 'Item hidden successfully.' });
            } else if (action === 'unhide') {
                await connection.query('UPDATE drive_items SET is_hidden_from_public = FALSE WHERE drive_item_id = ?', [driveItemIdForDb]);
                await connection.commit();
                return res.status(200).json({ message: 'Item unhidden successfully.' });
            } else if (action === 'reduce_needed_to_purchased') {
                const purchasedQuantity = Number(itemDetails.purchased);
                const neededQuantity = Number(itemDetails.needed);

                if (purchasedQuantity < neededQuantity) {
                    await connection.query('UPDATE drive_items SET quantity = ? WHERE drive_item_id = ?', [purchasedQuantity, driveItemIdForDb]);
                    if (!itemDetails.is_hidden_from_public && purchasedQuantity > 0) {
                        await connection.query('UPDATE drive_items SET is_hidden_from_public = TRUE WHERE drive_item_id = ?', [driveItemIdForDb]);
                    }
                    await connection.commit();
                    return res.status(200).json({ message: `Needed quantity reduced to ${purchasedQuantity}${purchasedQuantity > 0 && !itemDetails.is_hidden_from_public ? ' and item hidden' : ''}.` });
                } else if (purchasedQuantity === 0 && neededQuantity > 0) {
                    await connection.query('UPDATE drive_items SET quantity = 0, is_hidden_from_public = TRUE WHERE drive_item_id = ?', [driveItemIdForDb]);
                    await connection.commit();
                    return res.status(200).json({ message: `Needed quantity reduced to 0 and item hidden.` });
                }
                else {
                    await connection.rollback();
                    return res.status(400).json({ error: 'Cannot reduce needed quantity; it already matches or is less than purchased, or no reduction is applicable.' });
                }
            } else {
                await connection.rollback();
                return res.status(400).json({ error: "Invalid action for PATCH request." });
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Error processing PATCH action "${action}" for drive item:`, error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else if (req.method === 'DELETE') {
        console.log(`[API DELETE /drives/${driveIdFromQuery}/items/${driveItemIdFromQuery}] Received request.`);
        for (const middleware of validateDeleteParams) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(tempReqForValidation, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) {
                console.log("[API DELETE] Validation failed or response ended by middleware.");
                return;
            }
        }

        const driveIdForDb = authCheck.driveId;
        const driveItemIdForDb = parseInt(driveItemIdFromQuery, 10);

        console.log(`[API DELETE] Attempting to delete driveItem: ${driveItemIdForDb} from drive: ${driveIdForDb}`);

        let connection;
        try {
            connection = await pool.getConnection();
            console.log("[API DELETE] Database connection acquired.");
            await connection.beginTransaction();
            console.log("[API DELETE] Transaction started.");

            const [itemDetailsRows] = await connection.query(
                `SELECT di.quantity AS needed, di.is_active, di.is_hidden_from_public,
                        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_drive_item_id = di.drive_item_id), 0) AS purchased
                 FROM drive_items di
                 WHERE di.drive_item_id = ? AND di.drive_id = ?`,
                [driveItemIdForDb, driveIdForDb]
            );
            console.log(`[API DELETE] Fetched item details. Row count: ${itemDetailsRows.length}`);

            if (itemDetailsRows.length === 0) {
                await connection.rollback();
                console.log("[API DELETE] Item not found for this drive.");
                return res.status(404).json({ error: 'Item not found for this drive.' });
            }
            const itemDetails = itemDetailsRows[0];

            if (!itemDetails.is_active && !itemDetails.is_hidden_from_public) {
                await connection.rollback();
                console.log("[API DELETE] Item already deactivated and not merely hidden.");
                return res.status(404).json({ error: 'Item already deactivated and not merely hidden.' });
            }

            const purchasedQuantity = Number(itemDetails.purchased);
            const neededQuantity = Number(itemDetails.needed);
            console.log(`[API DELETE] Purchased: ${purchasedQuantity}, Needed: ${neededQuantity}`);

            if (purchasedQuantity > 0) {
                await connection.rollback();
                const responsePayload = {
                    type: "confirm_action_on_purchased_item",
                    message: "This item has purchases and cannot be fully deleted.",
                    details: {
                        drive_item_id: driveItemIdForDb,
                        purchased_qty: purchasedQuantity, // This should be a number
                        needed_qty: neededQuantity,       // This should be a number
                        is_partially_purchased: purchasedQuantity < neededQuantity,
                        can_reduce_needed: purchasedQuantity < neededQuantity,
                        can_hide: true
                    }
                };
                console.log("[API DELETE] Item has purchases. Returning 409 with payload:", JSON.stringify(responsePayload));
                return res.status(409).json(responsePayload);
            } else {
                console.log("[API DELETE] Item has no purchases. Proceeding with permanent deletion.");
                await connection.query('DELETE FROM cart_contents WHERE source_drive_item_id = ?', [driveItemIdForDb]);
                console.log("[API DELETE] Deleted from cart_contents.");
                const [deleteResult] = await connection.query('DELETE FROM drive_items WHERE drive_item_id = ?', [driveItemIdForDb]);
                console.log(`[API DELETE] Deleted from drive_items. Affected rows: ${deleteResult.affectedRows}`);

                if (deleteResult.affectedRows > 0) {
                    await connection.commit();
                    console.log("[API DELETE] Transaction committed. Item permanently deleted.");
                    return res.status(200).json({ message: 'Item permanently deleted.' });
                } else {
                    await connection.rollback();
                    console.log("[API DELETE] Item not found for deletion (or already deleted). Transaction rolled back.");
                    return res.status(404).json({ error: 'Item not found for deletion (or already deleted).' });
                }
            }
        } catch (error) {
            if (connection) {
                console.log("[API DELETE] Error occurred, rolling back transaction.");
                await connection.rollback();
            }
            console.error('[API DELETE] Error removing/deactivating item from drive:', {
                message: error.message, name: error.name, stack: error.stack,
                sqlMessage: error.sqlMessage, sqlState: error.sqlState,
                errno: error.errno, code: error.code
            });
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) {
                console.log("[API DELETE] Releasing database connection.");
                connection.release();
            }
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}