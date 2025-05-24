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
                        'SELECT * FROM accounts WHERE email = ? AND deactivated_at IS NULL',
                        [email]
                    );
                    if (rows.length === 0) {
                        throw new Error("Invalid credentials or account is deactivated.");
                    }
                    const user = rows[0];

                    if (!user.password_hash && user.third_party_provider) { // Check if it's an OAuth account
                        throw new Error(`This account was created using ${user.third_party_provider}. Please sign in with ${user.third_party_provider}.`);
                    }
                    if (!user.password_hash && !user.third_party_provider) { // Should not happen if DB is consistent
                        throw new Error("Account has no password set and is not linked to a social provider. Please contact support.");
                    }


                    const match = await bcrypt.compare(password, user.password_hash);
                    if (!match) {
                        throw new Error("Invalid credentials.");
                    }
                    return { // This is the 'user' object passed to jwt callback on credentials sign-in
                        id: user.account_id,
                        name: user.username,
                        email: user.email,
                        is_org_admin: !!user.is_org_admin,
                        is_super_admin: !!user.is_super_admin,
                        org_id: user.org_id,
                        profile_picture_url: user.profile_picture_url,
                        email_verified_at: user.email_verified_at,
                        provider: 'credentials', // Explicitly set provider
                        deactivated_at: user.deactivated_at,
                    };
                } catch (error) {
                    console.error("Auth.js CredentialsProvider error:", error.message);
                    // For client, always return a generic error for security.
                    // Propagate specific errors if they are meant for client display.
                    if (error.message.includes("Please sign in using the method") || error.message.includes("Account has no password")) {
                        throw error; // Let these specific messages pass through
                    }
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
            // scope: 'email public_profile', // Ensure necessary scopes
        }),
    ],

    session: {
        strategy: "jwt",
    },

    callbacks: {
        async jwt({ token, user, account, profile }) {
            // 'user' is populated on initial sign-in (from authorize or first OAuth DB interaction)
            // 'account' & 'profile' are populated on OAuth sign-ins

            if (user) { // This block is for the initial sign-in event
                if (user.deactivated_at) {
                    console.warn(`[Auth.js JWT] Attempt to sign in for deactivated user ID: ${user.id}`);
                    return Promise.reject(new Error("ACCOUNT_DEACTIVATED"));
                }
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.is_org_admin = user.is_org_admin;
                token.is_super_admin = user.is_super_admin;
                token.org_id = user.org_id;
                token.profile_picture_url = user.profile_picture_url;
                token.email_verified_at = user.email_verified_at;
                token.deactivated_at = user.deactivated_at;
                token.provider = user.provider || account?.provider; // Set provider from user if credentials, or from account if OAuth
            }

            // This block specifically handles OAuth provider interactions (account and profile will be defined)
            if (account && profile && (account.provider === 'google' || account.provider === 'facebook')) {
                token.provider = account.provider; // Ensure provider is set from OAuth account

                console.log(`[Auth.js JWT Callback] OAuth Sign-in with ${account.provider}.`);
                // console.log("[Auth.js JWT Callback] Account object:", JSON.stringify(account, null, 2)); // Keep for debug if needed
                // console.log("[Auth.js JWT Callback] Profile object:", JSON.stringify(profile, null, 2)); // Keep for debug if needed

                const emailFromOAuth = profile.email;
                const nameFromOAuth = profile.name || (profile.given_name && profile.family_name ? `${profile.given_name} ${profile.family_name}` : null) || profile.login;
                let profilePictureFromOAuth = null;

                if (account.provider === "google") profilePictureFromOAuth = profile.picture;
                else if (account.provider === "facebook") profilePictureFromOAuth = profile.picture?.data?.url || profile.picture;

                if (!emailFromOAuth) {
                    console.error(`[Auth.js JWT Callback] Email not found in ${account.provider} profile:`, profile);
                    return Promise.reject(new Error(`EMAIL_NOT_PROVIDED_BY_OAUTH_PROVIDER`));
                }

                try {
                    const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [emailFromOAuth]);
                    let dbUser;

                    if (rows.length > 0) {
                        dbUser = rows[0];
                        if (dbUser.deactivated_at) {
                            console.warn(`[Auth.js JWT] OAuth attempt for deactivated user (DB): ${dbUser.email}`);
                            return Promise.reject(new Error("ACCOUNT_DEACTIVATED"));
                        }
                        // User exists, update OAuth IDs, picture, username if changed, and verify email
                        let updateFields = {};
                        if (account.provider === "google" && (!dbUser.google_id || dbUser.google_id !== (profile.sub || account.providerAccountId))) updateFields.google_id = profile.sub || account.providerAccountId;
                        if (account.provider === "facebook" && (!dbUser.facebook_id || dbUser.facebook_id !== (profile.id || account.providerAccountId))) updateFields.facebook_id = profile.id || account.providerAccountId;
                        if (profilePictureFromOAuth && (!dbUser.profile_picture_url || dbUser.profile_picture_url !== profilePictureFromOAuth)) updateFields.profile_picture_url = profilePictureFromOAuth;
                        if (nameFromOAuth && dbUser.username !== nameFromOAuth) updateFields.username = nameFromOAuth;
                        if (!dbUser.email_verified_at) updateFields.email_verified_at = new Date();
                        if (!dbUser.third_party_provider) updateFields.third_party_provider = account.provider;


                        if (Object.keys(updateFields).length > 0) {
                            const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                            const valuesForUpdate = [...Object.values(updateFields), dbUser.account_id];
                            await pool.query(`UPDATE accounts SET ${setClauses} WHERE account_id = ?`, valuesForUpdate);
                            Object.assign(dbUser, updateFields);
                        }
                    } else {
                        // New user via OAuth
                        const verificationToken = crypto.randomBytes(32).toString('hex');
                        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000);

                        const [result] = await pool.query(
                            'INSERT INTO accounts (email, username, google_id, facebook_id, profile_picture_url, is_org_admin, is_super_admin, email_verified_at, email_verification_token, email_verification_token_expires_at, is_active, deactivated_at, third_party_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NULL, ?)',
                            [
                                emailFromOAuth, nameFromOAuth || emailFromOAuth,
                                account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                                account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                                profilePictureFromOAuth, false, false, new Date(),
                                verificationToken, verificationTokenExpiresAt, account.provider
                            ]
                        );
                        dbUser = {
                            account_id: result.insertId, email: emailFromOAuth, username: nameFromOAuth || emailFromOAuth,
                            is_org_admin: false, is_super_admin: false, org_id: null,
                            profile_picture_url: profilePictureFromOAuth, email_verified_at: new Date(),
                            deactivated_at: null,
                            google_id: account.provider === "google" ? (profile.sub || account.providerAccountId) : null,
                            facebook_id: account.provider === "facebook" ? (profile.id || account.providerAccountId) : null,
                            third_party_provider: account.provider
                        };
                    }
                    // Update token with dbUser info from OAuth path
                    token.id = dbUser.account_id;
                    token.email = dbUser.email;
                    token.name = dbUser.username;
                    token.is_org_admin = !!dbUser.is_org_admin;
                    token.is_super_admin = !!dbUser.is_super_admin;
                    token.org_id = dbUser.org_id;
                    token.profile_picture_url = dbUser.profile_picture_url;
                    token.email_verified_at = dbUser.email_verified_at;
                    token.deactivated_at = dbUser.deactivated_at;
                    // token.provider is already set at the start of this OAuth block
                } catch (dbError) {
                    console.error("[Auth.js JWT Callback] OAuth DB Error:", dbError);
                    return Promise.reject(new Error("DB_PROCESSING_ERROR_OAUTH"));
                }
            }
            // This 'else if' should now correctly NOT trigger for credentials provider if 'account' is not a full OAuth account object
            else if (account && !profile && account.provider && account.provider !== 'credentials') {
                // This case means an OAuth provider returned account info but no profile.
                console.error(`[Auth.js JWT Callback] OAuth provider ${account.provider} returned account but no profile.`);
                return Promise.reject(new Error("OAUTH_PROFILE_MISSING"));
            }


            if (token.deactivated_at) {
                console.warn(`[Auth.js JWT] Token for deactivated user ID: ${token.id}. Rejecting.`);
                return Promise.reject(new Error("ACCOUNT_DEACTIVATED"));
            }
            return token; // Return the populated token
        },

        async session({ session, token }) {
            if (token && !token.deactivated_at) { // Ensure token is valid and user not deactivated
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.is_org_admin = token.is_org_admin;
                session.user.is_super_admin = token.is_super_admin;
                session.user.org_id = token.org_id;
                session.user.profile_picture_url = token.profile_picture_url;
                session.user.email_verified_at = token.email_verified_at;
                session.user.provider = token.provider;
                session.user.deactivated_at = token.deactivated_at;
            } else {
                // If token indicates issues, clear the user from session
                console.warn("[Auth.js Session Callback] Token invalid or indicates deactivated user. Clearing session.user.");
                delete session.user; // Or session.user = null;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
    },
    // debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);