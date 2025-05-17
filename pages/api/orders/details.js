// File: pages/api/orders/details.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { executeGraphQL, logApiError, GET_ORDER_DETAILS_QUERY } from "../../../lib/ryeHelpers";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = session.user.id;
    const { ryeOrderId } = req.body;

    if (!ryeOrderId) {
        return res.status(400).json({ error: 'Rye Order ID is required.' });
    }

    try {
        // Verify Ownership
        console.log(`Verifying ownership for Rye Order ID ${ryeOrderId}, User ${userId}`);
        const [orderCheck] = await pool.query(
            'SELECT order_id FROM orders WHERE primary_rye_order_id = ? AND account_id = ?',
            [ryeOrderId, userId]
        );
        if (orderCheck.length === 0) {
            return res.status(404).json({ error: "Order not found or you do not have permission to view it." });
        }
        console.log(`Ownership verified for Rye Order ID ${ryeOrderId}.`);

        // Fetch Details from Rye
        console.log(`Fetching details from Rye API for Order ID: ${ryeOrderId}`);
        const result = await executeGraphQL(GET_ORDER_DETAILS_QUERY, { orderId: ryeOrderId }, req); // Pass req for IP
        const orderDetails = result.data?.orderByID;

        if (!orderDetails) {
            console.warn(`Rye returned null or no data for orderByID query with ID ${ryeOrderId}`);
            return res.status(404).json({ error: 'Order details not found on Rye.' });
        }

        console.log(`Successfully fetched details for Rye Order ID: ${ryeOrderId}`);
        return res.status(200).json(orderDetails);

    } catch (error) {
        logApiError(error);
        return res.status(error.statusCode || 500).json({
            error: `Failed to fetch order details: ${error.message}`,
            details: error.details,
            errorCode: error.errorCode
        });
    }
}