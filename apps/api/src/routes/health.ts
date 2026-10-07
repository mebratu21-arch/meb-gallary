import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export const healthRouter = Router();

/** GET /health — always 200 */
healthRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** GET /ready — checks DB and Redis connectivity */
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, "ok" | "error" | "memory_fallback"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks["database"] = "ok";
  } catch {
    checks["database"] = "error";
  }

  try {
    await redis.ping();
    checks["redis"] = redis.usesInMemoryFallback ? "memory_fallback" : "ok";
  } catch {
    checks["redis"] = "error";
  }

  const allOk =
    checks["database"] === "ok" &&
    (checks["redis"] === "ok" || checks["redis"] === "memory_fallback");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});
