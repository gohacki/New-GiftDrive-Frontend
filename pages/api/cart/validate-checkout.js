// File: pages/api/cart/validate-checkout.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
// No Rye helpers needed for this specific route as it's purely DB validation

// Helper function (same as before, or move to a shared util)
async function getAuthAndCartInfo(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return { user: null, ryeCartId: null, cartDbId: null, errorResponse: { status: 401, body: { message: "Not authenticated" } } };
    }
    const user = session.user;
    let ryeCartId = null;
    let cartDbId = null;
    try {
        const [cartRows] = await pool.query(
            'SELECT id, rye_cart_id FROM carts WHERE account_id = ? AND status = ? LIMIT 1',
            [user.id, 'active']
        );
        if (cartRows.length > 0) {
            ryeCartId = cartRows[0].rye_cart_id;
            cartDbId = cartRows[0].id;
        }
        return { user, ryeCartId, cartDbId, errorResponse: null };
    } catch (dbError) {
        console.error('API Route: Error fetching active user cart:', dbError);
        return { user, ryeCartId: null, cartDbId: null, errorResponse: { status: 500, body: { message: "Database error fetching cart info." } } };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') { // Or GET if you prefer for validation without side effects
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { user, cartDbId, errorResponse: authError } = await getAuthAndCartInfo(req, res);

    if (authError) {
        return res.status(authError.status).json(authError.body);
    }
    if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (!cartDbId) {
        return res.status(404).json({ error: "No active cart found for validation." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        // No transaction needed for read-only validation, but using one doesn't hurt consistency if reads need to be atomic.
        // await connection.beginTransaction(); // Optional for read-only

        const [cartItemsToValidate] = await connection.query(
            `SELECT
                cc.item_id,
                i.name AS item_name,
                cc.quantity AS quantity_in_cart,
                cc.source_drive_item_id,
                cc.source_child_item_id
             FROM cart_contents cc
             JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ?`,
            [cartDbId]
        );

        if (cartItemsToValidate.length === 0) {
            // await connection.commit(); // Optional if beginTransaction was used
            return res.status(200).json({ isValid: true, issues: [] });
        }

        let validationIssues = [];

        for (const cartItem of cartItemsToValidate) {
            let quantity_needed;
            let total_already_purchased_for_source;
            let source_id_value = cartItem.source_drive_item_id || cartItem.source_child_item_id;
            let source_table, source_pk_col, source_oi_col_for_orders;

            if (cartItem.source_drive_item_id) {
                source_table = 'drive_items';
                source_pk_col = 'drive_item_id';
                source_oi_col_for_orders = 'source_drive_item_id';
            } else if (cartItem.source_child_item_id) {
                source_table = 'child_items';
                source_pk_col = 'child_item_id';
                source_oi_col_for_orders = 'source_child_item_id';
            } else {
                console.warn(`[API Validate Checkout] Cart item (ID: ${cartItem.item_id}, Name: ${cartItem.item_name}) in cart ${cartDbId} lacks a source_drive_item_id or source_child_item_id. Skipping availability check for this item.`);
                continue;
            }

            const [sourceItemRows] = await connection.query(
                `SELECT quantity FROM ${source_table} WHERE ${source_pk_col} = ? AND is_active = 1`, // Added is_active check
                [source_id_value]
            );

            if (sourceItemRows.length === 0) {
                validationIssues.push({
                    itemId: cartItem.item_id,
                    itemName: cartItem.item_name,
                    error: `Original need (Source: ${source_table}, ID: ${source_id_value}) not found or is inactive.`
                });
                continue;
            }
            quantity_needed = sourceItemRows[0].quantity;

            const [purchasedSumRows] = await connection.query(
                `SELECT COALESCE(SUM(quantity), 0) AS total_purchased
                 FROM order_items
                 WHERE ${source_oi_col_for_orders} = ?`,
                [source_id_value]
            );
            total_already_purchased_for_source = purchasedSumRows[0].total_purchased;
            const quantity_available = quantity_needed - total_already_purchased_for_source;

            if (cartItem.quantity_in_cart > quantity_available) {
                validationIssues.push({
                    itemId: cartItem.item_id,
                    itemName: cartItem.item_name,
                    error: `Requested quantity (${cartItem.quantity_in_cart}) exceeds available stock (${quantity_available}) for item from ${source_table} ID ${source_id_value}. Max Needed: ${quantity_needed}, Already Purchased: ${total_already_purchased_for_source}.`,
                    requested: cartItem.quantity_in_cart,
                    available: quantity_available
                });
            }
        }

        // await connection.commit(); // Optional

        if (validationIssues.length > 0) {
            console.warn("[API Validate Checkout] Validation issues found:", validationIssues);
            return res.status(400).json({ isValid: false, issues: validationIssues });
        }

        console.log("[API Validate Checkout] Cart validation successful.");
        return res.status(200).json({ isValid: true, issues: [] });

    } catch (error) {
        // if (connection) await connection.rollback(); // Optional if beginTransaction was used
        console.error('Error validating cart for checkout:', error);
        return res.status(500).json({ error: 'Internal server error during cart validation.' });
    } finally {
        if (connection) connection.release();
    }
}