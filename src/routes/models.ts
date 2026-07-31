import type { FastifyPluginAsync } from "fastify";
import type { ProviderAdapter } from "../providers/types.js";

const KNOWN_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
};

const modelsRoute: FastifyPluginAsync<{ providers: Map<string, ProviderAdapter> }> = async (
  fastify,
  options
) => {
  fastify.get(
    "/v1/models",
    {
      schema: {
        description: "Lista os provedores configurados e seus modelos conhecidos.",
        tags: ["models"],
      },
    },
    async () => {
      const available = Array.from(options.providers.keys());
      return {
        providers: available.map((provider) => ({
          provider,
          models: KNOWN_MODELS[provider] ?? [],
        })),
      };
    }
  );
};

export default modelsRoute;
