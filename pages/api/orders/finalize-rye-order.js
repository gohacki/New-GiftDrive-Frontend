// File: pages/api/orders/finalize-rye-order.js
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Adjusted path
import pool from "../../../config/database";
// No direct Rye API calls needed here, only DB operations based on Rye's successful submission.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { accountIdForDb, ryeCartId: retrievedRyeCartId, isGuest } = await getRequestCartInfo(req, res);

    const {
        ryeCartId: payloadRyeCartId, // Rye Cart ID from the frontend payload
        successfulRyeOrders,
        amountInCents,
        currency,
        // For guests, these will be passed from frontend
        guestFirstName, guestLastName, guestEmail
    } = req.body;

    // Input validation
    if (!payloadRyeCartId || !Array.isArray(successfulRyeOrders) || successfulRyeOrders.length === 0 || amountInCents == null || !currency) {
        return res.status(400).json({ error: 'Missing required order finalization data.' });
    }
    if (isGuest && (!guestEmail || !guestFirstName || !guestLastName)) {
        return res.status(400).json({ error: 'Guest details (email, name) are required for finalization.' });
    }
    // Ensure the Rye Cart ID from the payload matches the one from the session/cookie if available
    if (retrievedRyeCartId && payloadRyeCartId !== retrievedRyeCartId) {
        console.warn(`[API Finalize Order] Mismatch: Payload Rye Cart ID (${payloadRyeCartId}) vs Session/Cookie Rye Cart ID (${retrievedRyeCartId}). Prioritizing payload.`);
        // This could indicate a stale cookie or session issue, but we proceed with the ID from the RyePay submission.
    }
    const finalRyeCartIdToUse = payloadRyeCartId;


    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Critical: Find the local cart record (carts.id) using the RYE cart ID provided by the frontend after successful RyePay.
        // This is more reliable than relying solely on the cookie/session cart at this stage,
        // as the payment was authorized against `payloadRyeCartId`.
        const [cartRows] = await connection.query(
            'SELECT id, status, account_id, guest_session_token FROM carts WHERE rye_cart_id = ? FOR UPDATE',
            [finalRyeCartIdToUse]
        );

        if (cartRows.length === 0) {
            await connection.rollback();
            // This implies the cart was submitted to Rye, but we have no local record for it.
            // This is a serious inconsistency.
            console.error(`[API Finalize Order] CRITICAL: No local cart record found for Rye Cart ID ${finalRyeCartIdToUse} during finalization.`);
            return res.status(404).json({ error: 'Cart record not found for the submitted Rye cart. Please contact support.' });
        }
        const localCart = cartRows[0];
        const localCartDbId = localCart.id;

        // Authorization check: If the cart has an account_id, it must match the logged-in user (if any).
        // If it's a guest cart (account_id IS NULL), then it can be finalized by a guest session or even a logged-in user (less common).
        if (localCart.account_id && (!accountIdForDb || localCart.account_id !== accountIdForDb)) {
            await connection.rollback();
            console.warn(`[API Finalize Order] Authorization failed: Cart ${localCartDbId} (Rye: ${finalRyeCartIdToUse}) belongs to account ${localCart.account_id}, but current session is for ${accountIdForDb || 'guest'}.`);
            return res.status(403).json({ error: 'Cart does not belong to the current user.' });
        }
        // If localCart.guest_session_token exists, ideally it should match the incoming guest token if the current session is a guest one.
        // However, since payment is confirmed, we prioritize finalization.

        // Idempotency check
        const ryeOrderIdsToCheck = successfulRyeOrders.map(o => o.ryeOrderId);
        if (ryeOrderIdsToCheck.length > 0) {
            const [existingOrderRows] = await connection.query(
                'SELECT order_id, primary_rye_order_id FROM orders WHERE primary_rye_order_id IN (?) AND cart_db_id = ? LIMIT 1',
                [ryeOrderIdsToCheck, localCartDbId]
            );
            if (existingOrderRows.length > 0) {
                await connection.commit();
                return res.status(200).json({
                    message: 'Order already finalized.',
                    orderId: existingOrderRows[0].order_id,
                    ryeOrderId: existingOrderRows[0].primary_rye_order_id
                });
            }
        }

        if (localCart.status !== 'active') {
            await connection.rollback();
            return res.status(409).json({ error: `Cart status is '${localCart.status}'. Cannot finalize order again.` });
        }

        // --- Pre-order_item insertion validation (inventory check) ---
        const [cartItemsToValidate] = await connection.query(
            `SELECT cc.item_id, i.name AS item_name, cc.quantity AS quantity_in_cart,
                    cc.source_drive_item_id, cc.source_child_item_id
             FROM cart_contents cc JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ?`,
            [localCartDbId]
        );
        if (cartItemsToValidate.length === 0 && successfulRyeOrders.length > 0) { // Rye order exists but local cart empty
            await connection.rollback();
            console.error(`[API Finalize Order] CRITICAL: Local cart ${localCartDbId} for Rye cart ${finalRyeCartIdToUse} is empty, but Rye orders exist.`)
            return res.status(400).json({ error: 'Local cart is empty, cannot finalize. Possible data inconsistency.' });
        }
        for (const cartItem of cartItemsToValidate) {
            // ... (Your existing inventory validation logic based on source_drive_item_id or source_child_item_id)
            // This must pass before proceeding. If it fails, rollback and return 409.
            let quantity_needed, total_already_purchased_for_source;
            let source_id_value = cartItem.source_drive_item_id || cartItem.source_child_item_id;
            let source_table, source_pk_col, source_oi_col;

            if (cartItem.source_drive_item_id) {
                source_table = 'drive_items'; source_pk_col = 'drive_item_id'; source_oi_col = 'source_drive_item_id';
            } else if (cartItem.source_child_item_id) {
                source_table = 'child_items'; source_pk_col = 'child_item_id'; source_oi_col = 'source_child_item_id';
            } else {
                console.warn(`Cart item ${cartItem.item_id} lacks source ID. Skipping availability.`);
                continue;
            }
            const [sourceItemRows] = await connection.query(
                `SELECT quantity FROM ${source_table} WHERE ${source_pk_col} = ? AND is_active = 1 FOR UPDATE`,
                [source_id_value]
            );
            if (sourceItemRows.length === 0) {
                await connection.rollback();
                throw { statusCode: 400, message: `Original need (ID: ${source_id_value} from ${source_table}) not found or inactive.` };
            }
            quantity_needed = sourceItemRows[0].quantity;
            const [purchasedSumRows] = await connection.query(
                `SELECT COALESCE(SUM(quantity), 0) AS total_purchased FROM order_items WHERE ${source_oi_col} = ?`,
                [source_id_value]
            );
            total_already_purchased_for_source = purchasedSumRows[0].total_purchased;
            const quantity_available = quantity_needed - total_already_purchased_for_source;
            if (cartItem.quantity_in_cart > quantity_available) {
                await connection.rollback();
                throw {
                    statusCode: 409,
                    message: `Item "${cartItem.item_name || 'ID: ' + cartItem.item_id}" (Qty: ${cartItem.quantity_in_cart}) exceeds available stock (${quantity_available}).`,
                    itemId: cartItem.item_id, requested: cartItem.quantity_in_cart,
                    available: quantity_available, itemName: cartItem.item_name
                };
            }
        }
        // --- End pre-order_item validation ---

        await connection.query(
            "UPDATE carts SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [localCartDbId]
        );

        const primaryRyeOrderIdForDb = successfulRyeOrders[0].ryeOrderId;
        const orderStatus = 'processing';
        const [orderInsertResult] = await connection.query(
            `INSERT INTO orders (account_id, cart_db_id, rye_cart_id, primary_rye_order_id, status, total_amount, currency, order_date, guest_first_name, guest_last_name, guest_email)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [
                localCart.account_id, // Use account_id from the cart record itself
                localCartDbId,
                finalRyeCartIdToUse,
                primaryRyeOrderIdForDb,
                orderStatus,
                (amountInCents / 100),
                currency.toUpperCase(),
                localCart.account_id ? null : guestFirstName, // Store guest details if cart had no account_id
                localCart.account_id ? null : guestLastName,
                localCart.account_id ? null : guestEmail
            ]
        );
        const newDbOrderId = orderInsertResult.insertId;

        // Insert into order_items table
        const [cartContentRowsForOrderItems] = await connection.query(
            `SELECT cc.item_id, cc.quantity, cc.child_id AS unique_child_fk_id, cc.drive_id AS parent_drive_fk_id,
                    cc.source_drive_item_id, cc.source_child_item_id, i.price AS item_price
             FROM cart_contents cc JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ?`,
            [localCartDbId]
        );
        if (cartContentRowsForOrderItems.length > 0) {
            const orderItemsData = cartContentRowsForOrderItems.map(item => [
                newDbOrderId, item.item_id, item.unique_child_fk_id, item.parent_drive_fk_id,
                item.quantity, item.item_price, item.source_drive_item_id, item.source_child_item_id
            ]);
            await connection.query(
                'INSERT INTO order_items (order_id, item_id, child_id, drive_id, quantity, price, source_drive_item_id, source_child_item_id) VALUES ?',
                [orderItemsData]
            );
        }

        await connection.commit();
        console.log(`[API Finalize Order] Order ${newDbOrderId} finalized for Rye Cart ID ${finalRyeCartIdToUse}.`);
        return res.status(201).json({
            message: 'Order finalized successfully!',
            orderId: newDbOrderId,
            ryeOrderId: primaryRyeOrderIdForDb,
        });

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Finalize Order] Rollback failed:", rbError); } }
        console.error(`Error finalizing Rye order for cart ${payloadRyeCartId}:`, error);
        if (error.statusCode === 409 && error.message && error.message.includes("exceeds available stock")) {
            return res.status(409).json({
                error: error.message, itemId: error.itemId,
                requested: error.requested, available: error.available, itemName: error.itemName
            });
        }
        return res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to finalize order.',
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    } finally {
        if (connection) connection.release();
    }
}