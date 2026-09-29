import { PrismaClient } from "@prisma/client";

// Use a simple PrismaClient without strict event logging to avoid
// complex type interactions with exactOptionalPropertyTypes.
// Errors will surface via Express error handler / pino-http middleware.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "production"
        ? ["error", "warn"]
        : ["error", "warn"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
