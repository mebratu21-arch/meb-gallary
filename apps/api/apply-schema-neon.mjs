/**
 * apply-schema-neon.mjs
 * Applies the full Prisma schema to Neon using @neondatabase/serverless.
 * Run from the monorepo root: node apps/api/apply-schema-neon.mjs
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walk up to find .env at monorepo root
let envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", "..", ".env");
if (!fs.existsSync(envPath)) { console.error(".env not found"); process.exit(1); }

const envText = fs.readFileSync(envPath, "utf8");
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error("DATABASE_URL not found"); process.exit(1); }

const DATABASE_URL = match[1].trim();
const sql = neon(DATABASE_URL);

async function run(label, stmt) {
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${err.message}`);
    process.exit(1);
  }
}

console.log("🔌 Connecting to Neon...\n");

await run(
  `CREATE TYPE Role`,
  `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

await run(
  `CREATE TABLE User`,
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
);

await run(`INDEX User_email_key`,    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"    ON "User"("email")`);
await run(`INDEX User_googleId_key`, `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId")`);

await run(
  `CREATE TABLE RefreshToken`,
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
);

await run(`INDEX RefreshToken_tokenHash_key`, `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash")`);
await run(`INDEX RefreshToken_userId_idx`,    `CREATE INDEX        IF NOT EXISTS "RefreshToken_userId_idx"    ON "RefreshToken"("userId")`);
await run(`INDEX RefreshToken_familyId_idx`,  `CREATE INDEX        IF NOT EXISTS "RefreshToken_familyId_idx"  ON "RefreshToken"("familyId")`);

await run(
  `FK RefreshToken → User`,
  `DO $$ BEGIN
    ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

await run(
  `CREATE TABLE AuditLog`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT,
    "action"    TEXT NOT NULL,
    "ip"        TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`,
);

await run(
  `FK AuditLog → User`,
  `DO $$ BEGIN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

await run(
  `CREATE TABLE Image`,
  `CREATE TABLE IF NOT EXISTS "Image" (
    "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"    TEXT         NOT NULL,
    "publicId"  TEXT         NOT NULL,
    "url"       TEXT         NOT NULL,
    "format"    TEXT         NOT NULL,
    "width"     INTEGER      NOT NULL,
    "height"    INTEGER      NOT NULL,
    "bytes"     INTEGER      NOT NULL,
    "title"     TEXT         NOT NULL DEFAULT '',
    "tags"      TEXT[]       NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
  )`,
);

await run(`INDEX Image_publicId_key`,  `CREATE UNIQUE INDEX IF NOT EXISTS "Image_publicId_key"  ON "Image"("publicId")`);
await run(`INDEX Image_userId_idx`,    `CREATE INDEX        IF NOT EXISTS "Image_userId_idx"    ON "Image"("userId")`);
await run(`INDEX Image_createdAt_idx`, `CREATE INDEX        IF NOT EXISTS "Image_createdAt_idx" ON "Image"("createdAt")`);

await run(
  `FK Image → User`,
  `DO $$ BEGIN
    ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

console.log("\n✨ Schema applied successfully!");
console.log("   Tables: User, RefreshToken, AuditLog, Image");
console.log("   Enum:   Role (USER | ADMIN)");
