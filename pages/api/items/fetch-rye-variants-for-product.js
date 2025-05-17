// File: pages/api/items/fetch-rye-variants-for-product.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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

    const { rye_product_id, marketplace } = req.body;

    if (!rye_product_id || !marketplace) {
        return res.status(400).json({ error: 'Rye Product ID and Marketplace are required.' });
    }

    const marketplaceUpper = marketplace.toUpperCase();
    if (marketplaceUpper !== 'SHOPIFY' && marketplaceUpper !== 'AMAZON') {
        return res.status(400).json({ error: 'Invalid marketplace. Must be SHOPIFY or AMAZON.' });
    }

    try {
        const ryeProductDetails = await executeGraphQL(
            GET_PRODUCT_BY_ID_QUERY,
            { productId: rye_product_id, marketplace: marketplaceUpper },
            req // Pass req for Rye-Shopper-IP
        );

        const productFromRye = ryeProductDetails.data?.productByID;
        if (!productFromRye) {
            return res.status(404).json({ error: 'Product not found on Rye.' });
        }

        // Your existing logic for simplifying variants
        const variantsFromRye = productFromRye.variants || [];
        const simplifiedVariants = variantsFromRye.map(v => ({
            id: v.id,
            title: v.title,
            // Ensure price object structure is consistent or handled by frontend
            price: v.priceV2 || v.price, // Prefer priceV2 for Shopify
            priceV2: v.priceV2, // Keep priceV2 for more detailed info if available
            isAvailable: v.isAvailable !== undefined ? v.isAvailable : true,
            image: v.image, // Keep full image object { url }
            option1: v.option1 || null,
            option2: v.option2 || null,
            option3: v.option3 || null,
            dimensions: v.dimensions || null,
        }));

        return res.status(200).json({
            baseProductName: productFromRye.title,
            baseProductImage: productFromRye.images?.[0]?.url,
            variants: simplifiedVariants
        });

    } catch (error) {
        logApiError(error);
        let clientErrorMessage = 'Failed to fetch product variants.';
        if (error.errorCode === 'PRODUCT_NOT_FOUND' || error.statusCode === 404) {
            clientErrorMessage = 'The specified product could not be found on the marketplace.';
        }
        return res.status(error.statusCode || 500).json({
            error: clientErrorMessage,
            details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
            errorCode: error.errorCode
        });
    }
}