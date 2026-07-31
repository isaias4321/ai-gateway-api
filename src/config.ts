import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Chaves aceitas para autenticar CONTRA este gateway (não são as chaves dos provedores).
  // Formato: lista separada por vírgula. Ex: "chave-do-time-a,chave-do-time-b"
  GATEWAY_API_KEYS: z
    .string()
    .default("dev-key")
    .transform((val) => val.split(",").map((k) => k.trim()).filter(Boolean)),

  // Chaves dos provedores de IA de verdade
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Rate limiting: N requisições por janela de tempo, por chave de API
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),

  // Cache de respostas não-streaming
  CACHE_TTL_MS: z.coerce.number().default(5 * 60_000),
  CACHE_MAX_ENTRIES: z.coerce.number().default(500),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Configuração de ambiente inválida.");
  }
  return parsed.data;
}
