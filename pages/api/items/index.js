// File: pages/api/items/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // Adjust path
import pool from "../../../config/database";         // Adjust path

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user) { // Ensure user is authenticated
            return res.status(401).json({ message: "Not authenticated" });
        }

        try {
            // Your existing query to fetch linkable items
            // Added search functionality based on your AddItemBlade component
            const searchQuery = req.query.search;
            let itemsQuery = `
                SELECT item_id, name, price, image_url, marketplace, 
                       rye_product_id, rye_variant_id, is_rye_linked
                FROM items
                WHERE is_rye_linked = TRUE 
            `;
            const queryParams = [];

            if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim() !== '') {
                itemsQuery += ` AND (name LIKE ? OR description LIKE ?) `; // Search name and description
                const searchTerm = `%${searchQuery.trim()}%`;
                queryParams.push(searchTerm, searchTerm);
            }
            itemsQuery += ` ORDER BY name ASC`;
            // Add LIMIT if needed for pagination, e.g., itemsQuery += ` LIMIT 20`;

            const [items] = await pool.query(itemsQuery, queryParams);
            return res.status(200).json(items);
        } catch (error) {
            console.error('Error fetching internal items:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}