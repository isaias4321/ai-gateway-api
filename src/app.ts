import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";

import type { Env } from "./config.js";
import { TtlCache } from "./lib/cache.js";
import type { Logger } from "./lib/logger.js";
import { TokenBucketRateLimiter } from "./lib/rateLimiter.js";
import authPlugin from "./plugins/auth.js";
import { buildProviderRegistry } from "./providers/registry.js";
import type { ChatCompletionResponse } from "./schemas/chat.js";

import chatRoute from "./routes/chat.js";
import healthRoute from "./routes/health.js";
import modelsRoute from "./routes/models.js";

export async function buildApp(env: Env, logger: Logger): Promise<FastifyInstance> {
  const fastify = Fastify({ loggerInstance: logger as unknown as FastifyBaseLogger });

  await fastify.register(cors, { origin: true });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "AI Gateway API",
        description: "Gateway unificado para múltiplos provedores de LLM.",
        version: "1.0.0",
      },
    },
  });
  await fastify.register(swaggerUi, { routePrefix: "/docs" });

  await fastify.register(authPlugin, { validKeys: env.GATEWAY_API_KEYS });

  const providers = buildProviderRegistry(env);
  const rateLimiter = new TokenBucketRateLimiter(env.RATE_LIMIT_MAX_REQUESTS, env.RATE_LIMIT_WINDOW_MS);
  const cache = new TtlCache<ChatCompletionResponse>(env.CACHE_TTL_MS, env.CACHE_MAX_ENTRIES);

  await fastify.register(healthRoute);
  await fastify.register(modelsRoute, { providers });
  await fastify.register(chatRoute, { providers, rateLimiter, cache });

  return fastify;
}
