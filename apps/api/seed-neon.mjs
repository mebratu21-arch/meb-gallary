/**
 * seed-neon.mjs
 * Seeds admin and demo users directly via Neon HTTP.
 * Uses crypto.subtle for hashing since argon2 needs Prisma/native.
 * Actually: we'll insert with a well-known argon2id hash pre-computed.
 *
 * Run: node apps/api/seed-neon.mjs
 *
 * Default credentials (override via env vars):
 *   Admin:  admin@mebgallery.local / AdminPassword123!
 *   Demo:   demo@mebgallery.local  / DemoPassword123!
 *
 * NOTE: These hashes were generated with argon2id (m=65536, t=3, p=1).
 * Change passwords in .env before production use.
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
let envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "..", "..", ".env");
const envText = fs.readFileSync(envPath, "utf8");

function getEnv(key, fallback) {
  const m = envText.match(new RegExp(`^${key}=(.+)$`, "m"));
  return m ? m[1].trim() : (fallback ?? null);
}

const DATABASE_URL   = getEnv("DATABASE_URL");
const adminEmail     = getEnv("SEED_ADMIN_EMAIL", "admin@mebgallery.local");
const demoEmail      = getEnv("SEED_DEMO_EMAIL", "demo@mebgallery.local");

if (!DATABASE_URL) { console.error("DATABASE_URL missing"); process.exit(1); }

const sql = neon(DATABASE_URL);

import argon2 from "argon2";

const adminPassword = getEnv("SEED_ADMIN_PASSWORD", "AdminPassword123!");
const demoPassword  = getEnv("SEED_DEMO_PASSWORD", "DemoPassword123!");

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  parallelism: 1,
  timeCost: 3,
};

const adminHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);
const demoHash  = await argon2.hash(demoPassword, ARGON2_OPTIONS);

console.log("🌱 Seeding Neon database with real argon2 hashes...\n");

async function upsertUser(email, name, role, hash) {
  const existing = await sql.query(
    `SELECT id FROM "User" WHERE email = '${email.replace(/'/g, "''")}'`,
  );

  const rows = Array.isArray(existing) ? existing : existing.rows;
  if (rows && rows.length > 0) {
    const id = rows[0].id;
    await sql.query(
      `UPDATE "User" SET "passwordHash" = '${hash}', "name" = '${name}', "role" = '${role}' WHERE id = '${id}'`,
    );
    console.log(`  ✅ Updated ${role.padEnd(5)} ${email} (${id}) with real password hash`);
    return id;
  }

  const id = randomUUID();
  await sql.query(
    `INSERT INTO "User" ("id","email","passwordHash","name","role")
     VALUES ('${id}','${email.replace(/'/g, "''")}','${hash}','${name}','${role}')`,
  );

  console.log(`  ✅ Created ${role.padEnd(5)} ${email} (${id})`);
  return id;
}

await upsertUser(adminEmail, "Admin", "ADMIN", adminHash);
await upsertUser(demoEmail,  "Demo User", "USER", demoHash);

console.log(`
✨ Seed complete!

⚠️  IMPORTANT — Password note:
   The placeholder argon2id hashes above are NOT valid for login.
   To set real passwords, run the proper seed once Node 20 is installed:

     nvm use 20
     pnpm prisma db seed

   Or use the Neon console SQL editor to update password hashes manually.
`);
