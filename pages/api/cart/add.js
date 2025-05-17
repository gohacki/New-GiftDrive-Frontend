// File: pages/api/cart/add.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import {
    executeGraphQL, logApiError,
    CREATE_CART_MUTATION, ADD_CART_ITEMS_MUTATION
} from "../../../lib/ryeHelpers";

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

    const { user, ryeCartId: initialRyeCartId, cartDbId: initialCartDbId, errorResponse: authError } = await getAuthAndCartInfo(req, res);

    if (authError) {
        return res.status(authError.status).json(authError.body);
    }
    if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = user.id; // Auth.js user ID

    const {
        ryeIdToAdd,
        marketplaceForItem,
        quantity = 1, // Default quantity
        originalNeedRefId,
        originalNeedRefType
    } = req.body;

    // --- Input Validation (similar to your Express route) ---
    if (!ryeIdToAdd || !marketplaceForItem || !originalNeedRefId || !originalNeedRefType) {
        return res.status(400).json({ error: 'Missing required parameters for adding to cart.' });
    }
    const numericOriginalNeedRefId = parseInt(originalNeedRefId, 10);
    const requestedQuantityFromBody = parseInt(quantity, 10);
    if (isNaN(numericOriginalNeedRefId) || numericOriginalNeedRefId <= 0 || isNaN(requestedQuantityFromBody) || requestedQuantityFromBody <= 0) {
        return res.status(400).json({ error: 'Invalid ID or quantity.' });
    }
    if (!['drive_item', 'child_item'].includes(originalNeedRefType)) {
        return res.status(400).json({ error: "Invalid originalNeedRefType." });
    }
    // --- End Input Validation ---

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // --- Availability Check and Base Item ID Fetch (same logic as Express) ---
        let source_table_name_for_need, source_pk_column_name_for_need, source_oi_col_for_orders;
        if (originalNeedRefType === 'drive_item') {
            source_table_name_for_need = 'drive_items'; source_pk_column_name_for_need = 'drive_item_id';
            source_oi_col_for_orders = 'source_drive_item_id';
        } else { // child_item
            source_table_name_for_need = 'child_items'; source_pk_column_name_for_need = 'child_item_id';
            source_oi_col_for_orders = 'source_child_item_id';
        }

        const [sourceItemRows] = await connection.query(
            `SELECT quantity FROM ${source_table_name_for_need} WHERE ${source_pk_column_name_for_need} = ? AND is_active = 1 FOR UPDATE`,
            [numericOriginalNeedRefId]
        );
        if (sourceItemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'The original item need could not be found or is inactive.' });
        }
        const quantity_needed_from_source = sourceItemRows[0].quantity;

        const [purchasedSumRows] = await connection.query(
            `SELECT COALESCE(SUM(quantity), 0) AS total_purchased FROM order_items WHERE ${source_oi_col_for_orders} = ?`,
            [numericOriginalNeedRefId]
        );
        const total_already_purchased_globally = purchasedSumRows[0].total_purchased;
        const quantity_available_globally = quantity_needed_from_source - total_already_purchased_globally;

        if (requestedQuantityFromBody > quantity_available_globally) {
            await connection.rollback();
            return res.status(400).json({ error: `Cannot add item. Requested quantity (${requestedQuantityFromBody}) exceeds available stock (${quantity_available_globally}). Max Needed: ${quantity_needed_from_source}, Already Purchased: ${total_already_purchased_globally}.` });
        }

        const [baseItemLinkRow] = await connection.query(
            `SELECT item_id FROM ${source_table_name_for_need} WHERE ${source_pk_column_name_for_need} = ?`,
            [numericOriginalNeedRefId]
        );
        if (baseItemLinkRow.length === 0 || !baseItemLinkRow[0].item_id) {
            await connection.rollback();
            return res.status(404).json({ error: `Could not link original need (Type: ${originalNeedRefType}, ID: ${numericOriginalNeedRefId}) to a base catalog item.` });
        }
        const baseCatalogItemIdForCartContents = baseItemLinkRow[0].item_id;
        // --- End Availability Check ---

        let currentRyeCartId = initialRyeCartId;
        let currentCartDbId = initialCartDbId;
        let finalCartStateFromRye;
        let httpStatusCode = 200;

        const targetMarketplace = marketplaceForItem.toUpperCase();
        const cartItemInputForRye = targetMarketplace === 'SHOPIFY'
            ? { shopifyCartItemsInput: [{ variantId: ryeIdToAdd, quantity: requestedQuantityFromBody }] }
            : { amazonCartItemsInput: [{ productId: ryeIdToAdd, quantity: requestedQuantityFromBody }] };

        if (!currentRyeCartId) {
            console.log(`[API Cart Add] No active cart for user ${userId}. Creating new Rye cart...`);
            const createVariables = { input: { items: cartItemInputForRye } }; // No attributes here for items
            const createResult = await executeGraphQL(CREATE_CART_MUTATION, createVariables, req);
            finalCartStateFromRye = createResult.data?.createCart?.cart;
            const createErrors = createResult.data?.createCart?.errors;

            if (createErrors?.length || !finalCartStateFromRye?.id) {
                await connection.rollback();
                const err = new Error(createErrors?.[0]?.message || "Failed to create Rye cart.");
                err.statusCode = createErrors?.[0]?.extensions?.statusCode || 400;
                err.details = createErrors;
                err.errorCode = createErrors?.[0]?.code || "RYE_CREATE_CART_FAILED";
                throw err;
            }
            currentRyeCartId = finalCartStateFromRye.id;
            const [insertResult] = await connection.query(
                'INSERT INTO carts (account_id, rye_cart_id, status) VALUES (?, ?, ?)',
                [userId, currentRyeCartId, 'active']
            );
            currentCartDbId = insertResult.insertId;
            httpStatusCode = 201;
        } else {
            console.log(`[API Cart Add] Adding item ${ryeIdToAdd} (${targetMarketplace}) to existing Rye cart ${currentRyeCartId}`);
            const addVariables = { input: { id: currentRyeCartId, items: cartItemInputForRye } };
            const addResult = await executeGraphQL(ADD_CART_ITEMS_MUTATION, addVariables, req);
            finalCartStateFromRye = addResult.data?.addCartItems?.cart;
            const addErrors = addResult.data?.addCartItems?.errors;

            if (addErrors?.length || !finalCartStateFromRye) {
                await connection.rollback();
                const err = new Error(addErrors?.[0]?.message || "Failed to add item to Rye cart.");
                err.statusCode = addErrors?.[0]?.extensions?.statusCode || 400;
                err.details = addErrors;
                err.errorCode = addErrors?.[0]?.code || "RYE_ADD_ITEM_FAILED";
                throw err;
            }
        }

        // --- Update local cart_contents (same logic as Express) ---
        let childIdForDb = null;
        let driveIdForDb = null;
        let sourceDriveItemIdForDb = (originalNeedRefType === 'drive_item') ? numericOriginalNeedRefId : null;
        let sourceChildItemIdForDb = (originalNeedRefType === 'child_item') ? numericOriginalNeedRefId : null;

        if (originalNeedRefType === 'child_item') {
            const [childLinkInfo] = await connection.query(`SELECT uc.child_id, uc.drive_id FROM child_items ci JOIN unique_children uc ON ci.child_id = uc.child_id WHERE ci.child_item_id = ?`, [sourceChildItemIdForDb]);
            if (childLinkInfo.length > 0) { childIdForDb = childLinkInfo[0].child_id; driveIdForDb = childLinkInfo[0].drive_id; }
        } else {
            const [driveLinkInfo] = await connection.query('SELECT drive_id FROM drive_items WHERE drive_item_id = ?', [sourceDriveItemIdForDb]);
            if (driveLinkInfo.length > 0) { driveIdForDb = driveLinkInfo[0].drive_id; }
        }

        const [existingCartContentRows] = await connection.query(
            `SELECT cart_content_id, quantity as existing_quantity FROM cart_contents
             WHERE cart_id = ? AND item_id = ? AND
                   (source_drive_item_id = ? OR (source_drive_item_id IS NULL AND ? IS NULL)) AND
                   (source_child_item_id = ? OR (source_child_item_id IS NULL AND ? IS NULL))`,
            [currentCartDbId, baseCatalogItemIdForCartContents, sourceDriveItemIdForDb, sourceDriveItemIdForDb, sourceChildItemIdForDb, sourceChildItemIdForDb]
        );

        if (existingCartContentRows.length > 0) {
            const newQuantityForCartContent = existingCartContentRows[0].existing_quantity + requestedQuantityFromBody;
            await connection.query(
                `UPDATE cart_contents SET quantity = ? WHERE cart_content_id = ?`,
                [newQuantityForCartContent, existingCartContentRows[0].cart_content_id]
            );
        } else {
            await connection.query(
                `INSERT INTO cart_contents (cart_id, item_id, child_id, drive_id, quantity, source_drive_item_id, source_child_item_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [currentCartDbId, baseCatalogItemIdForCartContents, childIdForDb, driveIdForDb, requestedQuantityFromBody, sourceDriveItemIdForDb, sourceChildItemIdForDb]
            );
        }
        // --- End local cart_contents update ---

        await connection.commit();

        // --- Augment and Return Cart (same logic as Express GET, but applied to finalCartStateFromRye) ---
        let augmentedCartResponse = finalCartStateFromRye;
        if (currentRyeCartId && finalCartStateFromRye) { // Ensure we have a cart to augment
            console.log(`[API Cart Add] Re-fetching and augmenting cart ${currentRyeCartId} for response.`);
            // It's often better to use the cart returned by the ADD/CREATE mutation directly
            // If that cart doesn't have all details, then refetch. For now, let's assume ADD/CREATE returns sufficiently detailed cart.
            // If not, uncomment the GET_CART_QUERY call:
            // const freshCartResult = await executeGraphQL(GET_CART_QUERY, { cartId: currentRyeCartId }, req);
            // if (freshCartResult.data?.getCart?.cart) {
            //    augmentedCartResponse = freshCartResult.data.getCart.cart;
            // }

            if (currentCartDbId && augmentedCartResponse.stores) {
                const [localAugmentationData] = await pool.query( // Use pool directly for read after commit
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
                    [currentCartDbId]
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
                                // ... (rest of augmentation) ...
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
        }
        // --- End Augment and Return ---

        return res.status(httpStatusCode).json(augmentedCartResponse);

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Cart Add] Rollback failed:", rbError); } }
        logApiError(error); // Log the full error server-side
        return res.status(error.statusCode || 500).json({
            error: `Failed to add item to cart: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode || 'ADD_TO_CART_UNHANDLED_ERROR'
        });
    } finally {
        if (connection) connection.release();
    }
}