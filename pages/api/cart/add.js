// File: pages/api/cart/add.js
// No changes to this file beyond the version provided in the previous step,
// as that version already included the database query optimization.
// Ensure good indexing on:
// - carts: (account_id, status), (guest_session_token, status), (rye_cart_id)
// - items: (item_id), (rye_product_id, marketplace), (rye_variant_id, marketplace)
// - drive_items: (drive_item_id), (drive_id, item_id, selected_rye_variant_id, is_active)
// - child_items: (child_item_id), (child_id, item_id, selected_rye_variant_id, is_active)
// - unique_children: (child_id), (drive_id)
// - cart_contents: (cart_id, item_id, source_drive_item_id, source_child_item_id) - composite is good
// - order_items: (source_drive_item_id), (source_child_item_id)
// (The actual implementation of this file from the previous response remains here)
import { getRequestCartInfo, setNewGuestCartTokenCookie } from "../../../lib/cartAuthHelper";
import { CREATE_CART_MUTATION, ADD_CART_ITEMS_MUTATION, executeGraphQL, logApiError } from "../../../lib/ryeHelpers";
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { accountIdForDb, ryeCartId: initialRyeCartId, cartDbId: initialCartDbId, isGuest } = await getRequestCartInfo(req, res);

    const {
        ryeIdToAdd, marketplaceForItem, quantity = 1,
        originalNeedRefId, originalNeedRefType
    } = req.body;

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

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let sourceItemQuery;
        let source_oi_col_for_orders;
        let childIdForDb = null;
        let driveIdForDb = null;

        if (originalNeedRefType === 'drive_item') {
            source_oi_col_for_orders = 'source_drive_item_id';
            sourceItemQuery = `
                SELECT di.quantity, di.item_id, di.drive_id 
                FROM drive_items di 
                WHERE di.drive_item_id = ? AND di.is_active = 1 FOR UPDATE`;
        } else {
            source_oi_col_for_orders = 'source_child_item_id';
            sourceItemQuery = `
                SELECT ci.quantity, ci.item_id, uc.drive_id, uc.child_id AS unique_child_id 
                FROM child_items ci 
                JOIN unique_children uc ON ci.child_id = uc.child_id 
                WHERE ci.child_item_id = ? AND ci.is_active = 1 FOR UPDATE`;
        }

        const [sourceItemRows] = await connection.query(sourceItemQuery, [numericOriginalNeedRefId]);

        if (sourceItemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'The original item need could not be found or is inactive.' });
        }
        const sourceItemData = sourceItemRows[0];
        const quantity_needed_from_source = sourceItemData.quantity;
        const baseCatalogItemIdForCartContents = sourceItemData.item_id;

        if (originalNeedRefType === 'drive_item') {
            driveIdForDb = sourceItemData.drive_id;
        } else {
            childIdForDb = sourceItemData.unique_child_id;
            driveIdForDb = sourceItemData.drive_id;
        }

        if (!baseCatalogItemIdForCartContents) {
            await connection.rollback();
            return res.status(404).json({ error: `Could not link original need (Type: ${originalNeedRefType}, ID: ${numericOriginalNeedRefId}) to a base catalog item. item_id missing from source.` });
        }

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

        let currentRyeCartId = initialRyeCartId;
        let currentCartDbId = initialCartDbId;
        let finalCartStateFromRye;
        let httpStatusCode = 200;

        const targetMarketplace = marketplaceForItem.toUpperCase();
        const cartItemInputForRye = targetMarketplace === 'SHOPIFY'
            ? { shopifyCartItemsInput: [{ variantId: ryeIdToAdd, quantity: requestedQuantityFromBody }] }
            : { amazonCartItemsInput: [{ productId: ryeIdToAdd, quantity: requestedQuantityFromBody }] };

        if (!currentRyeCartId) {
            console.log(`[API Cart Add] No active cart. Creating new Rye cart...`);
            const createVariables = { input: { items: cartItemInputForRye } };
            const createResult = await executeGraphQL(CREATE_CART_MUTATION, createVariables, req);
            finalCartStateFromRye = createResult.data?.createCart?.cart;
            const createErrors = createResult.data?.createCart?.errors;

            if (createErrors?.length || !finalCartStateFromRye?.id) {
                await connection.rollback();
                const err = new Error(createErrors?.[0]?.message || "Failed to create Rye cart.");
                err.statusCode = createErrors?.[0]?.extensions?.statusCode || 400;
                throw err;
            }
            currentRyeCartId = finalCartStateFromRye.id;

            let guestTokenForDbInsert = null;
            if (isGuest) {
                guestTokenForDbInsert = setNewGuestCartTokenCookie(res);
            }

            const [insertResult] = await connection.query(
                'INSERT INTO carts (account_id, guest_session_token, rye_cart_id, status) VALUES (?, ?, ?, ?)',
                [accountIdForDb, guestTokenForDbInsert, currentRyeCartId, 'active']
            );
            currentCartDbId = insertResult.insertId;
            httpStatusCode = 201;
        } else {
            console.log(`[API Cart Add] Adding item to existing Rye cart ${currentRyeCartId}`);
            const addVariables = { input: { id: currentRyeCartId, items: cartItemInputForRye } };
            const addResult = await executeGraphQL(ADD_CART_ITEMS_MUTATION, addVariables, req);
            finalCartStateFromRye = addResult.data?.addCartItems?.cart;
            const addErrors = addResult.data?.addCartItems?.errors;
            if (addErrors?.length || !finalCartStateFromRye) {
                await connection.rollback();
                const err = new Error(addErrors?.[0]?.message || "Failed to add item to Rye cart.");
                err.statusCode = addErrors?.[0]?.extensions?.statusCode || 400;
                throw err;
            }
        }

        let sourceDriveItemIdForDb = (originalNeedRefType === 'drive_item') ? numericOriginalNeedRefId : null;
        let sourceChildItemIdForDb = (originalNeedRefType === 'child_item') ? numericOriginalNeedRefId : null;

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

        await connection.commit();

        let augmentedCartResponse = finalCartStateFromRye;
        if (currentCartDbId && augmentedCartResponse && augmentedCartResponse.stores) {
            const [localAugmentationData] = await pool.query( // Use pool for read after commit
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
                [currentCartDbId]
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
                        }
                    });
                });
            }
        }
        return res.status(httpStatusCode).json(augmentedCartResponse);

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("[API Cart Add] Rollback failed:", rbError); } }
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to add item to cart: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode || 'ADD_TO_CART_UNHANDLED_ERROR'
        });
    } finally {
        if (connection) connection.release();
    }
}