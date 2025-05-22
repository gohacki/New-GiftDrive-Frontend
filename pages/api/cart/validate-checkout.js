// File: pages/api/cart/validate-checkout.js
// import { getServerSession } from "next-auth/next"; // No longer needed directly here if getRequestCartInfo handles session internally
// import { authOptions } from "../auth/[...nextauth]"; // No longer needed directly here
import pool from "../../../config/database";
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Import the correct helper

// Remove the old, local getAuthAndCartInfo function:
// async function getAuthAndCartInfo(req, res) { ... } // DELETE THIS FUNCTION

export default async function handler(req, res) {
    if (req.method !== 'POST') { // Or GET if you prefer for validation without side effects
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Use the correct helper that handles both authenticated users and guests
    const { user, accountIdForDb, cartDbId, isGuest, guestCartToken } = await getRequestCartInfo(req, res);

    // Improved check for cartDbId based on user type
    if (!cartDbId) {
        if (isGuest && guestCartToken) {
            console.warn(`[API Validate Checkout] Guest with token ${guestCartToken} has no active cartDbId.`);
            return res.status(404).json({ error: "No active cart found for your session. Your cart might have expired or been cleared." });
        } else if (isGuest && !guestCartToken) {
            console.warn(`[API Validate Checkout] Guest has no cart token and no active cartDbId.`);
            return res.status(404).json({ error: "No active cart found. Please add items to your cart." });
        } else if (!isGuest && !accountIdForDb && user) { // Authenticated user but no accountIdForDb (edge case)
            console.error(`[API Validate Checkout] Authenticated user but no accountIdForDb. Session user:`, user);
            return res.status(401).json({ message: "Authentication error: User ID missing from session." });
        } else if (!isGuest && accountIdForDb) { // Authenticated user with ID but no cart
            console.log(`[API Validate Checkout] User ${accountIdForDb} has no active cartDbId.`);
            return res.status(404).json({ error: "No active cart found for your account." });
        }
        // General fallback if somehow cartDbId is missing without hitting above conditions.
        // Also handles cases where user might be null due to session issue not caught by getRequestCartInfo,
        // though getRequestCartInfo aims to provide clear states.
        if (!user && !isGuest) { // Should not happen if getRequestCartInfo is working as expected.
            return res.status(401).json({ message: "Not authenticated" });
        }
        return res.status(404).json({ error: "No active cart found for validation." });
    }

    let connection;
    try {
        connection = await pool.getConnection();

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
                `SELECT quantity FROM ${source_table} WHERE ${source_pk_col} = ? AND is_active = 1`,
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

        if (validationIssues.length > 0) {
            console.warn("[API Validate Checkout] Validation issues found:", validationIssues);
            return res.status(400).json({ isValid: false, issues: validationIssues });
        }

        console.log("[API Validate Checkout] Cart validation successful.");
        return res.status(200).json({ isValid: true, issues: [] });

    } catch (error) {
        console.error('Error validating cart for checkout:', error);
        return res.status(500).json({ error: 'Internal server error during cart validation.' });
    } finally {
        if (connection) connection.release();
    }
}