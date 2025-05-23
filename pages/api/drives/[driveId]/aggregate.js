// File: pages/api/drives/[driveId]/aggregate.js
import { getDriveAggregates } from '../../../../lib/services/driveService'; // IMPORT THE SERVICE

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const { driveId: driveIdFromQuery } = req.query;
    try {
        const aggregates = await getDriveAggregates(driveIdFromQuery); // USE THE SERVICE FUNCTION
        return res.status(200).json(aggregates);
    } catch (error) {
        console.error(`Error fetching aggregate for drive ${driveIdFromQuery}:`, error);
        if (error.message.includes("Invalid Drive ID")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error while fetching drive aggregates' });
    }
}