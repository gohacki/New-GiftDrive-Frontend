// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from 'bcrypt';
import pool from "../../../config/database";
import crypto from 'crypto'; // For email verification token generation if needed

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
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
                    return { // This object is passed to the 'user' param in jwt callback
                        id: user.account_id,
                        name: user.username,
                        email: user.email,
                        is_org_admin: user.is_org_admin,
                        is_super_admin: user.is_super_admin,
                        org_id: user.org_id,
                        profile_picture_url: user.profile_picture_url,
                        email_verified_at: user.email_verified_at,
                        provider: 'credentials', // ADDED: Explicitly set provider for credentials
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
            // 'user' is only passed on initial sign-in or when account linking happens
            // 'account' is passed on OAuth sign-ins
            if (user) { // Initial sign-in (Credentials or first OAuth after user creation/update)
                token.id = user.id;
                token.is_org_admin = user.is_org_admin;
                token.is_super_admin = user.is_super_admin;
                token.org_id = user.org_id;
                token.email = user.email;
                token.name = user.name;
                token.profile_picture_url = user.profile_picture_url;
                token.email_verified_at = user.email_verified_at;
                if (user.provider) { // If provider is passed from authorize (credentials)
                    token.provider = user.provider;
                }
            }

            if (account) { // This block runs for OAuth sign-ins
                token.provider = account.provider; // Store the OAuth provider (e.g., 'google', 'facebook')

                // The rest of your OAuth logic (DB user creation/update)
                try {
                    const emailFromOAuth = profile.email;
                    const nameFromOAuth = profile.name;
                    let profilePictureFromOAuth = null;

                    if (account.provider === "google") profilePictureFromOAuth = profile.picture;
                    else if (account.provider === "facebook") profilePictureFromOAuth = profile.picture;

                    if (!emailFromOAuth) {
                        return Promise.reject(new Error(`Email not provided by ${account.provider}.`));
                    }

                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [emailFromOAuth]);
                    let dbUser;

                    if (rows.length > 0) {
                        dbUser = rows[0];
                        let updateFields = {};
                        if (account.provider === "google" && !dbUser.google_id) updateFields.google_id = profile.sub || account.providerAccountId;
                        if (account.provider === "facebook" && !dbUser.facebook_id) updateFields.facebook_id = profile.id || account.providerAccountId;
                        if (profilePictureFromOAuth && !dbUser.profile_picture_url) updateFields.profile_picture_url = profilePictureFromOAuth;
                        if (!dbUser.email_verified_at) updateFields.email_verified_at = new Date();

                        if (Object.keys(updateFields).length > 0) {
                            const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                            const valuesForUpdate = [...Object.values(updateFields), dbUser.account_id];
                            await pool.query(`UPDATE accounts SET ${setClauses} WHERE account_id = ?`, valuesForUpdate);
                            Object.assign(dbUser, updateFields);
                        }
                    } else {
                        const verificationToken = crypto.randomBytes(32).toString('hex');
                        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000);
                        const [result] = await pool.query(
                            'INSERT INTO accounts (email, username, google_id, facebook_id, profile_picture_url, is_org_admin, is_super_admin, email_verified_at, email_verification_token, email_verification_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                                emailFromOAuth, nameFromOAuth || emailFromOAuth,
                                account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                                account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                                profilePictureFromOAuth, false, false, new Date(),
                                verificationToken, verificationTokenExpiresAt
                            ]
                        );
                        dbUser = {
                            account_id: result.insertId, email: emailFromOAuth, username: nameFromOAuth || emailFromOAuth,
                            is_org_admin: false, is_super_admin: false, org_id: null,
                            profile_picture_url: profilePictureFromOAuth, email_verified_at: new Date(),
                            google_id: account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                            facebook_id: account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                        };
                    }
                    // Update token with all necessary fields from dbUser AFTER creation/update
                    token.id = dbUser.account_id;
                    token.is_org_admin = dbUser.is_org_admin;
                    token.is_super_admin = dbUser.is_super_admin;
                    token.org_id = dbUser.org_id;
                    token.email = dbUser.email;
                    token.name = dbUser.username;
                    token.profile_picture_url = dbUser.profile_picture_url;
                    token.email_verified_at = dbUser.email_verified_at;
                    // token.provider is already set from account.provider
                } catch (dbError) {
                    console.error("Auth.js OAuth DB Error:", dbError);
                    return Promise.reject(new Error("Error processing social login."));
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
                session.user.profile_picture_url = token.profile_picture_url;
                session.user.email_verified_at = token.email_verified_at;
                session.user.provider = token.provider; // ADDED: Pass provider to session
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
    },
};

export default NextAuth(authOptions);