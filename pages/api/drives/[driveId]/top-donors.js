// pages/api/drives/[driveId]/top-donors.js
import { getDriveTopDonors } from '../../../../lib/services/driveService'; // IMPORT THE SERVICE

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const { driveId } = req.query;
    try {
        const topDonors = await getDriveTopDonors(driveId); // USE THE SERVICE
        return res.status(200).json(topDonors);
    } catch (error) {
        console.error(`Error fetching top donors for drive ${driveId}:`, error);
        if (error.message.includes("Invalid Drive ID")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Failed to fetch top donors.' });
    }
}