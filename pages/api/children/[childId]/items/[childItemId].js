// File: pages/api/children/[childId]/items/[childItemId].js
import { validationResult, body, param } from 'express-validator';
import { runMiddleware } from '@/lib/runMiddleware'; // Adjust path
import pool from '@/config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]"; // Adjust path

async function getSessionAndVerifyChildOwnership(req, res, childIdFromParams) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return { authorized: false, user: null, status: 401, message: "Not authenticated" };
    }
    const user = session.user;
    const childId = parseInt(childIdFromParams, 10);
    if (isNaN(childId) || childId <= 0) {
        return { authorized: false, user, status: 400, message: 'Invalid Child ID in path.' };
    }
    try {
        const [childDriveOrgRows] = await pool.query(
            `SELECT d.org_id FROM unique_children uc JOIN drives d ON uc.drive_id = d.drive_id WHERE uc.child_id = ?`,
            [childId]
        );
        if (childDriveOrgRows.length === 0) {
            return { authorized: false, user, status: 404, message: 'Child not found or not associated with a drive.' };
        }
        const driveOrgId = childDriveOrgRows[0].org_id;
        if (!user.is_super_admin && (!user.is_org_admin || user.org_id !== driveOrgId)) {
            return { authorized: false, user, status: 403, message: 'Forbidden: Not authorized for this child.' };
        }
        return { authorized: true, user, childId, status: 200, message: "Authorized" };
    } catch (error) {
        console.error("Error in getSessionAndVerifyChildOwnership:", error);
        return { authorized: false, user, status: 500, message: "Internal server error validating child ownership." };
    }
}

const validatePut = [
    param('childId').isInt({ gt: 0 }),
    param('childItemId').isInt({ gt: 0 }),
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
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validatePatchParamsAndBody = [
    param('childId').isInt({ gt: 0 }),
    param('childItemId').isInt({ gt: 0 }),
    body('action').isIn(['hide', 'unhide', 'reduce_needed_to_purchased']).withMessage('Invalid action specified.'),
    body('value').optional().isBoolean().withMessage('Value for hide/unhide must be boolean.'), // For hide/unhide actions
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validateDelete = [
    param('childId').isInt({ gt: 0 }),
    param('childItemId').isInt({ gt: 0 }),
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
    const { childId: childIdFromQuery, childItemId: childItemIdFromQuery } = req.query;

    const authCheck = await getSessionAndVerifyChildOwnership(req, res, childIdFromQuery);
    if (!authCheck.authorized) {
        return res.status(authCheck.status).json({ error: authCheck.message });
    }
    const verifiedChildId = authCheck.childId;
    const childItemId = parseInt(childItemIdFromQuery, 10);

    if (req.method === 'PUT') {
        for (const middleware of validatePut) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }

        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;

        try {
            const [[purchasedRow]] = await pool.query(
                'SELECT COALESCE(SUM(oi.quantity), 0) AS purchased FROM order_items oi WHERE oi.source_child_item_id = ?',
                [childItemId]
            );
            const purchasedQuantity = Number(purchasedRow.purchased);

            if (quantity < purchasedQuantity) {
                return res.status(400).json({ error: `Cannot set needed quantity (${quantity}) below the purchased quantity (${purchasedQuantity}).` });
            }

            const [currentItemRows] = await pool.query(
                'SELECT * FROM child_items WHERE child_item_id = ? AND child_id = ? AND is_active = 1',
                [childItemId, verifiedChildId]
            );
            if (currentItemRows.length === 0) return res.status(404).json({ error: 'Active child item not found.' });
            const currentChildItem = currentItemRows[0];

            let newBaseCatalogItemId = base_catalog_item_id ? parseInt(base_catalog_item_id, 10) : currentChildItem.item_id;
            let newSelectedRyeVariantId = selected_rye_variant_id || currentChildItem.selected_rye_variant_id;
            let newSelectedRyeMarketplace = selected_rye_marketplace ? selected_rye_marketplace.toUpperCase() : currentChildItem.selected_rye_marketplace;

            let baseItemDetailsForDisplay = {};
            if (newBaseCatalogItemId !== currentChildItem.item_id || !variant_display_name || !variant_display_photo || variant_display_price === null) {
                const [itemCheck] = await pool.query('SELECT name, image_url, price FROM items WHERE item_id = ?', [newBaseCatalogItemId]);
                if (itemCheck.length === 0) return res.status(400).json({ error: `Base catalog item ID ${newBaseCatalogItemId} not found.` });
                baseItemDetailsForDisplay = itemCheck[0];
            }

            const finalDisplayName = variant_display_name || baseItemDetailsForDisplay.name || currentChildItem.variant_display_name;
            const finalDisplayPrice = (variant_display_price !== null && variant_display_price !== undefined) ? parseFloat(variant_display_price) : (baseItemDetailsForDisplay.price !== null && baseItemDetailsForDisplay.price !== undefined ? parseFloat(baseItemDetailsForDisplay.price) : currentChildItem.variant_display_price);
            const finalDisplayPhoto = variant_display_photo || baseItemDetailsForDisplay.image_url || currentChildItem.variant_display_photo;

            if (newBaseCatalogItemId !== currentChildItem.item_id || newSelectedRyeVariantId !== currentChildItem.selected_rye_variant_id) {
                const [existingItem] = await pool.query(
                    'SELECT child_item_id FROM child_items WHERE child_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1 AND child_item_id != ?',
                    [verifiedChildId, newBaseCatalogItemId, newSelectedRyeVariantId, childItemId]
                );
                if (existingItem.length > 0) return res.status(409).json({ error: 'This specific item variant configuration already exists.' });
            }

            const [updateResult] = await pool.query(
                `UPDATE child_items SET
                   item_id = ?, base_catalog_item_id = ?, quantity = ?,
                   selected_rye_variant_id = ?, selected_rye_marketplace = ?,
                   variant_display_name = ?, variant_display_price = ?, variant_display_photo = ?
                 WHERE child_item_id = ?`,
                [
                    newBaseCatalogItemId, newBaseCatalogItemId, quantity,
                    newSelectedRyeVariantId, newSelectedRyeMarketplace,
                    finalDisplayName, finalDisplayPrice, finalDisplayPhoto,
                    childItemId
                ]
            );

            if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'Child item not found or no changes made.' });

            const [updatedItemRow] = await pool.query(
                `SELECT ci.*, i.name as base_item_name, i.description as base_item_description, i.price as base_item_price, i.image_url as base_item_photo, i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, i.is_rye_linked as base_is_rye_linked
                 FROM child_items ci JOIN items i ON ci.item_id = i.item_id
                 WHERE ci.child_item_id = ?`, [childItemId]
            );
            return res.status(200).json({ message: 'Child item updated successfully.', childItem: updatedItemRow[0] });
        } catch (error) {
            console.error('Error updating child item:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'PATCH') {
        for (const middleware of validatePatchParamsAndBody) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }
        const { action } = req.body;
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [[itemDetails]] = await connection.query(
                `SELECT ci.quantity AS needed, ci.is_hidden_from_public,
                        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_child_item_id = ci.child_item_id), 0) AS purchased
                 FROM child_items ci
                 WHERE ci.child_item_id = ? AND ci.child_id = ? AND ci.is_active = 1`,
                [childItemId, verifiedChildId]
            );

            if (!itemDetails) {
                await connection.rollback();
                return res.status(404).json({ error: 'Active child item not found.' });
            }

            if (action === 'hide') {
                await connection.query('UPDATE child_items SET is_hidden_from_public = TRUE WHERE child_item_id = ?', [childItemId]);
                await connection.commit();
                return res.status(200).json({ message: 'Item hidden successfully.' });
            } else if (action === 'unhide') {
                await connection.query('UPDATE child_items SET is_hidden_from_public = FALSE WHERE child_item_id = ?', [childItemId]);
                await connection.commit();
                return res.status(200).json({ message: 'Item unhidden successfully.' });
            } else if (action === 'reduce_needed_to_purchased') {
                const purchasedQuantity = Number(itemDetails.purchased);
                const neededQuantity = Number(itemDetails.needed);

                if (purchasedQuantity < neededQuantity) {
                    await connection.query('UPDATE child_items SET quantity = ? WHERE child_item_id = ?', [purchasedQuantity, childItemId]);
                    // If reducing needed to purchased (which is > 0), and it's not already hidden, it should also be hidden.
                    if (!itemDetails.is_hidden_from_public && purchasedQuantity > 0) {
                        await connection.query('UPDATE child_items SET is_hidden_from_public = TRUE WHERE child_item_id = ?', [childItemId]);
                    }
                    await connection.commit();
                    return res.status(200).json({ message: `Needed quantity reduced to ${purchasedQuantity} and item hidden.` });
                } else if (purchasedQuantity === 0 && neededQuantity > 0) { // If nothing purchased, can reduce to 0 (effectively delete if API client handles)
                    await connection.query('UPDATE child_items SET quantity = 0 WHERE child_item_id = ?', [childItemId]);
                    // Optionally, also set hidden_from_public = TRUE here if reducing to 0 needed should also hide it
                    await connection.commit();
                    return res.status(200).json({ message: `Needed quantity reduced to 0.` });
                }
                else {
                    await connection.rollback();
                    return res.status(400).json({ error: 'Cannot reduce needed quantity; it already matches or is less than purchased, or purchased is 0 and no reduction is needed.' });
                }
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Error processing action "${action}" for child item:`, error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }

    } else if (req.method === 'DELETE') {
        for (const middleware of validateDelete) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => { middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); }); });
            if (errorOccurred || res.writableEnded) return;
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [[itemDetails]] = await connection.query(
                `SELECT ci.quantity AS needed, ci.is_active, ci.is_hidden_from_public,
                        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_child_item_id = ci.child_item_id), 0) AS purchased
                 FROM child_items ci
                 WHERE ci.child_item_id = ? AND ci.child_id = ?`,
                [childItemId, verifiedChildId]
            );

            if (!itemDetails) {
                await connection.rollback();
                return res.status(404).json({ error: 'Item not found for this child.' });
            }
            if (!itemDetails.is_active && !itemDetails.is_hidden_from_public) { // Already soft-deleted and not just hidden
                await connection.rollback();
                return res.status(404).json({ error: 'Item already deactivated.' });
            }

            const purchasedQuantity = Number(itemDetails.purchased);
            const neededQuantity = Number(itemDetails.needed);

            if (purchasedQuantity > 0) {
                await connection.rollback();
                return res.status(409).json({
                    type: "confirm_action_on_purchased_item",
                    message: "This child item has purchases and cannot be fully deleted.",
                    details: {
                        child_item_id: childItemId,
                        purchased_qty: purchasedQuantity,
                        needed_qty: neededQuantity,
                        is_partially_purchased: purchasedQuantity < neededQuantity,
                        can_reduce_needed: purchasedQuantity < neededQuantity,
                        can_hide: true
                    }
                });
            } else { // purchasedQuantity is 0
                await connection.query('DELETE FROM cart_contents WHERE source_child_item_id = ?', [childItemId]);
                const [deleteResult] = await connection.query('DELETE FROM child_items WHERE child_item_id = ?', [childItemId]);
                if (deleteResult.affectedRows > 0) {
                    await connection.commit();
                    return res.status(200).json({ message: 'Item permanently deleted.' });
                } else {
                    await connection.rollback();
                    return res.status(404).json({ error: 'Item not found for deletion (or already deleted).' });
                }
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error removing/deactivating item from child:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}