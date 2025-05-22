// File: pages/api/organizations/states.js
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    // This query is for fetching a distinct list of states that exist in the organizations table.
    // The 'state' query parameter is not used in this specific SQL query.
    let query = 'SELECT DISTINCT state FROM organizations WHERE state IS NOT NULL AND TRIM(state) <> \'\' ORDER BY state ASC';
    // No queryParams needed for this specific query as it stands.

    try {
        const [states] = await pool.query(query); // No queryParams passed here
        const stateList = states.map((row) => row.state);
        return res.status(200).json(stateList);
    } catch (error) {
        console.error('Error fetching states:', error);
        return res.status(500).json({ error: 'Database error fetching states' }); // More specific error
    }
}