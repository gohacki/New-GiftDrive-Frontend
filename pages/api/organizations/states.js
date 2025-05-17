// File: pages/api/organizations/states.js
import pool from "../../../config/database";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    try {
        const [states] = await pool.query(
            'SELECT DISTINCT state FROM organizations WHERE state IS NOT NULL AND state != "" ORDER BY state ASC' // Ensure state is not empty string
        );
        const stateList = states.map((row) => row.state);
        return res.status(200).json(stateList);
    } catch (error) {
        console.error('Error fetching states:', error);
        return res.status(500).json({ error: 'Database error' });
    }
}