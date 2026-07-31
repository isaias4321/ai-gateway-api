import pino from "pino";
import type { Env } from "../config.js";

export function createLogger(env: Pick<Env, "LOG_LEVEL">) {
  const isProduction = process.env["NODE_ENV"] === "production";

  return pino({
    level: env.LOG_LEVEL,
    transport: isProduction
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
  });
}

export type Logger = ReturnType<typeof createLogger>;
