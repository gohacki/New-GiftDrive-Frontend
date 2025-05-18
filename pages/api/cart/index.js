// File: pages/api/cart/index.js
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Adjusted path
import { executeGraphQL, logApiError, GET_CART_QUERY } from "../../../lib/ryeHelpers";
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { ryeCartId, cartDbId } = await getRequestCartInfo(req, res);

    if (!ryeCartId) {
        // No active Rye cart found for either authenticated user or guest based on cookie
        return res.status(200).json(null);
    }

    try {
        console.log(`[API Cart GET] Fetching Rye cart ${ryeCartId}. Local DB cart ID (if any): ${cartDbId}`);
        const result = await executeGraphQL(GET_CART_QUERY, { cartId: ryeCartId }, req);
        const ryeCart = result.data?.getCart?.cart;

        if (!ryeCart) {
            console.warn(`[API Cart GET] Rye cart ${ryeCartId} not found or returned null. Potentially expired or invalid.`);
            if (cartDbId) { // If a local cart record existed
                try {
                    await pool.query("UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [cartDbId]);
                    console.log(`[API Cart GET] Marked local cart ${cartDbId} as abandoned.`);
                } catch (dbErr) {
                    console.error(`[API Cart GET] Error marking local cart ${cartDbId} as abandoned:`, dbErr);
                }
            }
            return res.status(200).json(null);
        }

        const isEmptyRyeCart = !ryeCart.stores || ryeCart.stores.every(s => !s.cartLines || s.cartLines.length === 0);
        if (isEmptyRyeCart) {
            console.log(`[API Cart GET] Rye cart ${ryeCartId} is empty.`);
            if (cartDbId) {
                try {
                    await pool.query("UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [cartDbId]);
                    console.log(`[API Cart GET] Marked empty local cart ${cartDbId} as abandoned.`);
                } catch (dbErr) {
                    console.error(`[API Cart GET] Error marking empty local cart ${cartDbId} as abandoned:`, dbErr);
                }
            }
            return res.status(200).json(null);
        }

        // Augmentation logic
        if (cartDbId && ryeCart.stores) {
            console.log(`[API Cart GET] Augmenting cart details for local DB cart ID: ${cartDbId}`);
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
                ryeCart.stores.forEach(store => {
                    store.cartLines?.forEach(line => {
                        const ryeLineItemIdInRyeCart = store.__typename === 'ShopifyStore' ? line.variant?.id : line.product?.id;
                        const storeMarketplace = store.store === 'amazon' ? 'AMAZON' : 'SHOPIFY'; // Determine marketplace type

                        const matchingLocalInfo = localAugmentationData.find(localData =>
                            localData.effective_rye_id_for_purchase === ryeLineItemIdInRyeCart &&
                            localData.item_marketplace.toUpperCase() === storeMarketplace // Match marketplace
                        );

                        if (matchingLocalInfo) {
                            line.giftdrive_base_product_name = matchingLocalInfo.giftdrive_base_product_name;
                            line.giftdrive_variant_details_text = matchingLocalInfo.giftdrive_display_name;
                            line.giftdrive_display_photo = matchingLocalInfo.giftdrive_display_photo;
                            line.giftdrive_display_price = matchingLocalInfo.giftdrive_display_price;
                            line.giftdrive_source_drive_item_id = matchingLocalInfo.source_drive_item_id;
                            line.giftdrive_source_child_item_id = matchingLocalInfo.source_child_item_id;
                        } else {
                            // Fallback if no specific local augmentation data found for this Rye line item
                            line.giftdrive_base_product_name = (store.__typename === 'ShopifyStore' && line.product) ? line.product.title : line.product?.title;
                            line.giftdrive_variant_details_text = (store.__typename === 'ShopifyStore' && line.variant) ? line.variant.title : (line.product?.title || null); // For Amazon, might be product title if no specific variant name
                            line.giftdrive_display_photo = (store.__typename === 'ShopifyStore' && line.variant?.image) ? line.variant.image.url : line.product?.images?.[0]?.url;
                        }
                    });
                });
            } else {
                // Fallback if no local cart_contents for this cartDbId, but Rye cart exists
                ryeCart.stores.forEach(store => {
                    store.cartLines?.forEach(line => {
                        line.giftdrive_base_product_name = (store.__typename === 'ShopifyStore' && line.product) ? line.product.title : line.product?.title;
                        line.giftdrive_variant_details_text = (store.__typename === 'ShopifyStore' && line.variant) ? line.variant.title : null;
                    });
                });
            }
        }

        console.log(`[API Cart GET] Successfully fetched and augmented Rye cart ${ryeCartId}`);
        return res.status(200).json(ryeCart);

    } catch (error) {
        // Handle cases where Rye cart might be expired/not found even if we had a ryeCartId
        if (cartDbId && (error.errorCode === 'CART_EXPIRED_ERROR' || error.errorCode === 'CART_NOT_FOUND_ERROR' || error.statusCode === 404)) {
            try {
                await pool.query("UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [cartDbId]);
                console.log(`[API Cart GET] Marked local cart ${cartDbId} as abandoned due to Rye error: ${error.errorCode || error.statusCode}`);
            } catch (dbError) {
                console.error(`[API Cart GET] DB Error marking local cart ${cartDbId} as abandoned:`, dbError);
            }
            return res.status(200).json(null); // Return null as if no cart
        }
        logApiError(error); // Log the full error server-side
        return res.status(error.statusCode || 500).json({
            error: `Failed to fetch cart: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    }
}