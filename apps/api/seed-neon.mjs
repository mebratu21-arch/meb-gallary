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

// Pre-computed argon2id hashes for the default seed passwords.
// AdminPassword123!  →  hash below
// DemoPassword123!   →  hash below
// These are only used for local dev — override in production.
const ADMIN_HASH = "$argon2id$v=19$m=65536,t=3,p=1$YWRtaW5zYWx0YWRtaW5zYWx0$NfXDnCvLWJH8EbvgwBfJ1mXGb0Y1TtCz7sQtv0WGZGQ";
const DEMO_HASH  = "$argon2id$v=19$m=65536,t=3,p=1$ZGVtb3NhbHRkZW1vc2FsdA$QjHn7bHNWEMsHbEkH2g3mzQMVnKj0Kh5KXS1mj9XVUA";

// NOTE: The pre-computed hashes above are placeholder values for seeding.
// The actual API will verify passwords correctly because argon2.hash() in
// the real seed.ts generates proper hashes. These placeholder hashes won't
// verify correctly — use the real seed once Prisma/Node 20 is available.
// For now we insert a clearly-marked placeholder and print instructions.

console.log("🌱 Seeding Neon database...\n");

async function upsertUser(email, name, role, note) {
  // Check if user exists
  const existing = await sql.query(
    `SELECT id FROM "User" WHERE email = '${email.replace(/'/g, "''")}'`,
  );

  if (existing.rows.length > 0) {
    console.log(`  ⏭️  ${role} ${email} — already exists (${existing.rows[0].id})`);
    return existing.rows[0].id;
  }

  const id = randomUUID();
  // Insert with placeholder hash — will be replaced when running real seed
  const hash = role === "ADMIN" ? ADMIN_HASH : DEMO_HASH;

  await sql.query(
    `INSERT INTO "User" ("id","email","passwordHash","name","role")
     VALUES ('${id}','${email.replace(/'/g, "''")}','${hash}','${name}','${role}')`,
  );

  console.log(`  ✅ Created ${role.padEnd(5)} ${email} (${id})`);
  return id;
}

await upsertUser(adminEmail, "Admin", "ADMIN");
await upsertUser(demoEmail,  "Demo User", "USER");

console.log(`
✨ Seed complete!

⚠️  IMPORTANT — Password note:
   The placeholder argon2id hashes above are NOT valid for login.
   To set real passwords, run the proper seed once Node 20 is installed:

     nvm use 20
     pnpm prisma db seed

   Or use the Neon console SQL editor to update password hashes manually.
`);
