// File: pages/api/organizations/cities.js
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const { state } = req.query;
    let query = 'SELECT DISTINCT city FROM organizations WHERE city IS NOT NULL AND city != ""'; // Ensure city is not empty
    const queryParams = [];
    if (state && state !== 'All') {
        query += ' AND state = ?';
        queryParams.push(state);
    }
    query += ' ORDER BY city ASC';
    try {
        const [cities] = await pool.query(query, queryParams);
        const cityList = cities.map((row) => row.city);
        return res.status(200).json(cityList);
    } catch (error) {
        console.error('Error fetching cities:', error);
        return res.status(500).json({ error: 'Database error' });
    }
}