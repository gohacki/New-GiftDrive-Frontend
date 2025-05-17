// File: pages/api/items/find-or-create-specific-variant.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { executeGraphQL, logApiError, GET_PRODUCT_BY_ID_QUERY } from "../../../lib/ryeHelpers";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    // Consider if admin/org_admin check is needed based on your `/* Consider admin/org_admin check */` comment

    const {
        base_rye_product_id, rye_variant_id, marketplace,
        base_product_name_hint, variant_title_hint,
        variant_price_hint, variant_image_url_hint
    } = req.body;

    // Validation (same as Express)
    if (!base_rye_product_id || !marketplace) {
        return res.status(400).json({ error: 'Base Rye Product ID (or ASIN) and Marketplace are required.' });
    }
    const marketplaceUpper = marketplace.toUpperCase();
    if (marketplaceUpper !== 'SHOPIFY' && marketplaceUpper !== 'AMAZON') {
        return res.status(400).json({ error: 'Invalid marketplace. Must be SHOPIFY or AMAZON.' });
    }
    const definitivePurchasableRyeId = (marketplaceUpper === 'SHOPIFY' && rye_variant_id) ? rye_variant_id : base_rye_product_id;
    if (!definitivePurchasableRyeId) {
        return res.status(400).json({ error: 'Could not determine the specific Rye ID for the item/variant.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingItems] = await connection.query(
            'SELECT item_id, name FROM items WHERE rye_product_id = ? AND rye_variant_id = ? AND marketplace = ?',
            [base_rye_product_id, definitivePurchasableRyeId, marketplaceUpper]
        );

        if (existingItems.length > 0) {
            await connection.commit(); // Commit as no further DB changes if item exists
            return res.status(200).json({
                internal_item_id: existingItems[0].item_id,
                name: existingItems[0].name,
                is_newly_created: false
            });
        }

        // If not found, fetch from Rye (same logic as Express)
        const ryeQueryId = marketplaceUpper === 'SHOPIFY' ? base_rye_product_id : definitivePurchasableRyeId;
        const productDetailsFromRye = await executeGraphQL(
            GET_PRODUCT_BY_ID_QUERY,
            { productId: ryeQueryId, marketplace: marketplaceUpper },
            req // Pass req for Rye-Shopper-IP
        );
        const baseProductRye = productDetailsFromRye.data?.productByID;
        if (!baseProductRye) {
            await connection.rollback();
            return res.status(404).json({ error: `Product details not found on Rye for ID ${ryeQueryId} (${marketplaceUpper}).` });
        }

        // Logic to determine finalItemName, finalItemPrice, etc. (same as Express)
        let finalItemName, finalItemPrice, finalItemImage, finalItemDescription;
        if (marketplaceUpper === 'SHOPIFY') {
            const shopifyVariants = baseProductRye.variants || [];
            const targetVariantRye = shopifyVariants.find(v => v.id === definitivePurchasableRyeId);
            if (shopifyVariants.length > 0 && !targetVariantRye) {
                await connection.rollback();
                return res.status(404).json({ error: `Specific variant ${definitivePurchasableRyeId} not found for Shopify product ${base_rye_product_id} on Rye.` });
            }
            if (targetVariantRye) {
                finalItemName = variant_title_hint || `${baseProductRye.title || 'Product'} - ${targetVariantRye.title || definitivePurchasableRyeId}`;
                finalItemPrice = variant_price_hint != null ? parseFloat(variant_price_hint) : (targetVariantRye.price?.value != null ? (targetVariantRye.price.value / 100) : (targetVariantRye.priceV2?.value != null ? (targetVariantRye.priceV2.value / 100) : null));
                finalItemImage = variant_image_url_hint || targetVariantRye.image?.url || baseProductRye.images?.[0]?.url;
                finalItemDescription = baseProductRye.description || null;
            } else {
                finalItemName = base_product_name_hint || baseProductRye.title || `Shopify Product ${definitivePurchasableRyeId}`;
                finalItemPrice = variant_price_hint != null ? parseFloat(variant_price_hint) : (baseProductRye.price?.value != null ? (baseProductRye.price.value / 100) : (baseProductRye.priceV2?.value != null ? (baseProductRye.priceV2.value / 100) : null));
                finalItemImage = variant_image_url_hint || baseProductRye.images?.[0]?.url;
                finalItemDescription = baseProductRye.description || null;
            }
        } else { // AMAZON
            finalItemName = base_product_name_hint || baseProductRye.title || `Amazon Product ${definitivePurchasableRyeId}`;
            finalItemPrice = variant_price_hint != null ? parseFloat(variant_price_hint) : (baseProductRye.price?.value != null ? (baseProductRye.price.value / 100) : null);
            finalItemImage = variant_image_url_hint || baseProductRye.images?.[0]?.url;
            finalItemDescription = baseProductRye.description || null;
        }

        if (finalItemPrice === null) {
            await connection.rollback();
            return res.status(400).json({ error: 'Could not determine price for the item/variant.' });
        }

        // Insert into local DB (same logic as Express)
        const [insertResult] = await connection.query(
            `INSERT INTO items (name, description, price, image_url, rye_product_id, rye_variant_id, marketplace, is_rye_linked)
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [finalItemName, finalItemDescription, finalItemPrice, finalItemImage, base_rye_product_id, definitivePurchasableRyeId, marketplaceUpper]
        );
        const newInternalItemId = insertResult.insertId;
        await connection.commit();

        return res.status(201).json({
            internal_item_id: newInternalItemId,
            name: finalItemName,
            is_newly_created: true
        });

    } catch (error) {
        if (connection) await connection.rollback();
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to find or create specific item: ${error.message}`,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode,
        });
    } finally {
        if (connection) connection.release();
    }
}