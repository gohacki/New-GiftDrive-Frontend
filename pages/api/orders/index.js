// File: pages/api/orders/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // Adjust path
import pool from "../../../config/database";         // Adjust path

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const accountId = session.user.id; // Use user.id from Auth.js session

    try {
        console.log(`Fetching order list for user ${accountId} from local DB`);
        const [orders] = await pool.query(
            `SELECT
                order_id,
                primary_rye_order_id,
                status,
                total_amount,
                currency,
                order_date
             FROM orders
             WHERE account_id = ?
             ORDER BY order_date DESC`,
            [accountId]
        );
        console.log(`Found ${orders.length} orders for user ${accountId}`);
        return res.status(200).json(orders);
    } catch (err) {
        console.error(`Error fetching orders for user ${accountId}:`, err);
        return res.status(500).json({ error: 'Database error fetching order history' });
    }
}