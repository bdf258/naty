import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';

const db = new Database('./data/auth.db');

export const auth = betterAuth({
  database: {
    type: 'sqlite',
    db: db,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day - update session if older than this
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost',
  ],
});
