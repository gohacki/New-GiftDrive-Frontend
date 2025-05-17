// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from 'bcrypt';
import pool from "../../../config/database"; // Adjust path to your DB config

export const authOptions = {
    providers: [
        // a. Credentials Provider (for your existing email/password login)
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials || !credentials.email || !credentials.password) {
                    throw new Error("Email and password required");
                }

                const { email, password } = credentials;

                try {
                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
                    if (rows.length === 0) {
                        console.log(`Auth.js: No user found with email ${email}`);
                        throw new Error("Invalid credentials."); // Generic error for security
                    }

                    const user = rows[0];
                    const match = await bcrypt.compare(password, user.password_hash);

                    if (!match) {
                        console.log(`Auth.js: Password mismatch for email ${email}`);
                        throw new Error("Invalid credentials."); // Generic error
                    }

                    console.log(`Auth.js: User ${email} authenticated successfully.`);
                    // Return user object that will be stored in the JWT/session
                    // Ensure it doesn't contain sensitive info like password_hash
                    return {
                        id: user.account_id, // Use account_id as the primary ID
                        name: user.username,
                        email: user.email,
                        is_org_admin: user.is_org_admin,
                        is_super_admin: user.is_super_admin,
                        org_id: user.org_id,
                        // Add any other user properties you need in the session
                    };
                } catch (error) {
                    console.error("Auth.js CredentialsProvider error:", error);
                    // Throw the error to be caught by NextAuth, which will then show an error on the login page
                    // or you can return null to indicate authentication failure.
                    throw new Error(error.message || "Authentication failed.");
                }
            }
        }),

        // b. Google Provider (if you used it)
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // The authorization object is optional if you only need basic profile/email
            // authorization: {
            //   params: {
            //     prompt: "consent",
            //     access_type: "offline",
            //     response_type: "code"
            //   }
            // }
        }),

        // c. Facebook Provider (if you used it)
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
        }),
        // Add other providers if needed
    ],

    session: {
        strategy: "jwt", // Using JWTs for session strategy is common
    },

    callbacks: {
        // The `jwt` callback is called when a JWT is created (i.e. on sign in) or updated.
        // The returned value will be encrypted and stored in a cookie.
        async jwt({ token, user, account, profile }) {
            // `user` is only passed on initial sign-in.
            // `account` and `profile` are only passed on OAuth sign-in.
            if (user) { // On sign-in (Credentials or OAuth)
                token.id = user.id; // `user.id` comes from the `authorize` or OAuth profile
                token.is_org_admin = user.is_org_admin;
                token.is_super_admin = user.is_super_admin;
                token.org_id = user.org_id;
                token.email = user.email; // Ensure email is in token
                token.name = user.name;   // Ensure name is in token
            }
            if (account?.provider === "google" || account?.provider === "facebook") {
                // This is where you'd handle linking OAuth accounts to your DB users
                // or creating new users in your DB if they don't exist.
                // Your existing Passport logic for Google/Facebook strategy callbacks can be adapted here.
                // For example:
                try {
                    const emailFromOAuth = profile.email || user.email; // `profile` for OAuth, `user` for Credentials
                    if (emailFromOAuth) {
                        const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [emailFromOAuth]);
                        let dbUser;
                        if (rows.length > 0) {
                            dbUser = rows[0];
                            // Potentially update user info from OAuth if needed
                        } else {
                            // Create new user if they don't exist (common for social logins)
                            const [result] = await pool.query(
                                'INSERT INTO accounts (email, username, google_id, facebook_id) VALUES (?, ?, ?, ?)',
                                [
                                    emailFromOAuth,
                                    profile.name || user.name,
                                    account.provider === "google" ? profile.sub || account.providerAccountId : null,
                                    account.provider === "facebook" ? profile.id || account.providerAccountId : null,
                                ]
                            );
                            dbUser = {
                                account_id: result.insertId,
                                email: emailFromOAuth,
                                username: profile.name || user.name,
                                is_org_admin: false, // default values
                                is_super_admin: false,
                                org_id: null,
                            };
                        }
                        // Update token with your DB user's info
                        token.id = dbUser.account_id;
                        token.is_org_admin = dbUser.is_org_admin;
                        token.is_super_admin = dbUser.is_super_admin;
                        token.org_id = dbUser.org_id;
                        token.email = dbUser.email;
                        token.name = dbUser.username;
                    }
                } catch (dbError) {
                    console.error("Auth.js OAuth DB Error:", dbError);
                    return Promise.reject(new Error("Error processing social login with database."));
                }
            }
            return token;
        },

        // The `session` callback is called when a session is checked.
        // The `token` object is what was returned from the `jwt` callback.
        async session({ session, token }) {
            // Send properties to the client, like an access_token and user id from the token.
            if (token) {
                session.user.id = token.id;
                session.user.is_org_admin = token.is_org_admin;
                session.user.is_super_admin = token.is_super_admin;
                session.user.org_id = token.org_id;
                // session.user.email = token.email; // Email is usually already in session.user
                // session.user.name = token.name;   // Name is usually already in session.user
            }
            return session;
        }
    },

    // Optional: Define custom pages if you don't want to use NextAuth's default pages
    pages: {
        signIn: '/auth/login', // Your existing login page path
        // error: '/auth/error', // (Optional) Custom error page
        // signOut: '/auth/logout', // (Optional)
    },

    // Add other configurations as needed (e.g., adapter if using a DB for sessions directly, debug options)
    // secret: process.env.NEXTAUTH_SECRET, // Already covered by NEXTAUTH_SECRET env var
    // debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);