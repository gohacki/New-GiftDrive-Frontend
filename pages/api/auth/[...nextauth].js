// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from 'bcrypt';
import pool from "../../../config/database"; // Adjust path to your DB config

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
                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
                    if (rows.length === 0) {
                        throw new Error("Invalid credentials.");
                    }
                    const user = rows[0];
                    const match = await bcrypt.compare(password, user.password_hash);
                    if (!match) {
                        throw new Error("Invalid credentials.");
                    }
                    return {
                        id: user.account_id,
                        name: user.username,
                        email: user.email,
                        is_org_admin: user.is_org_admin,
                        is_super_admin: user.is_super_admin,
                        org_id: user.org_id,
                        profile_picture_url: user.profile_picture_url, // ADDED
                    };
                } catch (error) {
                    console.error("Auth.js CredentialsProvider error:", error);
                    throw new Error(error.message || "Authentication failed.");
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
            if (user) { // Initial sign-in
                token.id = user.id;
                token.is_org_admin = user.is_org_admin;
                token.is_super_admin = user.is_super_admin;
                token.org_id = user.org_id;
                token.email = user.email;
                token.name = user.name;
                token.profile_picture_url = user.profile_picture_url;
            }

            if (account && profile) { // OAuth sign-in (Google, Facebook)
                try {
                    const emailFromOAuth = profile.email; // Prefer profile.email for OAuth
                    const nameFromOAuth = profile.name;
                    let profilePictureFromOAuth = null;

                    if (account.provider === "google") {
                        profilePictureFromOAuth = profile.picture; // Standard for Google
                    } else if (account.provider === "facebook") {
                        // For Facebook, picture might be profile.picture?.data?.url if requested correctly
                        // or construct: `https://graph.facebook.com/${profile.id}/picture?type=large`
                        // Assuming profile.picture is directly available or you've configured fields
                        profilePictureFromOAuth = profile.picture;
                    }

                    if (!emailFromOAuth) {
                        console.error(`OAuth login error: Email not provided by ${account.provider}. Profile:`, profile);
                        // It's crucial to have an email. You might want to throw an error or handle this case.
                        // For now, let's prevent proceeding without email.
                        return Promise.reject(new Error(`Email not provided by ${account.provider}. Cannot link account.`));
                    }

                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [emailFromOAuth]);
                    let dbUser;

                    if (rows.length > 0) {
                        dbUser = rows[0];
                        // User exists, update OAuth IDs and profile picture if necessary
                        let updateFields = {};

                        if (account.provider === "google" && !dbUser.google_id) {
                            updateFields.google_id = profile.sub || account.providerAccountId;
                        }
                        if (account.provider === "facebook" && !dbUser.facebook_id) {
                            updateFields.facebook_id = profile.id || account.providerAccountId;
                        }
                        // Only update profile picture from OAuth if it's not already set in DB
                        // or if you want OAuth picture to always override an empty one.
                        if (profilePictureFromOAuth && !dbUser.profile_picture_url) {
                            updateFields.profile_picture_url = profilePictureFromOAuth;
                        }

                        if (Object.keys(updateFields).length > 0) {
                            const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                            const valuesForUpdate = [...Object.values(updateFields), dbUser.account_id];
                            await pool.query(`UPDATE accounts SET ${setClauses} WHERE account_id = ?`, valuesForUpdate);

                            // Update dbUser object with new values for token assignment
                            if (updateFields.google_id) dbUser.google_id = updateFields.google_id;
                            if (updateFields.facebook_id) dbUser.facebook_id = updateFields.facebook_id;
                            if (updateFields.profile_picture_url) dbUser.profile_picture_url = updateFields.profile_picture_url;
                        }
                    } else {
                        // New user via OAuth, create them
                        const [result] = await pool.query(
                            'INSERT INTO accounts (email, username, google_id, facebook_id, profile_picture_url, is_org_admin, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [
                                emailFromOAuth,
                                nameFromOAuth || emailFromOAuth, // Fallback username to email if name not present
                                account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                                account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                                profilePictureFromOAuth,
                                false, // Default value for is_org_admin
                                false  // Default value for is_super_admin
                            ]
                        );
                        dbUser = {
                            account_id: result.insertId,
                            email: emailFromOAuth,
                            username: nameFromOAuth || emailFromOAuth,
                            is_org_admin: false,
                            is_super_admin: false,
                            org_id: null,
                            profile_picture_url: profilePictureFromOAuth,
                            google_id: account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                            facebook_id: account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                        };
                    }

                    // Update token with consistent DB user's info
                    token.id = dbUser.account_id;
                    token.is_org_admin = dbUser.is_org_admin;
                    token.is_super_admin = dbUser.is_super_admin;
                    token.org_id = dbUser.org_id;
                    token.email = dbUser.email; // Ensure email is from DB record
                    token.name = dbUser.username;   // Ensure name is from DB record
                    token.profile_picture_url = dbUser.profile_picture_url;

                } catch (dbError) {
                    console.error("Auth.js OAuth DB Error:", dbError);
                    // Propagate the error so NextAuth can handle it (e.g., show an error page)
                    return Promise.reject(new Error("Error processing social login with database."));
                }
            }
            return token;
        },


        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.is_org_admin = token.is_org_admin;
                session.user.is_super_admin = token.is_super_admin;
                session.user.org_id = token.org_id;
                session.user.profile_picture_url = token.profile_picture_url; // ADDED
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
    },
};

export default NextAuth(authOptions);