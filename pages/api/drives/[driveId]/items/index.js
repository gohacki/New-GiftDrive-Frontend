// File: pages/api/drives/[driveId]/items/index.js
import { validationResult, body, query as queryValidator } from 'express-validator'; // param renamed to queryValidator
import { runMiddleware } from '@/lib/runMiddleware';
import pool from '@/config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]';
import { getDriveSpecificItems } from '../../../../../lib/services/driveService';

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
        console.error("Error in getSessionAndVerifyDriveOwnership:", error);
        return { authorized: false, user, status: 500, message: "Internal server error validating drive ownership." };
    }
}

const getValidations = [
    queryValidator('driveId').isInt({ gt: 0 }).withMessage('Drive ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            cb();
        });
        if (!res.writableEnded) next();
    }
];

const postValidations = [
    queryValidator('driveId').isInt({ gt: 0 }).withMessage('Drive ID must be a positive integer.'),
    body('quantity').notEmpty().isInt({ gt: 0 }).withMessage('Quantity must be a positive integer.'),
    body('base_catalog_item_id').notEmpty().isInt({ gt: 0 }).withMessage('Base catalog item ID is required and must be a positive integer.'),
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
    const { driveId: driveIdFromQuery } = req.query;

    if (req.method === 'GET') {
        for (const validation of getValidations) {
            let errorOccurred = false;
            await new Promise(resolve => validation(req, res, (result) => { if (result instanceof Error) errorOccurred = true; resolve(); }));
            if (errorOccurred || res.writableEnded) return;
        }
        // No need to call validationResult again if runMiddleware handles it
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const items = await getDriveSpecificItems(driveIdFromQuery);
            return res.status(200).json(items);
        } catch (error) {
            console.error('Error fetching drive items:', error);
            if (error.message.includes("Invalid Drive ID")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }

    } else if (req.method === 'POST') {
        const authCheck = await getSessionAndVerifyDriveOwnership(req, res, driveIdFromQuery);
        if (!authCheck.authorized) {
            return res.status(authCheck.status).json({ error: authCheck.message });
        }
        const driveId = authCheck.driveId;

        for (const validation of postValidations) {
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
                return res.status(400).json({ error: `Item "${baseItemDetails.name}" is currently not available for purchase and cannot be added as a drive need.` });
            }
            // **END NEW CHECK**

            // Use baseItemDetails fetched above
            const displayName = variant_display_name || baseItemDetails.name;
            const displayPrice = (variant_display_price !== null && variant_display_price !== undefined)
                ? parseFloat(variant_display_price)
                : (baseItemDetails.price !== null ? parseFloat(baseItemDetails.price) : null);
            const displayPhoto = variant_display_photo || baseItemDetails.image_url;

            const [existingItem] = await connection.query(
                'SELECT drive_item_id FROM drive_items WHERE drive_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1',
                [driveId, base_catalog_item_id, selected_rye_variant_id]
            );
            if (existingItem.length > 0) {
                await connection.rollback();
                return res.status(409).json({ error: 'This specific item variant is already an active need for this drive.' });
            }

            const [result] = await connection.query(
                `INSERT INTO drive_items (
                   drive_id, item_id, base_catalog_item_id, quantity,
                   selected_rye_variant_id, selected_rye_marketplace,
                   variant_display_name, variant_display_price, variant_display_photo,
                   is_active
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    driveId, base_catalog_item_id, base_catalog_item_id, quantity,
                    selected_rye_variant_id, selected_rye_marketplace.toUpperCase(),
                    displayName, displayPrice, displayPhoto
                ]
            );
            const newDriveItemId = result.insertId;

            // Fetch the newly created item along with joined base item details for the response
            const [newDriveItemRow] = await connection.query(
                `SELECT di.*, 
                        i.name as base_item_name, i.description as base_item_description, 
                        i.price as base_item_price, i.image_url as base_item_photo, 
                        i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, 
                        i.is_rye_linked as base_is_rye_linked
                 FROM drive_items di 
                 JOIN items i ON di.item_id = i.item_id
                 WHERE di.drive_item_id = ?`,
                [newDriveItemId]
            );
            await connection.commit();
            return res.status(201).json({ message: 'Item need added to drive successfully', driveItem: newDriveItemRow[0] });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error adding item need to drive:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }

    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}