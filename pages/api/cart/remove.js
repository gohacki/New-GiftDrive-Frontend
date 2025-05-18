// File: pages/api/cart/remove.js
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Adjusted path
import { executeGraphQL, logApiError, DELETE_CART_ITEMS_MUTATION } from "../../../lib/ryeHelpers";
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { ryeCartId, cartDbId } = await getRequestCartInfo(req, res);

    if (!ryeCartId || !cartDbId) {
        return res.status(404).json({ error: 'No active cart found to remove items from.' });
    }

    const { itemId: ryeItemId, marketplace } = req.body;

    if (!ryeItemId || !marketplace || !['AMAZON', 'SHOPIFY'].includes(marketplace.toUpperCase())) {
        return res.status(400).json({ error: 'Valid Rye Item ID and Marketplace (AMAZON or SHOPIFY) are required.' });
    }

    const targetMarketplace = marketplace.toUpperCase();
    const itemsToDeleteRye = targetMarketplace === 'SHOPIFY'
        ? { shopifyProducts: [{ variantId: ryeItemId }] }
        : { amazonProducts: [{ productId: ryeItemId }] };

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [cartContentRows] = await connection.query(
            `SELECT cc.cart_content_id
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
        const cartContentToRemove = cartContentRows[0];

        console.log(`[API Cart Remove] Attempting to remove item ${ryeItemId} (${targetMarketplace}) from Rye cart ${ryeCartId}`);
        const result = await executeGraphQL(DELETE_CART_ITEMS_MUTATION, {
            input: { id: ryeCartId, items: itemsToDeleteRye }
        }, req);

        const updatedCartFromRye = result.data?.deleteCartItems?.cart;
        const removeErrors = result.data?.deleteCartItems?.errors;

        if (removeErrors?.length) {
            await connection.rollback();
            const err = new Error(removeErrors[0].message);
            err.statusCode = removeErrors[0].extensions?.statusCode || 400;
            err.details = removeErrors;
            err.errorCode = removeErrors[0].code;
            throw err;
        }
        if (!updatedCartFromRye) {
            await connection.rollback();
            const err = new Error("Rye API did not return cart after removing item.");
            err.statusCode = 502;
            err.errorCode = "RYE_REMOVE_ITEM_NO_CART";
            throw err;
        }
        console.log(`[API Cart Remove] Item removed successfully from Rye cart ${ryeCartId}.`);

        if (cartContentToRemove) {
            console.log(`[API Cart Remove] Deleting cart_content_id ${cartContentToRemove.cart_content_id} from local DB.`);
            await connection.query(
                'DELETE FROM cart_contents WHERE cart_content_id = ?',
                [cartContentToRemove.cart_content_id]
            );
        } else {
            console.warn(`[API Cart Remove] No local cart_content entry found for Rye ID ${ryeItemId} in cart ${cartDbId}. Rye removal was successful.`);
        }

        await connection.commit();

        // Augment the response cart
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
            console.log(`[API Cart Remove] Cart is now empty. Marking DB cart ${cartDbId} as abandoned.`);
            try {
                await pool.query(
                    "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [cartDbId]
                );
            } catch (dbUpdateError) {
                console.error(`[API Cart Remove] Failed to mark empty cart ${cartDbId} as abandoned:`, dbUpdateError);
            }
            return res.status(200).json(null);
        }

        return res.status(200).json(augmentedCartResponse);

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Cart Remove] Rollback failed:", rbError); } }
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to remove item: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    } finally {
        if (connection) connection.release();
    }
}