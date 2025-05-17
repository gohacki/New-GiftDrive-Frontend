// File: pages/api/children/[childId]/items/index.js
import { validationResult, body, param } from 'express-validator'; // Still useful for validation
import { runMiddleware } from '../../../../lib/runMiddleware'; // Helper to run express-validator
import pool from '../../../../config/database';
// getSessionAndVerifyChildOwnership helper from above

// --- Re-define getSessionAndVerifyChildOwnership here or import from a shared utils ---
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";

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


// Express-validator middleware for Next.js
const validateGet = [
    param('childId').isInt({ gt: 0 }).withMessage('Child ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            cb(); // Proceed if no errors
        });
        next();
    }
];

const validatePost = [
    param('childId').isInt({ gt: 0 }).withMessage('Child ID must be a positive integer.'),
    body('quantity').notEmpty().isInt({ gt: 0 }),
    body('base_catalog_item_id').notEmpty().isInt({ gt: 0 }),
    body('selected_rye_variant_id').notEmpty().isString(),
    body('selected_rye_marketplace').notEmpty().isString(),
    body('variant_display_name').optional({ checkFalsy: true }).isString(),
    body('variant_display_price').optional({ checkFalsy: true }).isFloat({ gt: -0.01 }),
    body('variant_display_photo').optional({ checkFalsy: true }).isURL(),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        next();
    }
];


export default async function handler(req, res) {
    const { childId: childIdFromQuery } = req.query; // childId from URL path

    if (req.method === 'GET') {
        // Apply validation middleware for GET
        for (const middleware of validateGet) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => {
                middleware(req, res, (result) => {
                    if (result instanceof Error) {
                        errorOccurred = true;
                        reject(result); // If middleware sends an error
                    }
                    resolve(result);
                });
            });
            if (errorOccurred || res.writableEnded) return; // Stop if validation failed and sent response
        }

        // Note: GET for child items is usually public, so ownership check might not be needed here
        // If it is, call getSessionAndVerifyChildOwnership
        const childId = parseInt(childIdFromQuery, 10);

        try {
            // Your existing GET logic for fetching items
            const [rows] = await pool.query(`
                SELECT
                  ci.child_item_id, ci.child_id, ci.item_id, ci.quantity AS needed,
                  ci.selected_rye_variant_id, ci.selected_rye_marketplace,
                  ci.variant_display_name, ci.variant_display_price, ci.variant_display_photo,
                  i.name AS base_item_name, i.description AS base_item_description,
                  i.price AS base_item_price, i.image_url AS base_item_photo,
                  i.rye_product_id AS base_rye_product_id, i.marketplace AS base_marketplace,
                  i.is_rye_linked AS base_is_rye_linked,
                  COALESCE((
                    SELECT SUM(oi.quantity) FROM order_items oi
                    WHERE oi.source_child_item_id = ci.child_item_id
                  ), 0) AS purchased
                FROM child_items ci
                JOIN items i ON ci.item_id = i.item_id
                WHERE ci.child_id = ? AND ci.is_active = 1
            `, [childId]);

            const items = rows.map(r => ({ /* ... same mapping as your Express route ... */
                child_item_id: r.child_item_id, child_id: r.child_id, item_id: r.item_id,
                needed: Number(r.needed) || 0, purchased: Number(r.purchased) || 0,
                remaining: Math.max(0, (Number(r.needed) || 0) - (Number(r.purchased) || 0)),
                selected_rye_variant_id: r.selected_rye_variant_id, selected_rye_marketplace: r.selected_rye_marketplace,
                variant_display_name: r.variant_display_name,
                variant_display_price: r.variant_display_price !== null ? parseFloat(r.variant_display_price) : null,
                variant_display_photo: r.variant_display_photo, base_item_name: r.base_item_name,
                base_item_photo: r.base_item_photo,
                base_item_price: r.base_item_price !== null ? parseFloat(r.base_item_price) : null,
                base_item_description: r.base_item_description, base_rye_product_id: r.base_rye_product_id,
                base_marketplace: r.base_marketplace, is_rye_linked: Boolean(r.base_is_rye_linked),
            }));
            return res.status(200).json(items);
        } catch (err) {
            console.error('Error fetching items for child:', err);
            return res.status(500).json({ error: 'Database error' });
        }

    } else if (req.method === 'POST') {
        // Authentication and Ownership Check
        const authCheck = await getSessionAndVerifyChildOwnership(req, res, childIdFromQuery);
        if (!authCheck.authorized) {
            return res.status(authCheck.status).json({ error: authCheck.message });
        }
        const childId = authCheck.childId; // Use verified childId

        // Apply validation middleware for POST
        for (const middleware of validatePost) {
            let errorOccurred = false;
            await new Promise((resolve, reject) => {
                middleware(req, res, (result) => {
                    if (result instanceof Error) { errorOccurred = true; reject(result); }
                    resolve(result);
                });
            });
            if (errorOccurred || res.writableEnded) return;
        }

        // Your existing POST logic
        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;

        try {
            const [itemCheck] = await pool.query('SELECT name, image_url, price FROM items WHERE item_id = ?', [base_catalog_item_id]);
            if (itemCheck.length === 0) return res.status(404).json({ error: `Base catalog item ID ${base_catalog_item_id} not found.` });
            const baseItemDetails = itemCheck[0];

            const displayName = variant_display_name || baseItemDetails.name;
            const displayPrice = (variant_display_price !== null && variant_display_price !== undefined) ? parseFloat(variant_display_price) : (baseItemDetails.price !== null ? parseFloat(baseItemDetails.price) : null);
            const displayPhoto = variant_display_photo || baseItemDetails.image_url;

            const [existingItem] = await pool.query(
                'SELECT child_item_id FROM child_items WHERE child_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1',
                [childId, base_catalog_item_id, selected_rye_variant_id]
            );
            if (existingItem.length > 0) return res.status(409).json({ error: 'This specific item variant is already an active need for this child.' });

            const [result] = await pool.query(
                `INSERT INTO child_items (
                   child_id, item_id, base_catalog_item_id, quantity,
                   selected_rye_variant_id, selected_rye_marketplace,
                   variant_display_name, variant_display_price, variant_display_photo,
                   is_active
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    childId, base_catalog_item_id, base_catalog_item_id, quantity,
                    selected_rye_variant_id, selected_rye_marketplace.toUpperCase(),
                    displayName, displayPrice, displayPhoto
                ]
            );
            const newChildItemId = result.insertId;

            const [newChildItemRow] = await pool.query(
                `SELECT ci.*, i.name as base_item_name, i.description as base_item_description, i.price as base_item_price, i.image_url as base_item_photo, i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, i.is_rye_linked as base_is_rye_linked
                 FROM child_items ci JOIN items i ON ci.item_id = i.item_id
                 WHERE ci.child_item_id = ?`,
                [newChildItemId]
            );
            return res.status(201).json({ message: 'Item need added to child successfully', childItem: newChildItemRow[0] });
        } catch (error) {
            console.error('Error adding item need to child:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}