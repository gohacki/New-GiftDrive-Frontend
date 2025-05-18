// lib/cartAuthHelper.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]"; // Adjust path as necessary relative to this file
import pool from "../config/database"; // Adjust path as necessary
import { v4 as uuidv4 } from 'uuid'; // Install: npm install uuid

/**
 * Retrieves cart information for the current request, handling both authenticated users and guests.
 * @param {import('next').NextApiRequest} req - The Next.js API request object.
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {Promise<object>} An object containing cart details:
 *  - user: The authenticated user object (null if guest).
 *  - accountIdForDb: The database ID of the authenticated user (null if guest).
 *  - ryeCartId: The Rye cart ID (null if no active cart).
 *  - cartDbId: The local database cart ID (null if no active cart).
 *  - guestCartToken: The guest's cart token from cookies (null if not set or invalid).
 *  - isGuest: Boolean indicating if the current session is for a guest.
 */
export async function getRequestCartInfo(req, res) {
    const session = await getServerSession(req, res, authOptions);
    let user = null;
    let accountIdForDb = null;
    let ryeCartId = null;
    let cartDbId = null;
    let guestCartToken = req.cookies.guestCartToken || null;
    let isGuest = true;

    if (session && session.user) {
        user = session.user;
        accountIdForDb = user.id; // Ensure your session user object has 'id'
        isGuest = false;
        // Try to find cart by account_id for logged-in user
        try {
            const [cartRows] = await pool.query(
                'SELECT id, rye_cart_id FROM carts WHERE account_id = ? AND status = ? LIMIT 1',
                [accountIdForDb, 'active']
            );
            if (cartRows.length > 0) {
                ryeCartId = cartRows[0].rye_cart_id;
                cartDbId = cartRows[0].id;
            }
        } catch (dbError) {
            console.error('getRequestCartInfo: DB error fetching user cart for account_id', accountIdForDb, dbError);
            // Allow to proceed, ryeCartId and cartDbId will be null
        }
    } else if (guestCartToken) {
        // Try to find cart by guestCartToken for guest user
        try {
            const [cartRows] = await pool.query(
                'SELECT id, rye_cart_id FROM carts WHERE guest_session_token = ? AND status = ? AND account_id IS NULL LIMIT 1',
                [guestCartToken, 'active']
            );
            if (cartRows.length > 0) {
                ryeCartId = cartRows[0].rye_cart_id;
                cartDbId = cartRows[0].id;
            } else {
                // Invalid or expired guest token, effectively a new guest session for cart purposes
                console.log(`Guest cart token ${guestCartToken} not found or cart inactive/assigned.`);
                guestCartToken = null; // Clear the token if no valid cart found
            }
        } catch (dbError) {
            console.error('getRequestCartInfo: DB error fetching guest cart for token', guestCartToken, dbError);
            guestCartToken = null; // Clear token on DB error
        }
    }
    return { user, accountIdForDb, ryeCartId, cartDbId, guestCartToken, isGuest };
}

/**
 * Generates a new guest cart token and sets it as an HttpOnly cookie.
 * @param {import('next').NextApiResponse} res - The Next.js API response object.
 * @returns {string} The newly generated guest cart token.
 */
export function setNewGuestCartTokenCookie(res) {
    const newGuestToken = uuidv4();
    const cookieOptions = [
        `guestCartToken=${newGuestToken}`,
        'HttpOnly',
        'Path=/',
        `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
        'SameSite=Lax',
        ...(process.env.NODE_ENV === 'production' ? ['Secure'] : [])
    ];
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    console.log(`Set new guest cart token cookie: ${newGuestToken}`);
    return newGuestToken;
}