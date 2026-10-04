/**
 * redis.ts — Redis client with graceful in-memory fallback for local dev.
 *
 * WHY: On Windows without Docker, Redis (port 6379) is often not available.
 * The fallback uses a Map<string, { value: string; expiresAt: number | null }>
 * that mimics the `get`, `set`, `ping`, and `quit` methods used in this app.
 * In production (Render, Railway, etc.) REDIS_URL points to a real Redis server,
 * so the real client is used automatically.
 */

import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

// ── In-memory fallback ────────────────────────────────────────────────────────

type CacheEntry = { value: string; expiresAt: number | null };

class InMemoryRedis {
  private store = new Map<string, CacheEntry>();

  async connect(): Promise<void> {
    logger.warn("⚠️  Redis unavailable — using in-memory cache (NOT suitable for production)");
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, opts?: { EX?: number }): Promise<string> {
    const expiresAt = opts?.EX ? Date.now() + opts.EX * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async quit(): Promise<void> {
    this.store.clear();
  }

  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this;
  }
}

// ── Real Redis client factory ─────────────────────────────────────────────────

type AppRedis = {
  connect(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { EX?: number }): Promise<string | null>;
  quit(): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
};

async function createRedisClient(): Promise<AppRedis> {
  try {
    // Try to connect with a 3-second timeout to detect Redis availability fast.
    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false, // Disable auto-reconnect so we can fall back quickly
      },
    }) as RedisClientType;

    client.on("error", () => {
      /* suppress — we handle connection errors via try/catch below */
    });

    await client.connect();
    logger.info("✅ Redis connected");

    // Re-attach proper error handler after successful connect
    client.on("error", (err) => logger.error({ err }, "Redis client error"));

    return client as unknown as AppRedis;
  } catch {
    logger.warn({ url: env.REDIS_URL }, "Redis connection failed — using in-memory fallback");
    return new InMemoryRedis();
  }
}

// We export a lazy-initialised promise so server.ts can `await redis.connect()`
// and the module stays compatible with the existing code that imports `redis`.

class LazyRedis implements AppRedis {
  private inner: AppRedis | null = null;

  async connect(): Promise<void> {
    this.inner = await createRedisClient();
  }

  async ping(): Promise<string> {
    return this.inner?.ping() ?? "PONG";
  }

  async get(key: string): Promise<string | null> {
    return this.inner?.get(key) ?? null;
  }

  async set(key: string, value: string, opts?: { EX?: number }): Promise<string | null> {
    return this.inner?.set(key, value, opts) ?? "OK";
  }

  async quit(): Promise<void> {
    await this.inner?.quit();
  }

  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this;
  }
}

export const redis = new LazyRedis();
