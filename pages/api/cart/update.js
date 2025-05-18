// File: pages/api/cart/update.js
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Adjusted path
import { executeGraphQL, logApiError, DELETE_CART_ITEMS_MUTATION, UPDATE_CART_ITEMS_MUTATION } from "../../../lib/ryeHelpers";
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { ryeCartId, cartDbId } = await getRequestCartInfo(req, res);

    if (!ryeCartId || !cartDbId) {
        return res.status(404).json({ error: 'No active cart found to update.' });
    }

    const { itemId: ryeItemId, marketplace, quantity } = req.body;
    const newQuantity = parseInt(quantity, 10);

    if (!ryeItemId || !marketplace || !['AMAZON', 'SHOPIFY'].includes(marketplace.toUpperCase())) {
        return res.status(400).json({ error: 'Valid Rye Item ID and Marketplace are required.' });
    }
    if (quantity == null || !Number.isInteger(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ error: 'Valid non-negative integer quantity is required.' });
    }

    const targetMarketplace = marketplace.toUpperCase();
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [cartContentRows] = await connection.query(
            `SELECT cc.cart_content_id, cc.item_id, i.name AS item_name,
                    cc.source_drive_item_id, cc.source_child_item_id
             FROM cart_contents cc
             JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ?
               AND i.marketplace = ?
               AND (
                    (i.marketplace = 'AMAZON' AND i.rye_product_id = ?) OR
                    (i.marketplace = 'SHOPIFY' AND i.rye_variant_id = ?)
                   )
             LIMIT 1`,
            [cartDbId, targetMarketplace, ryeItemId, ryeItemId]
        );
        const cartContentToUpdate = cartContentRows[0];

        if (!cartContentToUpdate) {
            await connection.rollback();
            console.warn(`[API Cart Update] No matching cart_content found for Rye ID ${ryeItemId}.`);
            return res.status(404).json({ error: 'Item not found in your local cart to update.' });
        }

        let updatedCartFromRye;

        if (newQuantity === 0) {
            const itemsToDeleteRye = targetMarketplace === 'SHOPIFY'
                ? { shopifyProducts: [{ variantId: ryeItemId }] }
                : { amazonProducts: [{ productId: ryeItemId }] };
            console.log(`[API Cart Update] Quantity is 0. Removing item ${ryeItemId} from Rye cart ${ryeCartId}`);
            const result = await executeGraphQL(DELETE_CART_ITEMS_MUTATION, { input: { id: ryeCartId, items: itemsToDeleteRye } }, req);
            updatedCartFromRye = result.data?.deleteCartItems?.cart;
            const removeErrors = result.data?.deleteCartItems?.errors;
            if (removeErrors?.length) {
                await connection.rollback();
                const err = new Error(removeErrors[0].message);
                err.statusCode = removeErrors[0].extensions?.statusCode || 400; throw err;
            }
            if (!updatedCartFromRye) {
                await connection.rollback();
                throw new Error("Rye API did not return cart after item removal for quantity update.");
            }
        } else {
            // --- Availability Check for Quantity Increase ---
            if (cartContentToUpdate.source_drive_item_id || cartContentToUpdate.source_child_item_id) {
                let source_table_for_check, source_pk_col_for_check, source_oi_col_for_orders_check;
                let source_id_value_for_check = cartContentToUpdate.source_drive_item_id || cartContentToUpdate.source_child_item_id;

                if (cartContentToUpdate.source_drive_item_id) {
                    source_table_for_check = 'drive_items'; source_pk_col_for_check = 'drive_item_id'; source_oi_col_for_orders_check = 'source_drive_item_id';
                } else { // child_item
                    source_table_for_check = 'child_items'; source_pk_col_for_check = 'child_item_id'; source_oi_col_for_orders_check = 'source_child_item_id';
                }
                const [sourceItemRows] = await connection.query(
                    `SELECT quantity FROM ${source_table_for_check} WHERE ${source_pk_col_for_check} = ? AND is_active = 1 FOR UPDATE`,
                    [source_id_value_for_check]
                );
                if (sourceItemRows.length === 0) {
                    await connection.rollback();
                    throw new Error(`Original item need for "${cartContentToUpdate.item_name}" not found or inactive.`);
                }
                const quantity_needed_from_source = sourceItemRows[0].quantity;
                const [purchasedSumRows] = await connection.query(
                    `SELECT COALESCE(SUM(quantity), 0) AS total_purchased FROM order_items WHERE ${source_oi_col_for_orders_check} = ?`,
                    [source_id_value_for_check]
                );
                const total_already_purchased_globally = purchasedSumRows[0].total_purchased;
                const quantity_available_globally = quantity_needed_from_source - total_already_purchased_globally;
                if (newQuantity > quantity_available_globally) {
                    await connection.rollback();
                    return res.status(400).json({ error: `Requested quantity (${newQuantity}) for "${cartContentToUpdate.item_name}" exceeds available stock (${quantity_available_globally}). Max Needed: ${quantity_needed_from_source}, Already Purchased: ${total_already_purchased_globally}.` });
                }
            }
            // --- End Availability Check ---

            const itemsToUpdateRye = targetMarketplace === 'SHOPIFY'
                ? { shopifyCartItemsInput: [{ variantId: ryeItemId, quantity: newQuantity }] }
                : { amazonCartItemsInput: [{ productId: ryeItemId, quantity: newQuantity }] };
            console.log(`[API Cart Update] Updating item ${ryeItemId} quantity to ${newQuantity} in Rye cart ${ryeCartId}`);
            const result = await executeGraphQL(UPDATE_CART_ITEMS_MUTATION, { input: { id: ryeCartId, items: itemsToUpdateRye } }, req);
            updatedCartFromRye = result.data?.updateCartItems?.cart;
            const updateErrors = result.data?.updateCartItems?.errors;
            if (updateErrors?.length) {
                await connection.rollback();
                const err = new Error(updateErrors[0].message);
                err.statusCode = updateErrors[0].extensions?.statusCode || 400; throw err;
            }
            if (!updatedCartFromRye) {
                await connection.rollback();
                throw new Error("Rye API did not return cart after item quantity update.");
            }
        }

        // Update local cart_contents table
        if (newQuantity === 0) {
            console.log(`[API Cart Update] Removing cart_content_id ${cartContentToUpdate.cart_content_id} from local DB.`);
            await connection.query('DELETE FROM cart_contents WHERE cart_content_id = ?', [cartContentToUpdate.cart_content_id]);
        } else {
            console.log(`[API Cart Update] Updating quantity to ${newQuantity} for cart_content_id ${cartContentToUpdate.cart_content_id} in local DB.`);
            await connection.query('UPDATE cart_contents SET quantity = ? WHERE cart_content_id = ?', [newQuantity, cartContentToUpdate.cart_content_id]);
        }
        await connection.commit();

        // Augment and return
        let augmentedCartResponse = updatedCartFromRye;
        if (cartDbId && augmentedCartResponse.stores) {
            const [localAugmentationData] = await pool.query(
                `SELECT
                   cc.item_id AS local_base_item_id,
                   cc.source_drive_item_id,
                   cc.source_child_item_id,
                   COALESCE(di.variant_display_name, ci.variant_display_name, i.name) as giftdrive_display_name,
                   COALESCE(di.variant_display_photo, ci.variant_display_photo, i.image_url) as giftdrive_display_photo,
                   COALESCE(di.variant_display_price, ci.variant_display_price, i.price) as giftdrive_display_price,
                   i.name AS giftdrive_base_product_name,
                   i.marketplace AS item_marketplace,
                   COALESCE(di.selected_rye_variant_id, ci.selected_rye_variant_id) as effective_rye_id_for_purchase
                 FROM cart_contents cc
                 JOIN items i ON cc.item_id = i.item_id
                 LEFT JOIN drive_items di ON cc.source_drive_item_id = di.drive_item_id
                 LEFT JOIN child_items ci ON cc.source_child_item_id = ci.child_item_id
                 WHERE cc.cart_id = ?`,
                [cartDbId]
            );
            if (localAugmentationData.length > 0) {
                augmentedCartResponse.stores.forEach(store => {
                    store.cartLines?.forEach(line => {
                        const ryeLineItemIdInRyeCart = store.__typename === 'ShopifyStore' ? line.variant?.id : line.product?.id;
                        const storeMarketplace = store.store === 'amazon' ? 'AMAZON' : 'SHOPIFY';
                        const matchingLocalInfo = localAugmentationData.find(localData =>
                            localData.effective_rye_id_for_purchase === ryeLineItemIdInRyeCart &&
                            localData.item_marketplace.toUpperCase() === storeMarketplace
                        );
                        if (matchingLocalInfo) {
                            line.giftdrive_base_product_name = matchingLocalInfo.giftdrive_base_product_name;
                            line.giftdrive_variant_details_text = matchingLocalInfo.giftdrive_display_name;
                            line.giftdrive_display_photo = matchingLocalInfo.giftdrive_display_photo;
                            line.giftdrive_display_price = matchingLocalInfo.giftdrive_display_price;
                            line.giftdrive_source_drive_item_id = matchingLocalInfo.source_drive_item_id;
                            line.giftdrive_source_child_item_id = matchingLocalInfo.source_child_item_id;
                        } else {
                            line.giftdrive_base_product_name = (store.__typename === 'ShopifyStore' && line.product) ? line.product.title : line.product?.title;
                            line.giftdrive_variant_details_text = (store.__typename === 'ShopifyStore' && line.variant) ? line.variant.title : null;
                            line.giftdrive_display_photo = (store.__typename === 'ShopifyStore' && line.variant?.image) ? line.variant.image.url : line.product?.images?.[0]?.url;
                        }
                    });
                });
            }
        }

        const isCartEmpty = !augmentedCartResponse?.stores || augmentedCartResponse.stores.every(s => !s.cartLines || s.cartLines.length === 0);
        if (isCartEmpty && cartDbId) {
            console.log(`[API Cart Update] Cart is now empty. Marking DB cart ${cartDbId} as abandoned.`);
            try {
                await pool.query(
                    "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [cartDbId]
                );
            } catch (dbUpdateError) {
                console.error(`[API Cart Update] Failed to mark empty cart ${cartDbId} as abandoned:`, dbUpdateError);
            }
            return res.status(200).json(null);
        }
        return res.status(200).json(augmentedCartResponse);

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Cart Update] Rollback failed:", rbError); } }
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to update quantity: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    } finally {
        if (connection) connection.release();
    }
}