// File: pages/api/auth/register-user.js
import pool from '../../../config/database'; // Adjust path as necessary

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { username, email, password } = req.body;

    // Basic validation (consider a more robust library like Zod or Joi for complex validation)
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (password.length < 6) { // Example: Minimum password length
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const [existingUsers] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email already exists.' }); // 409 Conflict
        }
        // Optionally, you could fetch the newly created user data if needed by the client
        // For now, just confirm success. The client will then call signIn.
        res.status(201).json({ message: 'User registered successfully. Please log in.' });

    } catch (error) {
        console.error('Registration API Error:', error);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
}