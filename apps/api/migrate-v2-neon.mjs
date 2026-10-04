/**
 * migrate-v2-neon.mjs
 * Adds Phase 2 schema changes to Neon using @neondatabase/serverless.
 * This is an ADDITIVE migration — it does not touch existing tables.
 * Run: node apps/api/migrate-v2-neon.mjs
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", "..", ".env");
if (!fs.existsSync(envPath)) { console.error(".env not found"); process.exit(1); }

const envText = fs.readFileSync(envPath, "utf8");
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error("DATABASE_URL not found"); process.exit(1); }

const sql = neon(match[1].trim());

async function run(label, stmt) {
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    process.exit(1);
  }
}

async function runSoft(label, stmt) {
  // Like run() but doesn't exit on error — for "IF NOT EXISTS" style statements
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    console.log(`  ⚠️  ${label} (skipped: ${err.message.slice(0, 80)})`);
  }
}

console.log("🔌 Phase 2 migration starting…\n");

// ── ImageSource enum ─────────────────────────────────────────────────────────
await runSoft(
  `CREATE TYPE ImageSource`,
  `DO $$ BEGIN CREATE TYPE "ImageSource" AS ENUM ('upload', 'ai_generated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

// ── New columns on User ──────────────────────────────────────────────────────
await runSoft(`ADD User.avatar`,   `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT`);
await runSoft(`ADD User.updatedAt`, `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);

// ── New columns on Image ─────────────────────────────────────────────────────
await runSoft(`ADD Image.description`, `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''`);
await runSoft(`ADD Image.source`,      `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "source" "ImageSource" NOT NULL DEFAULT 'upload'`);
await runSoft(`ADD Image.isFavorite`,  `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false`);
await runSoft(`ADD Image.isModerated`, `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "isModerated" BOOLEAN NOT NULL DEFAULT false`);
await runSoft(`ADD Image.aiCaption`,   `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "aiCaption" TEXT`);
await runSoft(`ADD Image.aiCategory`,  `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "aiCategory" TEXT`);
await runSoft(`ADD Image.aiTags`,      `ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "aiTags" TEXT[] NOT NULL DEFAULT '{}'`);

// Indexes for new Image columns
await runSoft(`INDEX Image_isFavorite_idx`, `CREATE INDEX IF NOT EXISTS "Image_isFavorite_idx" ON "Image"("isFavorite")`);
await runSoft(`INDEX Image_source_idx`,     `CREATE INDEX IF NOT EXISTS "Image_source_idx" ON "Image"("source")`);

// ── Album table ──────────────────────────────────────────────────────────────
await run(
  `CREATE TABLE Album`,
  `CREATE TABLE IF NOT EXISTS "Album" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"       TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT         NOT NULL DEFAULT '',
    "coverImageId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
  )`,
);

await runSoft(`INDEX Album_userId_idx`, `CREATE INDEX IF NOT EXISTS "Album_userId_idx" ON "Album"("userId")`);

await runSoft(
  `FK Album → User`,
  `DO $$ BEGIN
    ALTER TABLE "Album" ADD CONSTRAINT "Album_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

// ── AlbumImage join table ────────────────────────────────────────────────────
await run(
  `CREATE TABLE AlbumImage`,
  `CREATE TABLE IF NOT EXISTS "AlbumImage" (
    "albumId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlbumImage_pkey" PRIMARY KEY ("albumId", "imageId")
  )`,
);

await runSoft(
  `FK AlbumImage → Album`,
  `DO $$ BEGIN
    ALTER TABLE "AlbumImage" ADD CONSTRAINT "AlbumImage_albumId_fkey"
    FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

await runSoft(
  `FK AlbumImage → Image`,
  `DO $$ BEGIN
    ALTER TABLE "AlbumImage" ADD CONSTRAINT "AlbumImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
);

console.log("\n✨ Phase 2 migration complete!");
console.log("   New tables:   Album, AlbumImage");
console.log("   New columns:  User.avatar, Image.(description|source|isFavorite|isModerated|aiCaption|aiCategory|aiTags)");
console.log("   New enum:     ImageSource (upload | ai_generated)");
