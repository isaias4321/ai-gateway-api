import type { FastifyPluginAsync } from "fastify";
import { buildCacheKey, type TtlCache } from "../lib/cache.js";
import type { TokenBucketRateLimiter } from "../lib/rateLimiter.js";
import { ProviderHttpError } from "../lib/retry.js";
import type { ProviderAdapter } from "../providers/types.js";
import { chatCompletionRequestSchema, type ChatCompletionResponse } from "../schemas/chat.js";

interface ChatRouteDeps {
  providers: Map<string, ProviderAdapter>;
  rateLimiter: TokenBucketRateLimiter;
  cache: TtlCache<ChatCompletionResponse>;
}

const chatRoute: FastifyPluginAsync<ChatRouteDeps> = async (fastify, { providers, rateLimiter, cache }) => {
  fastify.post("/v1/chat/completions", async (request, reply) => {
    // --- Rate limiting por chave de API ---
    const limitResult = rateLimiter.tryConsume(request.apiKey);
    reply.header("x-ratelimit-remaining", limitResult.remaining);

    if (!limitResult.allowed) {
      reply.header("retry-after", Math.ceil(limitResult.retryAfterMs / 1000));
      return reply.code(429).send({
        error: "rate_limited",
        message: "Limite de requisições excedido. Tente novamente em instantes.",
      });
    }

    // --- Validação do corpo da requisição ---
    const parsed = chatCompletionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Corpo da requisição inválido.",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const chatRequest = parsed.data;

    // --- Provedor solicitado precisa estar configurado no servidor ---
    const adapter = providers.get(chatRequest.provider);
    if (!adapter) {
      return reply.code(503).send({
        error: "provider_unavailable",
        message: `O provedor '${chatRequest.provider}' não está configurado neste gateway (falta a chave de API correspondente no .env).`,
      });
    }

    try {
      // --- Streaming: repassa o corpo da resposta como Server-Sent Events ---
      if (chatRequest.stream) {
        const upstream = await adapter.stream(chatRequest);
        reply.hijack();
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        for await (const chunk of upstream as unknown as AsyncIterable<Uint8Array>) {
          reply.raw.write(chunk);
        }
        reply.raw.end();
        return;
      }

      // --- Sem streaming: verifica cache antes de chamar o provedor ---
      const cacheKey = buildCacheKey(chatRequest);
      const cached = cache.get(cacheKey);
      if (cached) {
        return reply.send({ ...cached, cached: true });
      }

      const result = await adapter.complete(chatRequest);
      cache.set(cacheKey, result);
      return reply.send(result);
    } catch (error) {
      if (error instanceof ProviderHttpError) {
        return reply.code(502).send({
          error: "provider_error",
          message: `O provedor '${chatRequest.provider}' retornou um erro: ${error.message}`,
        });
      }
      request.log.error({ err: error }, "Erro inesperado ao chamar o provedor de IA");
      return reply.code(500).send({ error: "internal_error", message: "Erro interno no gateway." });
    }
  });
};

export default chatRoute;
