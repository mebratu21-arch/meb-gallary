/**
 * patch-prisma-schema.mjs
 * Overwrites the bundled schema.prisma inside .prisma/client with the
 * full current schema so that prisma re-generates from it via Node-compatible means.
 * Run: node prisma/patches/patch-prisma-schema.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");

// Path to the bundled schema prisma uses at runtime
const clientSchemaPath = path.join(
  root,
  "node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/schema.prisma"
);

// Read our full current schema
const newSchema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

if (!fs.existsSync(clientSchemaPath)) {
  console.error("❌ Prisma client schema not found at:", clientSchemaPath);
  process.exit(1);
}

fs.writeFileSync(clientSchemaPath, newSchema, "utf8");
console.log("✅ Patched .prisma/client/schema.prisma with full project schema");
