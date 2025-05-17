// config/passport.js

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcrypt';
import pool from './database.js'; // Ensure the correct import

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.account_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log(`[deserializeUser] Attempting to deserialize user with account_id: ${id}`);
    const [rows] = await pool.query('SELECT * FROM accounts WHERE account_id = ?', [id]);
    if (rows.length === 0) {
      console.warn(`[deserializeUser] No user found in 'accounts' table with account_id: ${id}. Session will not be established.`);
      return done(null, false);
    }
    const user = rows[0];
    console.log(`[deserializeUser] Successfully deserialized user: ${user.email} (ID: ${user.account_id})`);
    delete user.password_hash;
    done(null, user);
  } catch (err) {
    console.error(`[deserializeUser] Database error for account_id ${id}:`, err);
    done(err);
  }
});

console.log(`${process.env.BACKEND_URL}/api/auth/google/callback`);
// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, // Use email instead of username
    async (email, password, done) => {
      try {
        const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        if (rows.length === 0) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        delete user.password_hash;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        let user;
        if (rows.length > 0) {
          user = rows[0];
        } else {
          const [result] = await pool.query('INSERT INTO accounts (email, username) VALUES (?, ?)', [
            email,
            profile.displayName,
          ]);
          user = { account_id: result.insertId, email: email, username: profile.displayName };
        }
        delete user.password_hash;
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) {
          return done(null, false, { message: 'Email not provided by Facebook.' });
        }

        const [rows] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        let user;
        if (rows.length > 0) {
          user = rows[0];
        } else {
          const [result] = await pool.query(
            'INSERT INTO accounts (email, username) VALUES (?, ?)',
            [email, profile.displayName]
          );
          user = { account_id: result.insertId, email: email, username: profile.displayName };
        }
        delete user.password_hash;
        done(null, user);
      } catch (err) {
        console.error('Error in Facebook Strategy:', err);
        done(err);
      }
    }
  )
);

export default passport;