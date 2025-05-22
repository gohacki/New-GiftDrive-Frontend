// File: pages/api/rye/webhooks.js
import crypto from 'crypto';
import pool from '../../../config/database'; // Adjust path to your database config

// Rye will send the request body as raw text for signature verification.
// We need to disable Next.js's default body parser for this route.
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper function to get the raw request body
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(Buffer.from(body)));
        req.on('error', err => reject(err));
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    const rawBody = await getRawBody(req);
    const ryeSignature = req.headers['rye-hmac-signature-v1'];
    const webhookSecret = process.env.RYE_WEBHOOK_SECRET_KEY;

    if (!webhookSecret) {
        console.error('RYE_WEBHOOK_SECRET_KEY is not set.');
        return res.status(500).json({ error: 'Webhook secret not configured.' });
    }

    if (!ryeSignature) {
        console.warn('Webhook received without Rye-Hmac-Signature-V1 header.');
        return res.status(400).json({ error: 'Missing signature.' });
    }

    // 1. Verify the signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('base64');

    if (computedSignature !== ryeSignature) {
        console.warn('Webhook signature mismatch.');
        return res.status(401).json({ error: 'Invalid signature.' });
    }

    // 2. Parse the JSON payload
    let payload;
    try {
        payload = JSON.parse(rawBody.toString());
    } catch (e) {
        console.error('Error parsing webhook payload:', e);
        return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    console.log('Received Rye Webhook:', payload.type, payload.id);

    // 3. Handle different webhook event types
    try {
        switch (payload.type) {
            case 'WEBHOOK_URL_VERIFICATION':
                // For initial endpoint verification by Rye
                if (payload.data && payload.data.challenge) {
                    console.log('Responding to WEBHOOK_URL_VERIFICATION challenge.');
                    return res.status(200).json({ challenge: payload.data.challenge });
                }
                break;

            case 'PRODUCT_UPDATED':
                {
                    console.log('Processing PRODUCT_UPDATED event...');
                    const productData = payload.data.product;
                    const marketplace = payload.marketplace.toUpperCase();
                    const ryeId = productData.id; // This is ASIN for Amazon, Variant GID for Shopify

                    const newPrice = productData.price?.value || productData.priceV2?.value; // Value in cents
                    const newIsAvailable = productData.isAvailable;
                    const newInventory = productData.quantityAvailable; // Might be undefined, especially for Amazon

                    if (ryeId && marketplace && newPrice !== undefined && newIsAvailable !== undefined) {
                        const priceInDbFormat = newPrice / 100; // Assuming your DB stores price as decimal

                        let updateQuery;
                        let queryParams = [priceInDbFormat, newIsAvailable]; // Use is_rye_linked for availability

                        if (marketplace === 'SHOPIFY') {
                            updateQuery = `UPDATE items SET price = ?, is_rye_linked = ?`;
                            if (newInventory !== undefined && newInventory !== null) {
                                updateQuery += `, inventory = ?`;
                                queryParams.push(newInventory);
                            }
                            updateQuery += `, last_updated = CURRENT_TIMESTAMP WHERE rye_variant_id = ? AND marketplace = ?`;
                            queryParams.push(ryeId, marketplace);
                        } else if (marketplace === 'AMAZON') {
                            updateQuery = `UPDATE items SET price = ?, is_rye_linked = ?`;
                            // For Amazon, if it becomes unavailable, set inventory to 0.
                            // If it's available but Rye doesn't give specific inventory, you might leave it or set a placeholder.
                            if (!newIsAvailable) {
                                updateQuery += `, inventory = 0`;
                            } else if (newInventory !== undefined && newInventory !== null) {
                                updateQuery += `, inventory = ?`;
                                queryParams.push(newInventory);
                            }
                            updateQuery += `, last_updated = CURRENT_TIMESTAMP WHERE rye_product_id = ? AND marketplace = ?`;
                            queryParams.push(ryeId, marketplace);
                        } else {
                            console.warn(`Unsupported marketplace for PRODUCT_UPDATED: ${marketplace}`);
                            // Acknowledge webhook but don't process
                            return res.status(200).json({ message: 'Webhook acknowledged, unsupported marketplace for update.' });
                        }

                        const [result] = await pool.query(updateQuery, queryParams);
                        if (result.affectedRows > 0) {
                            console.log(`Item ${ryeId} (${marketplace}) updated successfully in local DB.`);
                        } else {
                            console.warn(`No item found to update for ${ryeId} (${marketplace}). It might not be in your catalog or identifiers mismatch.`);
                        }
                    } else {
                        console.warn('PRODUCT_UPDATED webhook missing essential data:', productData);
                    }
                    break;
                }

            case 'PRODUCT_DELETED': // Or whatever Rye calls this event if a product is removed/untracked
                {
                    console.log('Processing PRODUCT_DELETED event...');
                    const deletedProductData = payload.data.product;
                    const deletedMarketplace = payload.marketplace.toUpperCase();
                    const deletedRyeId = deletedProductData.id;

                    if (deletedRyeId && deletedMarketplace) {
                        let deactivateQuery;
                        if (deletedMarketplace === 'SHOPIFY') {
                            deactivateQuery = `UPDATE items SET is_rye_linked = FALSE, inventory = 0, last_updated = CURRENT_TIMESTAMP WHERE rye_variant_id = ? AND marketplace = ?`;
                        } else if (deletedMarketplace === 'AMAZON') {
                            deactivateQuery = `UPDATE items SET is_rye_linked = FALSE, inventory = 0, last_updated = CURRENT_TIMESTAMP WHERE rye_product_id = ? AND marketplace = ?`;
                        } else {
                            console.warn(`Unsupported marketplace for PRODUCT_DELETED: ${deletedMarketplace}`);
                            return res.status(200).json({ message: 'Webhook acknowledged, unsupported marketplace for deactivation.' });
                        }
                        const [deactResult] = await pool.query(deactivateQuery, [deletedRyeId, deletedMarketplace]);
                        if (deactResult.affectedRows > 0) {
                            console.log(`Item ${deletedRyeId} (${deletedMarketplace}) deactivated successfully in local DB.`);
                        } else {
                            console.warn(`No item found to deactivate for ${deletedRyeId} (${deletedMarketplace}).`);
                        }
                    } else {
                        console.warn('PRODUCT_DELETED webhook missing essential data.');
                    }
                    break;
                }

            // Add other event types as needed
            // case 'ORDER_PLACED':
            // case 'ORDER_SHIPPED':
            //    console.log(`Received ${payload.type} event.`);
            //    // Process order-related events if necessary for stock management
            //    break;

            default:
                console.log(`Received unhandled webhook event type: ${payload.type}`);
        }
    } catch (dbError) {
        console.error('Error processing webhook and updating database:', dbError);
        // Don't send 500 for DB errors if Rye might retry.
        // Acknowledge receipt, but log the error for internal review.
        // If Rye retries, you need to handle potential duplicate processing (e.g. check last_updated).
        return res.status(200).json({ message: 'Webhook acknowledged, internal processing error occurred.' });
    }

    // 4. Respond with 200 OK to acknowledge receipt
    res.status(200).json({ message: 'Webhook received successfully.' });
}