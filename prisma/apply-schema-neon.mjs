/**
 * apply-schema-neon.mjs
 * Applies the Prisma schema to Neon using @neondatabase/serverless.
 * Run: node prisma/apply-schema-neon.mjs
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env
const envText = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error("DATABASE_URL not found in .env"); process.exit(1); }

const DATABASE_URL = match[1].trim();
const sql = neon(DATABASE_URL);

const statements = [
  `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "User" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId"     TEXT,
    "name"         TEXT NOT NULL,
    "role"         "Role" NOT NULL DEFAULT 'USER',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"    TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId")`,

  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId"  TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken"("familyId")`,

  `DO $$ BEGIN ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT,
    "action"    TEXT NOT NULL,
    "ip"        TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`,

  `DO $$ BEGIN ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

console.log("🔌 Connecting to Neon...\n");

for (const stmt of statements) {
  const preview = stmt.trim().slice(0, 60).replace(/\s+/g, " ");
  try {
    await sql(stmt);
    console.log(`  ✅ ${preview}...`);
  } catch (err) {
    console.error(`  ❌ ${preview}...`);
    console.error(`     ${err.message}`);
    process.exit(1);
  }
}

console.log("\n✨ Schema applied successfully!");
console.log("Tables: User, RefreshToken, AuditLog");
console.log("Enum:   Role (USER, ADMIN)");
