// File: pages/api/auth/me.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]"; // Import your authOptions

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);

    if (session && session.user) {
        // The session.user object contains what you returned from the `session` callback in [...nextauth].js
        // and what was put into the token by the `jwt` callback.
        return res.status(200).json({ user: session.user });
    } else {
        return res.status(401).json({ message: "Not authenticated" });
    }
}