// pages/api/drives/[driveId]/recent-donations.js
import { getDriveRecentDonations } from '../../../../lib/services/driveService'; // IMPORT THE SERVICE

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const { driveId } = req.query;
    try {
        const recentDonations = await getDriveRecentDonations(driveId); // USE THE SERVICE
        return res.status(200).json(recentDonations);
    } catch (error) {
        console.error(`Error fetching recent donations for drive ${driveId}:`, error);
        if (error.message.includes("Invalid Drive ID")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Failed to fetch recent donations.' });
    }
}