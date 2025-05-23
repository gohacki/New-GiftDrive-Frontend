// File: pages/api/children/[childId]/items/index.js
import { validationResult, body, param as queryValidator } from 'express-validator';
import { runMiddleware } from '@/lib/runMiddleware';
import pool from '@/config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]';
import { getChildItems } from '../../../../../lib/services/childService';

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

const validateGet = [
    queryValidator('childId').isInt({ gt: 0 }).withMessage('Child ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const validatePost = [
    queryValidator('childId').isInt({ gt: 0 }).withMessage('Child ID must be a positive integer.'),
    body('quantity').notEmpty().isInt({ gt: 0 }).withMessage('Quantity must be a positive integer.'),
    body('base_catalog_item_id').notEmpty().isInt({ gt: 0 }).withMessage('Base catalog item ID is required.'),
    body('selected_rye_variant_id').notEmpty().isString().withMessage('Selected Rye Variant ID is required.'),
    body('selected_rye_marketplace').notEmpty().isString().withMessage('Selected Rye Marketplace is required.'),
    body('variant_display_name').optional({ checkFalsy: true }).isString().trim(),
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


export default async function handler(req, res) {
    const { childId: childIdFromQuery } = req.query;

    if (req.method === 'GET') {
        for (const validation of validateGet) {
            let errorOccurred = false;
            await new Promise(resolve => validation(req, res, (result) => { if (result instanceof Error) errorOccurred = true; resolve(); }));
            if (errorOccurred || res.writableEnded) return;
        }
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const items = await getChildItems(childIdFromQuery);
            return res.status(200).json(items);
        } catch (err) {
            console.error('Error fetching items for child:', err);
            if (err.message.includes("Invalid Child ID")) {
                return res.status(400).json({ error: err.message });
            }
            return res.status(500).json({ error: 'Database error' });
        }

    } else if (req.method === 'POST') {
        const authCheck = await getSessionAndVerifyChildOwnership(req, res, childIdFromQuery);
        if (!authCheck.authorized) {
            return res.status(authCheck.status).json({ error: authCheck.message });
        }
        const childId = authCheck.childId;

        for (const validation of validatePost) {
            let errorOccurred = false;
            await new Promise(resolve => validation(req, res, (result) => { if (result instanceof Error) errorOccurred = true; resolve(); }));
            if (errorOccurred || res.writableEnded) return;
        }
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const {
            quantity, base_catalog_item_id, selected_rye_variant_id,
            selected_rye_marketplace, variant_display_name,
            variant_display_price, variant_display_photo
        } = req.body;

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // **NEW CHECK**: Verify the base catalog item is still active/linked
            const [itemStatusCheck] = await connection.query(
                'SELECT name, image_url, price, is_rye_linked FROM items WHERE item_id = ?',
                [base_catalog_item_id]
            );
            if (itemStatusCheck.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: `Base catalog item ID ${base_catalog_item_id} not found.` });
            }
            const baseItemDetails = itemStatusCheck[0];
            if (!baseItemDetails.is_rye_linked) {
                await connection.rollback();
                return res.status(400).json({ error: `Item "${baseItemDetails.name}" is currently not available for purchase and cannot be added as a child's need.` });
            }
            // **END NEW CHECK**

            // Use baseItemDetails fetched above
            const displayName = variant_display_name || baseItemDetails.name;
            const displayPrice = (variant_display_price !== null && variant_display_price !== undefined)
                ? parseFloat(variant_display_price)
                : (baseItemDetails.price !== null ? parseFloat(baseItemDetails.price) : null);
            const displayPhoto = variant_display_photo || baseItemDetails.image_url;

            const [existingItem] = await connection.query(
                'SELECT child_item_id FROM child_items WHERE child_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1',
                [childId, base_catalog_item_id, selected_rye_variant_id]
            );
            if (existingItem.length > 0) {
                await connection.rollback();
                return res.status(409).json({ error: 'This specific item variant is already an active need for this child.' });
            }

            const [result] = await connection.query(
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

            const [newChildItemRow] = await connection.query(
                `SELECT ci.*, 
                        i.name as base_item_name, i.description as base_item_description, 
                        i.price as base_item_price, i.image_url as base_item_photo, 
                        i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, 
                        i.is_rye_linked as base_is_rye_linked
                 FROM child_items ci 
                 JOIN items i ON ci.item_id = i.item_id
                 WHERE ci.child_item_id = ?`,
                [newChildItemId]
            );
            await connection.commit();
            return res.status(201).json({ message: 'Item need added to child successfully', childItem: newChildItemRow[0] });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error adding item need to child:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}