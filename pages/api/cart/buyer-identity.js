// File: pages/api/cart/buyer-identity.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import {
    executeGraphQL, logApiError,
    RYE_CART_QUERY_FIELDS
} from "../../../lib/ryeHelpers";

// Helper function (same as before)
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
    if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (!ryeCartId || !cartDbId) {
        return res.status(404).json({ error: 'No active cart found in database.' });
    }

    // The frontend might send a buyerIdentity, but we will primarily use the org's data.
    const { buyerIdentity: frontendIdentity } = req.body;

    try {
        console.log(`[API Buyer Identity] Finding organization for DB Cart ID: ${cartDbId}`);
        // Determine the organization associated with the cart items
        const findOrgQuery = `
            SELECT d.org_id
            FROM cart_contents cc
            LEFT JOIN unique_children uc ON cc.child_id = uc.child_id
            LEFT JOIN drives d ON (uc.drive_id = d.drive_id OR cc.drive_id = d.drive_id)
            WHERE cc.cart_id = ? AND d.org_id IS NOT NULL
            LIMIT 1;
        `;
        const [orgLinkRows] = await pool.query(findOrgQuery, [cartDbId]);

        if (orgLinkRows.length === 0 || !orgLinkRows[0]?.org_id) {
            console.error(`[API Buyer Identity] Failed to find organization linked to cart ${cartDbId}.`);
            throw new Error("Could not determine the recipient organization for this cart.");
        }
        const orgId = orgLinkRows[0].org_id;
        console.log(`[API Buyer Identity] Found Org ID: ${orgId} linked to cart ${cartDbId}`);

        // Fetch organization details
        const [orgRows] = await pool.query(
            'SELECT name AS org_name, address, city, state, zip_code, country, phone FROM organizations WHERE org_id = ?',
            [orgId]
        );

        if (orgRows.length === 0) {
            throw new Error(`Organization data not found for Org ID: ${orgId}.`);
        }
        const orgData = orgRows[0];

        // Validate essential organization details
        if (!orgData.phone || orgData.phone.trim() === '') {
            throw new Error("The recipient organization is missing a required phone number. Cannot set shipping information.");
        }
        const orgPhone = orgData.phone.trim();
        if (!orgData.address || !orgData.city || !orgData.state || !orgData.zip_code || !orgData.country) {
            throw new Error("The recipient organization's address is incomplete. Cannot set shipping information.");
        }

        // Construct the buyer identity for Rye, prioritizing organization data
        const finalBuyerIdentity = {
            firstName: orgData.org_name || frontendIdentity?.firstName || user.name?.split(' ')[0] || 'GiftDrive',
            lastName: 'Organization', // Or a contact person if available
            email: frontendIdentity?.email || user.email || `receipt+org${orgId}@giftdrive.org`, // Fallback email
            phone: orgPhone, // MUST be E.164 format
            countryCode: String(orgData.country).trim().toUpperCase().slice(0, 2),
            address1: String(orgData.address).trim(),
            address2: orgData.address2 ? String(orgData.address2).trim() : null,
            city: String(orgData.city).trim(),
            provinceCode: String(orgData.state).trim().toUpperCase(), // Assuming state maps to provinceCode
            postalCode: String(orgData.zip_code).trim(),
        };

        // Basic sanity checks for the constructed identity
        if (!finalBuyerIdentity.email) throw new Error("A valid email address is required for shipping.");
        if (!/^\+[1-9]\d{1,14}$/.test(finalBuyerIdentity.phone)) {
            throw new Error(`Invalid organization phone number format (${finalBuyerIdentity.phone}). Must be E.164 (e.g., +12125551212).`);
        }


        console.log(`[API Buyer Identity] Updating identity for Rye cart ${ryeCartId}. Final Identity:`, JSON.stringify(finalBuyerIdentity, null, 2));

        // Note: RYE_CART_QUERY_FIELDS is used in the mutation string itself in ryeHelpers.js
        const mutation = `mutation UpdateBI($input: CartBuyerIdentityUpdateInput!) { updateCartBuyerIdentity(input: $input) { cart { ${RYE_CART_QUERY_FIELDS} } errors { code message } } }`;
        const variables = { input: { id: ryeCartId, buyerIdentity: finalBuyerIdentity } };
        const result = await executeGraphQL(mutation, variables, req); // Pass req for Rye-Shopper-IP

        const updatedCartFromRye = result.data?.updateCartBuyerIdentity?.cart;
        const errors = result.data?.updateCartBuyerIdentity?.errors;

        if (errors?.length) {
            const phoneError = errors.find(e => e.code === 'BUYER_IDENTITY_INVALID_PHONE');
            if (phoneError) {
                console.error("[API Buyer Identity] Rye rejected the phone number:", phoneError.message);
                const err = new Error(`Invalid phone number for shipping address: ${phoneError.message}`);
                err.statusCode = 400; err.details = errors; err.errorCode = phoneError.code;
                throw err;
            }
            console.error("[API Buyer Identity] Rye API returned errors:", errors);
            const err = new Error(errors[0].message);
            err.statusCode = 400; err.details = errors; err.errorCode = errors[0].code;
            throw err;
        }
        if (!updatedCartFromRye) {
            const err = new Error("Rye API did not return cart after address update.");
            err.statusCode = 502; err.errorCode = "RYE_IDENTITY_NO_CART";
            throw err;
        }

        console.log(`[API Buyer Identity] Identity updated. Rye Cost:`, JSON.stringify(updatedCartFromRye?.cost, null, 2));

        // Augment the response cart (similar to GET / and POST /add)
        let augmentedCartResponse = updatedCartFromRye;
        if (cartDbId && augmentedCartResponse.stores) {
            const [localAugmentationData] = await pool.query( /* ... same augmentation query as before ... */
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

        return res.status(200).json(augmentedCartResponse);

    } catch (error) {
        logApiError(error);
        console.error("[API Buyer Identity] Caught error:", error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to update buyer identity: ${error.message}`,
            ...(process.env.NODE_ENV !== 'production' && {
                details: error.details,
                errorCode: error.errorCode
            })
        });
    }
}