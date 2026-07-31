import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    apiKey: string;
  }
}

interface AuthPluginOptions {
  validKeys: string[];
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const validKeys = new Set(options.validKeys);

  fastify.decorateRequest("apiKey", "");

  fastify.addHook("onRequest", async (request, reply) => {
    // Rotas públicas não exigem chave de API
    if (request.url === "/health" || request.url.startsWith("/docs")) {
      return;
    }

    const apiKey = request.headers["x-api-key"];

    if (typeof apiKey !== "string" || !validKeys.has(apiKey)) {
      return reply.code(401).send({
        error: "unauthorized",
        message: "Chave de API ausente ou inválida. Envie o header 'x-api-key'.",
      });
    }

    request.apiKey = apiKey;
  });
};

export default fp(authPlugin, { name: "auth-plugin" });
