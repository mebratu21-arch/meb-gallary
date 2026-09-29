import { createClient } from "redis";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err) => logger.error({ err }, "Redis client error"));
redis.on("connect", () => logger.info("Redis connected"));
