// File: pages/api/search/suggestions.js
import pool from "../../../config/database"; // Adjust path as necessary

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const query = req.query.q; // Access query parameter 'q'

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(200).json([]); // Return empty array for invalid/short query
    }

    const searchTerm = `%${query.trim()}%`;
    const suggestionLimitPerType = 5;
    const totalSuggestionLimit = 10;

    try {
        let suggestions = [];

        // Fetch matching drives
        // Added a check for active drives (start_date <= NOW() AND end_date >= NOW())
        // and also future drives (start_date > NOW()) to make suggestions more relevant.
        // You can adjust this logic based on what drives you want to suggest.
        const [driveRows] = await pool.query(
            `SELECT drive_id as id, name, 'drive' as type
             FROM drives
             WHERE name LIKE ?
               AND (
                     (start_date <= NOW() AND end_date >= NOW()) OR -- Current drives
                     (start_date > NOW())                            -- Future drives
                   )
             ORDER BY CASE
                        WHEN start_date <= NOW() AND end_date >= NOW() THEN 1 -- Prioritize current drives
                        WHEN start_date > NOW() THEN 2                        -- Then future drives
                        ELSE 3
                      END,
                      name ASC
             LIMIT ?`,
            [searchTerm, suggestionLimitPerType]
        );
        suggestions = suggestions.concat(driveRows);

        // Fetch matching organizations
        // Added a check for is_featured or a general activity indicator if you have one.
        // For now, just ordering by name.
        const [orgRows] = await pool.query(
            `SELECT org_id as id, name, 'organization' as type
             FROM organizations
             WHERE name LIKE ?
             ORDER BY is_featured DESC, name ASC -- Prioritize featured organizations
             LIMIT ?`,
            [searchTerm, suggestionLimitPerType]
        );
        suggestions = suggestions.concat(orgRows);

        // Simple sort: Drives first, then organizations, then by name.
        // You might want a more sophisticated relevance sorting here.
        suggestions.sort((a, b) => {
            if (a.type === 'drive' && b.type !== 'drive') return -1;
            if (a.type !== 'drive' && b.type === 'drive') return 1;
            return a.name.localeCompare(b.name);
        });


        const limitedSuggestions = suggestions.slice(0, totalSuggestionLimit);

        return res.status(200).json(limitedSuggestions);

    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        return res.status(500).json({ error: 'Failed to fetch search suggestions.' });
    }
}