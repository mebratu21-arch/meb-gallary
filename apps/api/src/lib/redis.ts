/**
 * redis.ts — Redis client with in-memory fallback for local dev only.
 */

import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

type CacheEntry = { value: string; expiresAt: number | null };

class InMemoryRedis {
  private store = new Map<string, CacheEntry>();

  async connect(): Promise<void> {
    logger.warn("⚠️  Redis unavailable — using in-memory cache (development only)");
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

type AppRedis = {
  connect(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { EX?: number }): Promise<string | null>;
  quit(): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
};

async function createRedisClient(): Promise<{ client: AppRedis; inMemory: boolean }> {
  try {
    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false,
      },
    }) as RedisClientType;

    client.on("error", () => {
      /* handled via try/catch on connect */
    });

    await client.connect();
    logger.info("✅ Redis connected");

    client.on("error", (err) => logger.error({ err }, "Redis client error"));

    return { client: client as unknown as AppRedis, inMemory: false };
  } catch (err) {
    if (env.NODE_ENV === "production") {
      logger.error({ err, url: env.REDIS_URL }, "Redis connection failed in production");
      throw new Error("Redis is required in production but connection failed.");
    }
    logger.warn({ url: env.REDIS_URL }, "Redis connection failed — using in-memory fallback");
    return { client: new InMemoryRedis(), inMemory: true };
  }
}

class LazyRedis implements AppRedis {
  private inner: AppRedis | null = null;
  private _usesInMemoryFallback = false;

  get usesInMemoryFallback(): boolean {
    return this._usesInMemoryFallback;
  }

  async connect(): Promise<void> {
    const { client, inMemory } = await createRedisClient();
    this.inner = client;
    this._usesInMemoryFallback = inMemory;
  }

  async ping(): Promise<string> {
    if (!this.inner) throw new Error("Redis not connected");
    return this.inner.ping();
  }

  async get(key: string): Promise<string | null> {
    if (!this.inner) return null;
    return this.inner.get(key);
  }

  async set(key: string, value: string, opts?: { EX?: number }): Promise<string | null> {
    if (!this.inner) return "OK";
    return this.inner.set(key, value, opts);
  }

  async quit(): Promise<void> {
    await this.inner?.quit();
  }

  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this;
  }
}

export const redis = new LazyRedis();
