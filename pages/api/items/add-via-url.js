// File: pages/api/items/add-via-url.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import {
    executeGraphQL, logApiError,
    REQUEST_AMAZON_PRODUCT_MUTATION, REQUEST_SHOPIFY_PRODUCT_MUTATION,
    GET_PRODUCT_BY_ID_QUERY
} from "../../../lib/ryeHelpers";
import { URL } from 'url'; // Node.js URL module

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.is_super_admin) { // Check for super admin
        return res.status(403).json({ message: "Forbidden: Not authorized" });
    }

    const { productUrl } = req.body;
    if (!productUrl) {
        return res.status(400).json({ error: 'Product URL is required.' });
    }

    let marketplace;
    let requestMutation;
    let mutationInput;
    let ryeProductIdFromTracking; // Renamed to avoid confusion with definitiveRyeId

    try {
        // 1. Validate URL and Determine Marketplace (same as Express)
        let normalizedUrl = productUrl;
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        const parsedUrl = new URL(normalizedUrl);
        if (parsedUrl.hostname.includes('amazon.')) {
            marketplace = 'AMAZON';
            requestMutation = REQUEST_AMAZON_PRODUCT_MUTATION;
            mutationInput = { url: normalizedUrl };
        } else {
            marketplace = 'SHOPIFY';
            requestMutation = REQUEST_SHOPIFY_PRODUCT_MUTATION;
            mutationInput = { url: normalizedUrl };
        }

        // 2. Request Rye Tracking (same as Express)
        console.log(`[API Add Item URL] Requesting Rye tracking for ${marketplace} URL: ${normalizedUrl}`);
        const requestResult = await executeGraphQL(requestMutation, { input: mutationInput }, req);
        if (marketplace === 'AMAZON') {
            ryeProductIdFromTracking = requestResult.data?.requestAmazonProductByURL?.productId;
        } else {
            ryeProductIdFromTracking = requestResult.data?.requestShopifyProductByURL?.productId;
        }
        if (!ryeProductIdFromTracking) {
            throw new Error(`Rye did not return a product ID after requesting tracking for URL: ${normalizedUrl}`);
        }
        console.log(`[API Add Item URL] Rye tracking success. Rye Product ID: ${ryeProductIdFromTracking}`);

        // 3. Fetch Basic Details from Rye (same as Express)
        console.log(`[API Add Item URL] Fetching details from Rye for ID ${ryeProductIdFromTracking} (${marketplace})`);
        const detailsResult = await executeGraphQL(GET_PRODUCT_BY_ID_QUERY, { productId: ryeProductIdFromTracking, marketplace: marketplace }, req);
        const productDataFromRye = detailsResult.data?.productByID;
        if (!productDataFromRye) {
            throw new Error(`Could not fetch product details from Rye for ID ${ryeProductIdFromTracking}.`);
        }

        const definitiveRyeId = productDataFromRye.id; // Use ID from Rye's detailed response
        const definitiveMarketplace = productDataFromRye.marketplace || marketplace;

        // 4. Check if Product Already Exists in LOCAL DB (same as Express)
        // Crucially, check against the definitiveRyeId obtained from Rye's productByID query.
        const [existingItems] = await pool.query(
            'SELECT item_id, name FROM items WHERE rye_product_id = ? AND marketplace = ?', // Simplified check for base products
            [definitiveRyeId, definitiveMarketplace]
        );
        if (existingItems.length > 0) {
            console.log(`[API Add Item URL] Product ${definitiveRyeId} already in local DB (Item ID: ${existingItems[0].item_id}).`);
            return res.status(200).json({
                message: `Item already exists in catalog: ${existingItems[0].name}`,
                item: existingItems[0]
            });
        }

        // 5. Insert New Item into GiftDrive DB (same as Express)
        console.log(`[API Add Item URL] Inserting new item into local DB for Rye ID ${definitiveRyeId}`);
        const insertQuery = `
            INSERT INTO items (name, description, price, category, inventory, image_url, shipping_cost,
                             rye_product_id, marketplace, rye_variant_id, is_rye_linked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`; // is_rye_linked is true
        const priceDecimal = productDataFromRye.price?.value ? (productDataFromRye.price.value / 100).toFixed(2) : null;
        const imageUrl = productDataFromRye.images?.[0]?.url;
        // For base products added this way, rye_variant_id is usually null unless it's an Amazon item where product_id and variant_id are the same (ASIN).
        // Or for Shopify items that have no variants, product_id IS the variant_id.
        // The `definitiveRyeId` is the one to store as `rye_product_id`.
        // `rye_variant_id` can be null or same as `rye_product_id` if it's a single purchasable entity.
        const ryeVariantIdForDb = (definitiveMarketplace === 'AMAZON' || !(productDataFromRye.variants?.length > 0)) ? definitiveRyeId : null;


        const [insertResult] = await pool.query(insertQuery, [
            productDataFromRye.title || 'Untitled Product',
            productDataFromRye.description || null,
            priceDecimal, null, null, imageUrl, null, /* category, inventory, shipping_cost */
            definitiveRyeId, // Store the ID Rye confirmed for this product
            ryeVariantIdForDb, // If it's a base product, variant_id might be null or same as product_id
            definitiveMarketplace
        ]);
        const newItemId = insertResult.insertId;
        console.log(`[API Add Item URL] Item added to local DB. New Item ID: ${newItemId}`);
        const [newItemRows] = await pool.query('SELECT * FROM items WHERE item_id = ?', [newItemId]);

        return res.status(201).json({
            message: 'Item successfully added to catalog.',
            item: newItemRows[0]
        });

    } catch (error) {
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to add item via URL: ${error.message}`,
            details: error.details,
            errorCode: error.errorCode
        });
    }
}