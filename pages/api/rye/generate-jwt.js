// File: pages/api/rye/generate-jwt.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // Adjust path as necessary
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    // Ensure the user is authenticated before generating a JWT for payment
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated. Cannot generate payment token." });
    }

    try {
        const privateKeyPem = process.env.RYE_PAY_JWT_PRIVATE_KEY;
        const issuer = process.env.RYE_PAY_JWT_ISSUER;
        const audience = process.env.RYE_PAY_JWT_AUDIENCE;

        if (!privateKeyPem || !issuer || !audience) {
            console.error("Rye Pay JWT generation: Missing one or more required environment variables (RYE_PAY_JWT_PRIVATE_KEY, RYE_PAY_JWT_ISSUER, RYE_PAY_JWT_AUDIENCE).");
            return res.status(500).json({ error: 'Server configuration error for JWT generation.' });
        }

        // Environment variables often store newlines as literal '\n'.
        // The jsonwebtoken library expects actual newline characters in the PEM key.
        const privateKey = privateKeyPem.replace(/\\n/g, '\n');

        const token = jwt.sign(
            {}, // Payload can be empty as per Rye Pay docs, or include user-specific claims if needed/allowed by Rye
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: '1h', // Max 1 hour
                audience: audience,
                issuer: issuer,
                // subject: session.user.id // Optional: include user ID as subject if useful for auditing/Rye
            }
        );

        return res.status(200).json({ token });

    } catch (error) {
        console.error("Error generating Rye Pay JWT:", error);
        // Differentiate between configuration errors and signing errors
        if (error.message.includes('PEM routines') || error.message.includes('key') || error.name === 'JsonWebTokenError') {
            console.error("Rye Pay JWT generation: Issue with private key format or signing.");
            return res.status(500).json({ error: 'JWT signing error due to key or configuration issue.' });
        }
        return res.status(500).json({ error: 'Failed to generate payment JWT.' });
    }
}