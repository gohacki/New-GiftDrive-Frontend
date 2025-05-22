import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // const session = await getServerSession(req, res, authOptions); // Session can still be fetched if needed for optional claims

    // If the JWT for RyePay is for server-to-Rye authentication and doesn't require
    // user-specific claims from *your* application's session in its payload,
    // then this strict authentication check can be removed to support guests.
    // Currently, the JWT payload is empty: {}.
    /*
    if (!session || !session.user) {
        return res.status(401).json({ message: "Not authenticated. Cannot generate payment token." });
    }
    */

    try {
        const privateKeyPem = process.env.RYE_PAY_JWT_PRIVATE_KEY;
        const issuer = process.env.RYE_PAY_JWT_ISSUER;
        const audience = process.env.RYE_PAY_JWT_AUDIENCE;

        if (!privateKeyPem || !issuer || !audience) {
            console.error("Rye Pay JWT generation: Missing one or more required environment variables (RYE_PAY_JWT_PRIVATE_KEY, RYE_PAY_JWT_ISSUER, RYE_PAY_JWT_AUDIENCE).");
            return res.status(500).json({ error: 'Server configuration error for JWT generation.' });
        }

        // Ensure newlines in the PEM key are correctly interpreted
        const privateKey = privateKeyPem.replace(/\\n/g, '\n');

        const token = jwt.sign(
            {}, // Payload can be empty or include non-sensitive, session-agnostic data if Rye requires
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: '1h', // Max 1 hour as per Rye docs
                audience: audience,
                issuer: issuer,
                // subject: session?.user?.id // Example: Optional, only if session exists and is needed by Rye
            }
        );

        return res.status(200).json({ token });

    } catch (error) {
        console.error("Error generating Rye Pay JWT:", error);
        if (error.message.includes('PEM routines') || error.message.includes('key') || error.name === 'JsonWebTokenError') {
            console.error("Rye Pay JWT generation: Issue with private key format or signing.");
            return res.status(500).json({ error: 'JWT signing error due to key or configuration issue.' });
        }
        return res.status(500).json({ error: 'Failed to generate payment JWT.' });
    }
}