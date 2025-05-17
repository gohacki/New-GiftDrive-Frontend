// File: pages/api/cart/remove.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { executeGraphQL, logApiError, DELETE_CART_ITEMS_MUTATION } from "../../../lib/ryeHelpers";

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
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { user, ryeCartId, cartDbId, errorResponse: authError } = await getAuthAndCartInfo(req, res);

    if (authError) {
        return res.status(authError.status).json(authError.body);
    }
    if (!user) { // Should be caught by errorResponse
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (!ryeCartId || !cartDbId) {
        return res.status(404).json({ error: 'No active cart found for this user.' });
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

        // Find the specific cart_content_id for the item being removed.
        // This is crucial for accurately deleting from your local `cart_contents`.
        // The query looks for a match where the stored `rye_product_id` (for Amazon)
        // or `rye_variant_id` (for Shopify, if items table stores specific variant GIDs) matches.
        // If `items.rye_product_id` stores the parent GID for Shopify and `items.rye_variant_id` the variant GID,
        // adjust the query. Assuming `ryeItemId` corresponds to `i.rye_variant_id` for Shopify and `i.rye_product_id` for Amazon.
        console.log(`[API Cart Remove] Finding internal cart_content_id for Rye ID: ${ryeItemId}, Marketplace: ${targetMarketplace} in cart ${cartDbId}`);

        // This query assumes that the 'items' table stores the 'rye_product_id' as the primary link for Amazon items
        // and 'rye_variant_id' as the primary link for Shopify variants if your `items` table distinguishes them.
        // If your `items` table only has `rye_product_id` and `marketplace`, and `ryeIdToAdd` from the frontend
        // *is* the exact ID that was stored (e.g., ASIN for Amazon, Variant GID for Shopify), the join condition
        // might need to reflect how you map `ryeItemId` back to `cc.item_id` or a combination of `cc.item_id` and source refs.

        // Given the original query, it seems to try and match `ryeItemId` against `rye_product_id` OR `rye_variant_id`
        // in the `items` table.
        const [cartContentRows] = await connection.query(
            `SELECT cc.cart_content_id, cc.item_id, cc.quantity, cc.source_drive_item_id, cc.source_child_item_id
             FROM cart_contents cc
             JOIN items i ON cc.item_id = i.item_id
             WHERE cc.cart_id = ? 
               AND i.marketplace = ?
               AND (
                    (i.marketplace = 'AMAZON' AND i.rye_product_id = ?) OR
                    (i.marketplace = 'SHOPIFY' AND i.rye_variant_id = ?) 
                   )
             LIMIT 1`, // Assuming a single cart_contents entry for a unique Rye item within a cart
            [cartDbId, targetMarketplace, ryeItemId, ryeItemId]
        );


        if (cartContentRows.length === 0) {
            console.warn(`[API Cart Remove] Could not find matching cart_content for Rye ID ${ryeItemId} (Marketplace: ${targetMarketplace}) in cart DB ID ${cartDbId}. Will attempt Rye removal only.`);
            // Fall through to attempt Rye removal, as the item might be in Rye's cart but not locally tracked (edge case).
        }
        const cartContentToRemove = cartContentRows[0]; // Will be undefined if not found

        console.log(`[API Cart Remove] Removing item ${ryeItemId} (${targetMarketplace}) from Rye cart ${ryeCartId}`);
        const result = await executeGraphQL(DELETE_CART_ITEMS_MUTATION, {
            input: { id: ryeCartId, items: itemsToDeleteRye }
        }, req); // Pass req for Rye-Shopper-IP

        const updatedCartFromRye = result.data?.deleteCartItems?.cart;
        const removeErrors = result.data?.deleteCartItems?.errors;

        if (removeErrors?.length) {
            // Rollback before throwing for atomicity, even if only Rye failed
            await connection.rollback();
            const err = new Error(removeErrors[0].message);
            err.statusCode = 400; // Or derive from error code
            err.details = removeErrors;
            err.errorCode = removeErrors[0].code;
            throw err;
        }
        if (!updatedCartFromRye) {
            await connection.rollback();
            const err = new Error("Rye API did not return cart after removing item.");
            err.statusCode = 502; // Bad Gateway or similar
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
            console.log(`[API Cart Remove] Removed item from local cart_contents.`);
        } else {
            console.log(`[API Cart Remove] No local cart_content entry found to delete for Rye ID ${ryeItemId}.`);
        }

        await connection.commit();

        // Augment the response cart (similar to GET / and POST /add)
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
                            line.giftdrive_variant_details_text = (store.__typename === 'ShopifyStore' && line.variant) ? line.variant.title : null;
                        }
                    });
                });
            }
        }


        // Check if cart is now empty (all stores have no cartLines)
        const isCartEmpty = !augmentedCartResponse?.stores || augmentedCartResponse.stores.every(s => !s.cartLines || s.cartLines.length === 0);
        if (isCartEmpty && cartDbId) {
            console.log(`[API Cart Remove] Cart is now empty. Marking DB cart ${cartDbId} as abandoned.`);
            // Using a separate connection as the main one is committed.
            // Or, you could do this within the transaction before commit if preferred.
            try {
                await pool.query(
                    "UPDATE carts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [cartDbId]
                );
            } catch (dbUpdateError) {
                console.error(`[API Cart Remove] Failed to mark empty cart ${cartDbId} as abandoned:`, dbUpdateError);
            }
            return res.status(200).json(null); // Return null if cart becomes empty
        }

        return res.status(200).json(augmentedCartResponse);

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Cart Remove] Rollback failed:", rbError); } }
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to remove item: ${error.message}`,
            details: error.details,
            errorCode: error.errorCode
        });
    } finally {
        if (connection) connection.release();
    }
}