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
        console.log(`Webhook: Method ${req.method} Not Allowed`);
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    let rawBody;
    try {
        rawBody = await getRawBody(req);
    } catch (error) {
        console.error('Webhook: Error getting raw body:', error);
        return res.status(500).json({ error: 'Failed to read request body.' });
    }

    const ryeSignature = req.headers['rye-hmac-signature-v1'];
    const webhookSecret = process.env.RYE_WEBHOOK_SECRET_KEY;

    // Try to parse the payload first to check for WEBHOOK_URL_VERIFICATION
    // Rye's example JS verifies signature first, then parses, then checks for challenge.
    // We will stick to that, as it's their example, but this means the secret key MUST be present.

    if (!webhookSecret) {
        console.error('Webhook Critical Error: RYE_WEBHOOK_SECRET_KEY is not set in the environment.');
        // This will prevent the challenge from being responded to if Rye expects signature verification first.
        return res.status(500).json({ error: 'Webhook secret not configured on server.' });
    }

    if (!ryeSignature) {
        console.warn('Webhook Warning: Received request without Rye-Hmac-Signature-V1 header.');
        // If Rye sends the challenge *without* a signature, this block would prevent the challenge response.
        // However, their example JS implies challenge requests ARE signed.
        return res.status(400).json({ error: 'Missing Rye-Hmac-Signature-V1 header.' });
    }

    // 1. Verify the signature (as per Rye's example JS)
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody); // Use the rawBody Buffer directly
    const computedSignature = hmac.digest('base64');

    if (computedSignature !== ryeSignature) {
        console.warn(`Webhook Signature Mismatch. Computed: ${computedSignature}, Received: ${ryeSignature}`);
        return res.status(401).json({ error: 'Invalid signature.' });
    }
    console.log('Webhook: Signature verified successfully.');

    // 2. Parse the JSON payload
    let payload;
    try {
        payload = JSON.parse(rawBody.toString()); // Convert buffer to string before parsing
    } catch (e) {
        console.error('Webhook: Error parsing JSON payload:', e);
        return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    console.log(`Webhook: Received Type: ${payload.type}, ID: ${payload.id}`);

    // 3. Handle different webhook event types
    try {
        if (payload.type === 'WEBHOOK_URL_VERIFICATION') {
            if (payload.data && typeof payload.data.challenge === 'string') {
                console.log('Webhook: Responding to WEBHOOK_URL_VERIFICATION challenge with value:', payload.data.challenge);
                // This is the crucial response for the handshake
                return res.status(200).json({ challenge: payload.data.challenge });
            } else {
                console.warn('Webhook: WEBHOOK_URL_VERIFICATION event received, but challenge data is missing or not a string:', payload.data);
                return res.status(400).json({ error: 'Challenge data missing or invalid in verification request.' });
            }
        }

        // Handle other events like PRODUCT_UPDATED
        switch (payload.type) {
            case 'PRODUCT_UPDATED':
                {
                    console.log('Webhook: Processing PRODUCT_UPDATED event...');
                    const productData = payload.data.product;
                    const marketplace = payload.marketplace?.toUpperCase(); // Use optional chaining
                    const ryeId = productData?.id;

                    const newPriceValue = productData?.price?.value ?? productData?.priceV2?.value; // Value in cents
                    const newIsAvailable = productData?.isAvailable;
                    const newInventory = productData?.quantityAvailable;

                    if (ryeId && marketplace && newPriceValue !== undefined && newIsAvailable !== undefined) {
                        const priceInDbFormat = newPriceValue / 100;

                        let updateQuery;
                        let queryParams = [priceInDbFormat, newIsAvailable];

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
                            if (!newIsAvailable) {
                                updateQuery += `, inventory = 0`;
                            } else if (newInventory !== undefined && newInventory !== null) {
                                updateQuery += `, inventory = ?`;
                                queryParams.push(newInventory);
                            }
                            updateQuery += `, last_updated = CURRENT_TIMESTAMP WHERE rye_product_id = ? AND marketplace = ?`;
                            queryParams.push(ryeId, marketplace);
                        } else {
                            console.warn(`Webhook: Unsupported marketplace for PRODUCT_UPDATED: ${marketplace}`);
                            return res.status(200).json({ message: 'Webhook acknowledged, unsupported marketplace for update.' });
                        }

                        const [result] = await pool.query(updateQuery, queryParams);
                        if (result.affectedRows > 0) {
                            console.log(`Webhook: Item ${ryeId} (${marketplace}) updated successfully in local DB.`);
                        } else {
                            console.warn(`Webhook: No item found to update for ${ryeId} (${marketplace}).`);
                        }
                    } else {
                        console.warn('Webhook: PRODUCT_UPDATED event missing essential data:', productData);
                    }
                    break;
                }

            case 'PRODUCT_DELETED': // Check Rye docs for exact event name
                {
                    console.log('Webhook: Processing PRODUCT_DELETED event...');
                    const deletedProductData = payload.data.product;
                    const deletedMarketplace = payload.marketplace?.toUpperCase();
                    const deletedRyeId = deletedProductData?.id;

                    if (deletedRyeId && deletedMarketplace) {
                        let deactivateQuery;
                        if (deletedMarketplace === 'SHOPIFY') {
                            deactivateQuery = `UPDATE items SET is_rye_linked = FALSE, inventory = 0, last_updated = CURRENT_TIMESTAMP WHERE rye_variant_id = ? AND marketplace = ?`;
                        } else if (deletedMarketplace === 'AMAZON') {
                            deactivateQuery = `UPDATE items SET is_rye_linked = FALSE, inventory = 0, last_updated = CURRENT_TIMESTAMP WHERE rye_product_id = ? AND marketplace = ?`;
                        } else {
                            console.warn(`Webhook: Unsupported marketplace for PRODUCT_DELETED: ${deletedMarketplace}`);
                            return res.status(200).json({ message: 'Webhook acknowledged, unsupported marketplace for deactivation.' });
                        }
                        const [deactResult] = await pool.query(deactivateQuery, [deletedRyeId, deletedMarketplace]);
                        if (deactResult.affectedRows > 0) {
                            console.log(`Webhook: Item ${deletedRyeId} (${deletedMarketplace}) deactivated successfully in local DB.`);
                        } else {
                            console.warn(`Webhook: No item found to deactivate for ${deletedRyeId} (${deletedMarketplace}).`);
                        }
                    } else {
                        console.warn('Webhook: PRODUCT_DELETED event missing essential data.');
                    }
                    break;
                }

            default:
                console.log(`Webhook: Received unhandled event type: ${payload.type}`);
        }
    } catch (dbError) {
        console.error('Webhook: Error processing event and updating database:', dbError);
        return res.status(200).json({ message: 'Webhook acknowledged, internal processing error occurred.' });
    }

    // 4. Respond with 200 OK for non-challenge events
    console.log(`Webhook: Successfully processed event type: ${payload.type}`);
    res.status(200).json({ message: 'Webhook received and processed successfully.' });
}