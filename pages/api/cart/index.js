// File: pages/api/cart/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { executeGraphQL, logApiError, GET_CART_QUERY } from "../../../lib/ryeHelpers";

// Helper function (could be in a shared utils file or defined here)
async function getAuthAndCartInfo(req, res) {
    // ... (same helper function as defined above) ...
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
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { user, ryeCartId, cartDbId, errorResponse } = await getAuthAndCartInfo(req, res);

    if (errorResponse) {
        return res.status(errorResponse.status).json(errorResponse.body);
    }
    if (!user) { // Should be caught by errorResponse, but as a safeguard
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (!ryeCartId) {
        return res.status(200).json(null); // No active Rye cart
    }

    try {
        console.log(`[API Cart GET] Fetching Rye cart ${ryeCartId} for user ${user.id}`);
        const result = await executeGraphQL(GET_CART_QUERY, { cartId: ryeCartId }, req); // Pass req for Rye-Shopper-IP

        if (!result.data?.getCart?.cart) {
            if (cartDbId) {
                console.log(`[API Cart GET] Rye cart ${ryeCartId} not found/expired. Marking DB record ${cartDbId} as abandoned.`);
                try {
                    await pool.query(
                        "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [cartDbId]
                    );
                } catch (dbError) {
                    console.error(`[API Cart GET] Failed to mark cart ${cartDbId} as abandoned:`, dbError);
                }
            }
            return res.status(200).json(null);
        }

        const ryeCart = result.data.getCart.cart;
        if (!ryeCart.stores || ryeCart.stores.every(s => !s.cartLines || s.cartLines.length === 0)) {
            if (cartDbId) {
                console.log(`[API Cart GET] Rye cart ${ryeCartId} is empty. Marking DB record ${cartDbId} as abandoned.`);
                try {
                    await pool.query(
                        "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [cartDbId]
                    );
                } catch (dbError) {
                    console.error(`[API Cart GET] Failed to mark empty cart ${cartDbId} as abandoned:`, dbError);
                }
            }
            return res.status(200).json(null);
        }

        // Augmentation logic (same as your Express route)
        if (cartDbId && ryeCart.stores) {
            console.log(`[API Cart GET] Augmenting cart ${cartDbId} for user ${user.id}.`);
            const [localAugmentationData] = await pool.query(
                `SELECT
                   cc.item_id AS local_base_item_id,
                   cc.source_drive_item_id,
                   cc.source_child_item_id,
                   COALESCE(di.variant_display_name, ci.variant_display_name, i.name) as giftdrive_display_name,
                   COALESCE(di.variant_display_photo, ci.variant_display_photo, i.image_url) as giftdrive_display_photo,
                   COALESCE(di.variant_display_price, ci.variant_display_price, i.price) as giftdrive_display_price,
                   i.name AS giftdrive_base_product_name,
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
                        const matchingLocalInfo = localAugmentationData.find(localData =>
                            localData.effective_rye_id_for_purchase === ryeLineItemIdInRyeCart
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
                            line.giftdrive_variant_details_text = (store.__typename === 'ShopifyStore' && line.variant) ? line.variant.title : (line.product?.title || null);
                            line.giftdrive_display_photo = (store.__typename === 'ShopifyStore' && line.variant?.image) ? line.variant.image.url : line.product?.images?.[0]?.url;
                        }
                    });
                });
            } else {
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
        if (cartDbId && (error.errorCode === 'CART_EXPIRED_ERROR' || error.errorCode === 'CART_NOT_FOUND_ERROR')) {
            const reason = error.errorCode === 'CART_EXPIRED_ERROR' ? 'expired' : 'not found';
            console.log(`[API Cart GET] Rye cart ${ryeCartId} was ${reason}. Marking DB record ${cartDbId} as abandoned.`);
            try {
                await pool.query(
                    "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [cartDbId]
                );
            } catch (dbError) {
                console.error(`[API Cart GET] Failed to mark cart ${cartDbId} as abandoned in DB:`, dbError);
            }
            return res.status(200).json(null);
        }
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to fetch cart: ${error.message}`,
            details: error.details,
            errorCode: error.errorCode
        });
    }
}