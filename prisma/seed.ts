import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env["SEED_ADMIN_EMAIL"] ?? "admin@mebgallery.local";
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"] ?? "AdminPassword123!";
  const demoEmail = process.env["SEED_DEMO_EMAIL"] ?? "demo@mebgallery.local";
  const demoPassword = process.env["SEED_DEMO_PASSWORD"] ?? "DemoPassword123!";

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    parallelism: 1,
    timeCost: 3,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "Admin",
      role: Role.ADMIN,
    },
  });

  // ── Demo user ───────────────────────────────────────────────────────────
  const demoHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    parallelism: 1,
    timeCost: 3,
  });

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash: demoHash,
      name: "Demo User",
      role: Role.USER,
    },
  });

  console.log(`✅ Seeded admin:  ${admin.email} (${admin.id})`);
  console.log(`✅ Seeded demo:   ${demo.email} (${demo.id})`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
