// File: pages/api/orders/finalize-rye-order.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
// No direct Rye API calls needed here, only DB operations based on Rye's successful submission.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = session.user.id;
    const { ryeCartId, successfulRyeOrders, amountInCents, currency } = req.body;

    // Input validation (same as Express)
    if (!ryeCartId || !Array.isArray(successfulRyeOrders) || successfulRyeOrders.length === 0 || amountInCents == null || !currency) {
        return res.status(400).json({ error: 'Missing required order finalization data.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check cart status and ownership (same as Express)
        const [cartRows] = await connection.query(
            'SELECT id, status FROM carts WHERE rye_cart_id = ? AND account_id = ? FOR UPDATE',
            [ryeCartId, userId]
        );
        if (cartRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cart record not found or not owned by user.' });
        }
        const localCart = cartRows[0];
        const localCartDbId = localCart.id;

        // Idempotency check for order finalization (same as Express)
        const ryeOrderIdsToCheck = successfulRyeOrders.map(o => o.ryeOrderId);
        if (ryeOrderIdsToCheck.length > 0) {
            const [existingOrderRows] = await connection.query(
                'SELECT order_id, primary_rye_order_id FROM orders WHERE primary_rye_order_id IN (?) AND account_id = ? LIMIT 1',
                [ryeOrderIdsToCheck, userId]
            );
            if (existingOrderRows.length > 0) {
                await connection.commit(); // Commit because this is a successful "already processed" state
                console.log(`Order ${existingOrderRows[0].order_id} already finalized for one of Rye IDs: ${ryeOrderIdsToCheck.join(', ')}.`);
                return res.status(200).json({ // 200 OK as it's not an error, just already done
                    message: 'Order already finalized.',
                    orderId: existingOrderRows[0].order_id,
                    ryeOrderId: existingOrderRows[0].primary_rye_order_id
                });
            }
        }

        if (localCart.status !== 'active') {
            await connection.rollback();
            return res.status(409).json({ error: `Cart status is '${localCart.status}'. Cannot finalize order.` });
        }

        // Pre-order_item insertion validation (CRITICAL CHECK - same logic as Express)
        const [cartItemsToValidate] = await connection.query(
            `SELECT cc.item_id, i.name AS item_name, cc.quantity AS quantity_in_cart,
                    cc.source_drive_item_id, cc.source_child_item_id
             FROM cart_contents cc JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ?`,
            [localCartDbId]
        );
        if (cartItemsToValidate.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Cart is empty, cannot finalize order.' });
        }
        for (const cartItem of cartItemsToValidate) {
            let quantity_needed, total_already_purchased_for_source;
            let source_id_value = cartItem.source_drive_item_id || cartItem.source_child_item_id;
            let source_table, source_pk_col, source_oi_col;

            if (cartItem.source_drive_item_id) {
                source_table = 'drive_items'; source_pk_col = 'drive_item_id'; source_oi_col = 'source_drive_item_id';
            } else if (cartItem.source_child_item_id) {
                source_table = 'child_items'; source_pk_col = 'child_item_id'; source_oi_col = 'source_child_item_id';
            } else {
                console.warn(`Cart item ${cartItem.item_id} in cart ${localCartDbId} lacks source ID. Skipping availability.`);
                continue;
            }
            const [sourceItemRows] = await connection.query(
                `SELECT quantity FROM ${source_table} WHERE ${source_pk_col} = ? AND is_active = 1 FOR UPDATE`,
                [source_id_value]
            );
            if (sourceItemRows.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: `Config error: Original need (ID: ${source_id_value} from ${source_table}) not found or inactive.` });
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
                // No need to update cart status here, as the transaction is rolled back.
                // The cart will remain 'active'.
                return res.status(409).json({
                    error: `Item "${cartItem.item_name || 'ID: ' + cartItem.item_id}" (Qty: ${cartItem.quantity_in_cart}) exceeds available stock (${quantity_available}). Max Needed: ${quantity_needed}, Purchased: ${total_already_purchased_for_source}. Review cart.`,
                    itemId: cartItem.item_id, requested: cartItem.quantity_in_cart,
                    available: quantity_available, itemName: cartItem.item_name
                });
            }
        }
        // End pre-order_item validation

        // Update cart status (same as Express)
        await connection.query(
            "UPDATE carts SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [localCartDbId]
        );

        // Insert into orders table (same as Express)
        const primaryRyeOrderIdForDb = successfulRyeOrders[0].ryeOrderId; // Assuming first one is primary
        const orderStatus = 'processing'; // Initial status
        const [orderInsertResult] = await connection.query(
            `INSERT INTO orders (account_id, cart_db_id, rye_cart_id, primary_rye_order_id, status, total_amount, currency, order_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [userId, localCartDbId, ryeCartId, primaryRyeOrderIdForDb, orderStatus, (amountInCents / 100), currency.toUpperCase()]
        );
        const newDbOrderId = orderInsertResult.insertId;

        // Insert into order_items table (same as Express)
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
        return res.status(201).json({
            message: 'Order finalized successfully!',
            orderId: newDbOrderId,
            ryeOrderId: primaryRyeOrderIdForDb,
        });

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("Rollback failed:", rbError); } }
        console.error(`Error finalizing Rye order for cart ${ryeCartId}:`, error);
        // Handle custom inventory error response (same as Express)
        if (error.statusCode === 409 && error.message && error.message.includes("exceeds available stock")) {
            return res.status(409).json({
                error: error.message, itemId: error.itemId,
                requested: error.requested, available: error.available, itemName: error.itemName
            });
        }
        return res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to finalize order.',
            details: error.details, // Consider removing details in production for security
            errorCode: error.errorCode
        });
    } finally {
        if (connection) connection.release();
    }
}