// File: lib/services/organizationService.js
import pool from '../../config/database'; // Adjust path if your config/database.js is elsewhere

/**
 * Fetches core organization details and its active/future drives.
 * (Logic from pages/api/organizations/[orgId].js GET handler)
 */
export async function getOrganizationDetailsWithDrives(orgId) {
    const numericOrgId = parseInt(orgId, 10);
    if (isNaN(numericOrgId)) {
        throw new Error("Invalid Organization ID format.");
    }

    // 1. Fetch organization details
    const [orgResults] = await pool.query(
        'SELECT org_id, name, description, photo, address, city, state, zip_code, website_link, phone, is_featured, country FROM organizations WHERE org_id = ?',
        [numericOrgId]
    );

    if (orgResults.length === 0) {
        return null; // Or throw a custom "NotFound" error
    }
    const organization = orgResults[0];

    // 2. Fetch active/future drives for this organization
    // (Includes drives that are current or start in the future)
    const [drives] = await pool.query(
        'SELECT drive_id, name, description, photo, start_date, end_date FROM drives WHERE org_id = ? AND end_date >= CURDATE() ORDER BY start_date ASC',
        [numericOrgId]
    );
    organization.drives = drives || [];

    // 3. Track Page View (as it was in the original API route)
    // This can be done asynchronously without awaiting, so it doesn't block the main data fetch.
    pool.query(
        `INSERT INTO page_views (org_id, view_date, view_count)
         VALUES (?, CURDATE(), 1)
         ON DUPLICATE KEY UPDATE view_count = view_count + 1`,
        [numericOrgId]
    ).catch(trackError => {
        console.error(`Page view tracking error for org ${numericOrgId}:`, trackError);
    });


    return organization;
}