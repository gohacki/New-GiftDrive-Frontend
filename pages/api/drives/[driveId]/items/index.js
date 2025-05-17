// File: pages/api/drives/[driveId]/items/index.js
import { validationResult, body, query as queryValidator } from 'express-validator'; // Changed param to queryValidator
import { runMiddleware } from '@/lib/runMiddleware';
import pool from '@/config/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]';

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

// Validation chains
const getValidations = [
    queryValidator('driveId').isInt({ gt: 0 }).withMessage('Drive ID must be a positive integer.'), // USE queryValidator
];

const postValidations = [
    queryValidator('driveId').isInt({ gt: 0 }).withMessage('Drive ID must be a positive integer.'), // USE queryValidator
    body('quantity').notEmpty().isInt({ gt: 0 }).withMessage('Quantity must be a positive integer.'),
    body('base_catalog_item_id').notEmpty().isInt({ gt: 0 }).withMessage('Base catalog item ID is required and must be a positive integer.'),
    body('selected_rye_variant_id').notEmpty().isString().withMessage('Selected Rye Variant ID is required.'),
    body('selected_rye_marketplace').notEmpty().isString().withMessage('Selected Rye Marketplace is required.'),
    body('variant_display_name').optional({ checkFalsy: true }).isString(),
    body('variant_display_price').optional({ checkFalsy: true }).isFloat({ gt: -0.01 }),
    body('variant_display_photo').optional({ checkFalsy: true }).isURL(),
];


export default async function handler(req, res) {
    const { driveId: driveIdFromQuery } = req.query; // This is correct for accessing the value

    if (req.method === 'GET') {
        // Apply GET validations
        for (const validation of getValidations) {
            await runMiddleware(req, res, validation);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const driveId = parseInt(driveIdFromQuery, 10); // Use the value from req.query for your logic
        try {
            const [rows] = await pool.query(`
                SELECT
                  di.drive_item_id, di.drive_id, di.item_id, di.quantity AS needed,
                  di.selected_rye_variant_id, di.selected_rye_marketplace,
                  di.variant_display_name, di.variant_display_price, di.variant_display_photo,
                  i.name AS base_item_name, i.description AS base_item_description,
                  i.price AS base_item_price, i.image_url AS base_item_photo,
                  i.rye_product_id AS base_rye_product_id, i.marketplace AS base_marketplace,
                  i.is_rye_linked AS base_is_rye_linked,
                  COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.source_drive_item_id = di.drive_item_id), 0) AS purchased
                FROM drive_items di JOIN items i ON di.item_id = i.item_id
                WHERE di.drive_id = ? AND di.is_active = 1
            `, [driveId]);
            const items = rows.map(r => ({
                drive_item_id: r.drive_item_id, drive_id: r.drive_id, item_id: r.item_id,
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
        } catch (error) {
            console.error('Error fetching drive items:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

    } else if (req.method === 'POST') {
        const authCheck = await getSessionAndVerifyDriveOwnership(req, res, driveIdFromQuery);
        if (!authCheck.authorized) {
            return res.status(authCheck.status).json({ error: authCheck.message });
        }
        const driveId = authCheck.driveId;

        // Apply POST validations
        for (const validation of postValidations) {
            await runMiddleware(req, res, validation);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
                'SELECT drive_item_id FROM drive_items WHERE drive_id = ? AND item_id = ? AND selected_rye_variant_id = ? AND is_active = 1',
                [driveId, base_catalog_item_id, selected_rye_variant_id]
            );
            if (existingItem.length > 0) return res.status(409).json({ error: 'This specific item variant is already an active need.' });

            const [result] = await pool.query(
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
            const [newDriveItemRow] = await pool.query(
                `SELECT di.*, i.name as base_item_name, i.description as base_item_description, i.price as base_item_price, i.image_url as base_item_photo, i.rye_product_id as base_rye_product_id, i.marketplace as base_marketplace, i.is_rye_linked as base_is_rye_linked
                 FROM drive_items di JOIN items i ON di.item_id = i.item_id
                 WHERE di.drive_item_id = ?`, [newDriveItemId]
            );
            return res.status(201).json({ message: 'Item need added to drive successfully', driveItem: newDriveItemRow[0] });
        } catch (error) {
            console.error('Error adding item need to drive:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}