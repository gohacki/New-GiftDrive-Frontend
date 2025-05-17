// File: pages/api/children/[childId]/items/[childItemId].js
import { validationResult, body, param } from 'express-validator';
import { runMiddleware } from '../../../../lib/runMiddleware'; // Adjust path
import pool from '../../../../config/database';
// getSessionAndVerifyChildOwnership helper from above or imported

// --- Re-define getSessionAndVerifyChildOwnership here or import from a shared utils ---
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]"; // Adjust path

async function getSessionAndVerifyChildOwnership(req, res, childIdFromParams) {
    // ... (implementation from above)
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
// --- End Helper ---


const validatePut = [
    param('childId').isInt({ gt: 0 }),
    param('childItemId').isInt({ gt: 0 }),
    body('quantity').notEmpty().isInt({ gt: 0 }),
    body('base_catalog_item_id').optional().isInt({ gt: 0 }),
    // ... other body validations from your Express route
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
        next();
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
        next();
    }
];

export default async function handler(req, res) {
    const { childId: childIdFromQuery, childItemId: childItemIdFromQuery } = req.query;

    // Authentication and Ownership Check (common for PUT and DELETE)
    const authCheck = await getSessionAndVerifyChildOwnership(req, res, childIdFromQuery);
    if (!authCheck.authorized) {
        return res.status(authCheck.status).json({ error: authCheck.message });
    }
    const verifiedChildId = authCheck.childId; // Use this verified ID

    if (req.method === 'PUT') {
        // Apply validation middleware for PUT
        for (const middleware of validatePut) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => {
                middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        const childItemId = parseInt(childItemIdFromQuery, 10);
        // Your existing PUT logic
        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;

        try {
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

    } else if (req.method === 'DELETE') {
        // Apply validation middleware for DELETE
        for (const middleware of validateDelete) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => {
                middleware(req, res, (result) => { if (result instanceof Error) { errorOccurred = true; reject(result); } resolve(result); });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        const childItemId = parseInt(childItemIdFromQuery, 10);
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();
            // Your existing DELETE logic
            const [itemExistsRows] = await connection.query('SELECT child_item_id FROM child_items WHERE child_item_id = ? AND child_id = ?', [childItemId, verifiedChildId]);
            if (itemExistsRows.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'Item not found for this child.' }); }

            const [orderCheckRows] = await connection.query('SELECT COUNT(*) as orderCount FROM order_items WHERE source_child_item_id = ?', [childItemId]);
            const hasBeenOrdered = orderCheckRows[0].orderCount > 0;

            if (hasBeenOrdered) {
                const [updateResult] = await connection.query('UPDATE child_items SET is_active = 0 WHERE child_item_id = ?', [childItemId]);
                if (updateResult.affectedRows > 0) { await connection.commit(); return res.status(200).json({ message: 'Item deactivated (has been ordered).' }); }
                else { await connection.rollback(); return res.status(404).json({ error: 'Item not found or no change made.' }); }
            } else {
                await connection.query('DELETE FROM cart_contents WHERE source_child_item_id = ?', [childItemId]);
                const [deleteResult] = await connection.query('DELETE FROM child_items WHERE child_item_id = ?', [childItemId]);
                if (deleteResult.affectedRows > 0) { await connection.commit(); return res.status(200).json({ message: 'Item permanently deleted.' }); }
                else { await connection.rollback(); return res.status(404).json({ error: 'Item not found for deletion.' }); }
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error removing/deactivating item from child:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}