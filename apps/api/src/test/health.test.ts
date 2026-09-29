import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../../app.js";
import type { Express } from "express";

// Mock Prisma and Redis so tests don't need live services for health checks
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $on: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

vi.mock("../../lib/redis.js", () => ({
  redis: {
    ping: vi.fn().mockResolvedValue("PONG"),
    connect: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  },
}));

let app: Express;

beforeAll(() => {
  app = buildApp();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(res.body.timestamp).toBeDefined();
  });
});

describe("GET /ready", () => {
  it("returns 200 when DB and Redis are healthy", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ready",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("returns 503 when DB is down", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("Connection refused"));

    const res = await request(app).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("error");
    expect(res.body.status).toBe("degraded");
  });
});

describe("404 handler", () => {
  it("returns 404 with error shape for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("Error response shape", () => {
  it("returns consistent error envelope", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });
});
