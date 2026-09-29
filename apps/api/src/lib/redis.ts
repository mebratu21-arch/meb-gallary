import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

// Explicit type annotation required due to pnpm strict hoisting + declaration:true
export const redis: RedisClientType = createClient({ url: env.REDIS_URL }) as RedisClientType;

redis.on("error", (err) => logger.error({ err }, "Redis client error"));
redis.on("connect", () => logger.info("Redis connected"));
