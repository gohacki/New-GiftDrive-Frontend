// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from 'bcrypt';
import pool from "../../../config/database";
import crypto from 'crypto';

export const authOptions = {
    providers: [
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
                    const [rows] = await pool.query(
                        'SELECT * FROM accounts WHERE email = ? AND deactivated_at IS NULL', // Check for active account
                        [email]
                    );
                    if (rows.length === 0) {
                        // Generic error to prevent account enumeration
                        throw new Error("Invalid credentials or account is deactivated.");
                    }
                    const user = rows[0];

                    if (!user.password_hash) {
                        // This account was created via OAuth and has no local password
                        throw new Error("Please sign in using the method you originally registered with (e.g., Google or Facebook).");
                    }

                    const match = await bcrypt.compare(password, user.password_hash);
                    if (!match) {
                        throw new Error("Invalid credentials.");
                    }
                    return {
                        id: user.account_id,
                        name: user.username,
                        email: user.email,
                        is_org_admin: !!user.is_org_admin,
                        is_super_admin: !!user.is_super_admin,
                        org_id: user.org_id,
                        profile_picture_url: user.profile_picture_url,
                        email_verified_at: user.email_verified_at,
                        provider: 'credentials', // Explicitly set provider
                        deactivated_at: user.deactivated_at, // Pass this along
                    };
                } catch (error) {
                    console.error("Auth.js CredentialsProvider error:", error);
                    // For client, always return a generic error for security.
                    throw new Error("Authentication failed. Please check your credentials or account status.");
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
        }),
    ],

    session: {
        strategy: "jwt",
    },

    callbacks: {
        async jwt({ token, user, account, profile }) {
            // 'user' is passed on initial sign-in (credentials or first OAuth login for a new/updated DB user)
            // 'account' is passed on OAuth sign-ins
            if (user) {
                // If account is deactivated, user object from authorize might already indicate this.
                // Or if user object comes from OAuth flow where dbUser was fetched.
                if (user.deactivated_at) {
                    return Promise.reject(new Error("Account is deactivated."));
                }
                token.id = user.id;
                token.is_org_admin = user.is_org_admin;
                token.is_super_admin = user.is_super_admin;
                token.org_id = user.org_id;
                token.email = user.email;
                token.name = user.name;
                token.profile_picture_url = user.profile_picture_url;
                token.email_verified_at = user.email_verified_at;
                token.deactivated_at = user.deactivated_at; // Store deactivation status
                if (user.provider) { // From CredentialsProvider
                    token.provider = user.provider;
                }
            }

            if (account) { // This block runs for OAuth sign-ins (Google, Facebook)
                token.provider = account.provider; // Store the OAuth provider

                try {
                    const emailFromOAuth = profile.email;
                    const nameFromOAuth = profile.name;
                    let profilePictureFromOAuth = null;

                    if (account.provider === "google") profilePictureFromOAuth = profile.picture;
                    else if (account.provider === "facebook" && profile.picture) profilePictureFromOAuth = profile.picture.data?.url || profile.picture;


                    if (!emailFromOAuth) {
                        return Promise.reject(new Error(`Email not provided by ${account.provider}.`));
                    }

                    // Check if user exists and is active
                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [emailFromOAuth]);
                    let dbUser;

                    if (rows.length > 0) {
                        dbUser = rows[0];
                        if (dbUser.deactivated_at) { // If existing user is deactivated
                            return Promise.reject(new Error("Account is deactivated."));
                        }
                        // User exists and is active, update OAuth IDs and profile picture if necessary
                        let updateFields = {};
                        if (account.provider === "google" && !dbUser.google_id) updateFields.google_id = profile.sub || account.providerAccountId;
                        if (account.provider === "facebook" && !dbUser.facebook_id) updateFields.facebook_id = profile.id || account.providerAccountId;
                        if (profilePictureFromOAuth && !dbUser.profile_picture_url) updateFields.profile_picture_url = profilePictureFromOAuth;
                        if (!dbUser.email_verified_at) updateFields.email_verified_at = new Date(); // Auto-verify for OAuth

                        if (Object.keys(updateFields).length > 0) {
                            const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                            const valuesForUpdate = [...Object.values(updateFields), dbUser.account_id];
                            await pool.query(`UPDATE accounts SET ${setClauses} WHERE account_id = ?`, valuesForUpdate);
                            Object.assign(dbUser, updateFields); // Update local dbUser object
                        }
                    } else {
                        // New user via OAuth, create them (already active by default)
                        const verificationToken = crypto.randomBytes(32).toString('hex'); // For consistency, can be ignored for OAuth
                        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000);

                        const [result] = await pool.query(
                            'INSERT INTO accounts (email, username, google_id, facebook_id, profile_picture_url, is_org_admin, is_super_admin, email_verified_at, email_verification_token, email_verification_token_expires_at, is_active, deactivated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NULL)',
                            [
                                emailFromOAuth, nameFromOAuth || emailFromOAuth,
                                account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                                account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                                profilePictureFromOAuth, false, false, new Date(), // Auto-verify
                                verificationToken, verificationTokenExpiresAt
                            ]
                        );
                        dbUser = {
                            account_id: result.insertId, email: emailFromOAuth, username: nameFromOAuth || emailFromOAuth,
                            is_org_admin: false, is_super_admin: false, org_id: null,
                            profile_picture_url: profilePictureFromOAuth, email_verified_at: new Date(),
                            deactivated_at: null, // New users are active
                            google_id: account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                            facebook_id: account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                        };
                    }
                    // Update token with dbUser info (which is confirmed active or newly created active)
                    token.id = dbUser.account_id;
                    token.is_org_admin = !!dbUser.is_org_admin;
                    token.is_super_admin = !!dbUser.is_super_admin;
                    token.org_id = dbUser.org_id;
                    token.email = dbUser.email;
                    token.name = dbUser.username;
                    token.profile_picture_url = dbUser.profile_picture_url;
                    token.email_verified_at = dbUser.email_verified_at;
                    token.deactivated_at = dbUser.deactivated_at; // Will be null for active users
                } catch (dbError) {
                    console.error("Auth.js OAuth DB Error:", dbError);
                    return Promise.reject(new Error("Error processing social login."));
                }
            }

            // Final check: If token somehow has deactivated_at, reject
            if (token.deactivated_at) {
                return Promise.reject(new Error("Account is deactivated."));
            }
            return token;
        },

        async session({ session, token }) {
            // If token was rejected in jwt callback (e.g., due to deactivation),
            // NextAuth should not create an authenticated session.
            // This callback primarily copies properties from a valid token to the session.
            if (token && !token.deactivated_at) { // Ensure token implies active user
                session.user.id = token.id;
                session.user.is_org_admin = token.is_org_admin;
                session.user.is_super_admin = token.is_super_admin;
                session.user.org_id = token.org_id;
                session.user.profile_picture_url = token.profile_picture_url;
                session.user.email_verified_at = token.email_verified_at;
                session.user.provider = token.provider;
                session.user.deactivated_at = token.deactivated_at; // For client-side info, though access controlled by JWT
            } else {
                // If token indicates deactivated or is otherwise invalid, ensure session.user is cleared
                // This case should ideally be handled by NextAuth not calling session callback if JWT is rejected.
                // session.user = null; // Or an empty object to signify no authenticated user.
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login', // Redirect to login on auth errors, can show error query param
    },
};

export default NextAuth(authOptions);