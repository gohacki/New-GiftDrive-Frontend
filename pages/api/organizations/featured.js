// File: pages/api/organizations/featured.js
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { search, state, city, featured, page = 1, limit = 6 } = req.query;
    // Your existing query logic
    let query = 'SELECT org_id, name, description, photo, address, city, state, zip_code, website_link, phone, is_featured, country FROM organizations WHERE 1=1';
    const queryParams = [];

    if (search && typeof search === 'string' && search.trim() !== '') {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm);
    }
    if (state && state !== 'All') {
        query += ' AND state = ?';
        queryParams.push(state);
    }
    if (city && city !== 'All') {
        query += ' AND city = ?';
        queryParams.push(city);
    }
    if (featured === 'true') { // Ensure boolean check or string 'true'
        query += ' AND is_featured = TRUE';
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit, 10), parseInt(offset, 10));

    try {
        const [results] = await pool.query(query, queryParams);
        return res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching featured organizations:', err);
        return res.status(500).json({ error: 'Database error' });
    }
}