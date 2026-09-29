import pino from "pino";
import { env } from "../config/env.js";

export const logger =
  env.NODE_ENV !== "production"
    ? pino({
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      })
    : pino({ level: "info" });
