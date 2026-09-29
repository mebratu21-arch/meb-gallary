/**
 * apply-schema.mjs
 * Uses Neon's serverless HTTP API to apply the database schema.
 * Run with: node apply-schema.mjs
 */

import { createRequire } from 'module';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from .env
const envPath = path.join(__dirname, '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envText.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) { console.error('DATABASE_URL not found in .env'); process.exit(1); }

const DATABASE_URL = dbUrlMatch[1].trim();
const url = new URL(DATABASE_URL);

// Neon serverless HTTP endpoint
// Neon HTTP API: POST https://<host>/sql
const host = url.hostname.replace('-pooler', ''); // use non-pooled for schema
const password = decodeURIComponent(url.password);
const user = url.username;
const database = url.pathname.slice(1).split('?')[0];

const SQL = `
-- Create Role enum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "email"        TEXT         NOT NULL,
  "passwordHash" TEXT,
  "googleId"     TEXT,
  "name"         TEXT         NOT NULL,
  "role"         "Role"       NOT NULL DEFAULT 'USER',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"    TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT         NOT NULL,
  "tokenHash" TEXT         NOT NULL,
  "familyId"  TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx"   ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

DO $$ BEGIN
  ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT,
  "action"    TEXT         NOT NULL,
  "ip"        TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

// Use Neon HTTP API
const body = JSON.stringify({ query: SQL });
const auth = Buffer.from(`${user}:${password}`).toString('base64');

const options = {
  hostname: url.hostname,
  port: 443,
  path: '/sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Basic ${auth}`,
    'Neon-Connection-String': DATABASE_URL,
  },
};

console.log(`Connecting to: ${url.hostname}`);
console.log(`Database: ${database}`);
console.log('Applying schema...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ Schema applied successfully!');
    } else {
      console.log('Response:', data.slice(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(body);
req.end();
