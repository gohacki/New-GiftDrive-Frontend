// File: pages/api/cart/buyer-identity.js
import { getRequestCartInfo } from "../../../lib/cartAuthHelper"; // Adjusted path
import { executeGraphQL, logApiError, UPDATE_BUYER_IDENTITY_MUTATION } from "../../../lib/ryeHelpers"; // Ensured mutation is imported
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { user, ryeCartId, cartDbId, isGuest } = await getRequestCartInfo(req, res);

    if (!ryeCartId || !cartDbId) {
        return res.status(404).json({ error: 'No active cart found to update buyer identity.' });
    }

    const { buyerIdentity: guestProvidedIdentity } = req.body; // This is what guest enters on frontend for name/email

    try {
        // Determine the organization associated with the cart items
        const findOrgQuery = `
            SELECT d.org_id
            FROM cart_contents cc
            LEFT JOIN drives d ON (cc.drive_id = d.drive_id OR EXISTS (SELECT 1 FROM unique_children uc WHERE uc.child_id = cc.child_id AND uc.drive_id = d.drive_id))
            WHERE cc.cart_id = ? AND d.org_id IS NOT NULL
            LIMIT 1;
        `; // This query tries to find org_id either from direct drive_id or through unique_children's drive_id
        const [orgLinkRows] = await pool.query(findOrgQuery, [cartDbId]);

        if (orgLinkRows.length === 0 || !orgLinkRows[0]?.org_id) {
            console.error(`[API Buyer Identity] Failed to find organization linked to cart ${cartDbId}.`);
            throw new Error("Could not determine the recipient organization for this cart. Ensure items are linked to a valid drive/organization.");
        }
        const orgId = orgLinkRows[0].org_id;
        console.log(`[API Buyer Identity] Found Org ID: ${orgId} linked to cart ${cartDbId}`);

        const [orgRows] = await pool.query(
            'SELECT name AS org_name, address, city, state, zip_code, country, phone FROM organizations WHERE org_id = ?',
            [orgId]
        );
        if (orgRows.length === 0) throw new Error(`Organization data not found for Org ID: ${orgId}.`);
        const orgData = orgRows[0];

        // Validate essential organization details for shipping
        if (!orgData.phone?.trim() || !orgData.address?.trim() || !orgData.city?.trim() || !orgData.state?.trim() || !orgData.zip_code?.trim() || !orgData.country?.trim()) {
            throw new Error("The recipient organization's address or phone is incomplete. Cannot set shipping information.");
        }
        if (!/^\+[1-9]\d{1,14}$/.test(orgData.phone.trim())) { // E.164 format check
            throw new Error(`Invalid organization phone number format (${orgData.phone}). Must be E.164 (e.g., +12125551212).`);
        }

        // Construct the buyer identity for Rye
        const finalBuyerIdentity = {
            firstName: isGuest ? (guestProvidedIdentity?.firstName?.trim() || 'Guest') : (orgData.org_name || user?.name?.split(' ')[0] || 'GiftDrive'),
            lastName: isGuest ? (guestProvidedIdentity?.lastName?.trim() || 'Donor') : 'Organization', // Default for user, guest provides own
            email: isGuest ? guestProvidedIdentity?.email?.trim() : (user?.email || `receipt+org${orgId}@giftdrive.org`), // Fallback email
            phone: orgData.phone.trim(), // Always Org's phone for shipping
            countryCode: String(orgData.country).trim().toUpperCase().slice(0, 2),
            address1: String(orgData.address).trim(),
            address2: orgData.address2 ? String(orgData.address2).trim() : null,
            city: String(orgData.city).trim(),
            provinceCode: String(orgData.state).trim().toUpperCase(), // Assuming state maps to provinceCode
            postalCode: String(orgData.zip_code).trim(),
        };

        if (!finalBuyerIdentity.email) { // Email is crucial for receipts
            throw new Error("A valid email address is required for the order.");
        }
        if (isGuest && (!finalBuyerIdentity.firstName || !finalBuyerIdentity.lastName)) { // Basic check for guest name
            throw new Error("Guest first and last name are required.");
        }

        console.log(`[API Buyer Identity] Updating identity for Rye cart ${ryeCartId}. Final Identity:`, JSON.stringify(finalBuyerIdentity, null, 2));

        const variables = { input: { id: ryeCartId, buyerIdentity: finalBuyerIdentity } };
        // Note: RYE_CART_QUERY_FIELDS is used inside UPDATE_BUYER_IDENTITY_MUTATION string in ryeHelpers.js
        const result = await executeGraphQL(UPDATE_BUYER_IDENTITY_MUTATION, variables, req);

        const updatedCartFromRye = result.data?.updateCartBuyerIdentity?.cart;
        const errors = result.data?.updateCartBuyerIdentity?.errors;

        if (errors?.length) {
            const phoneError = errors.find(e => e.code === 'BUYER_IDENTITY_INVALID_PHONE');
            if (phoneError) {
                const err = new Error(`Invalid phone number for shipping address: ${phoneError.message}`);
                err.statusCode = 400; err.details = errors; err.errorCode = phoneError.code; throw err;
            }
            const err = new Error(errors[0].message);
            err.statusCode = 400; err.details = errors; err.errorCode = errors[0].code; throw err;
        }
        if (!updatedCartFromRye) {
            throw new Error("Rye API did not return cart after address update.");
        }

        console.log(`[API Buyer Identity] Identity updated. Rye Cost:`, JSON.stringify(updatedCartFromRye?.cost, null, 2));

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
        return res.status(200).json(augmentedCartResponse);

    } catch (error) {
        logApiError(error);
        console.error("[API Buyer Identity] Caught error:", error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to update buyer identity: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    }
}