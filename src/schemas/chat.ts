import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "O conteúdo da mensagem não pode ser vazio."),
});

export const chatCompletionRequestSchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  model: z.string().min(1, "Informe o modelo desejado."),
  messages: z.array(chatMessageSchema).min(1, "Envie pelo menos uma mensagem."),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().max(8000).default(1024),
  stream: z.boolean().default(false),
});

export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatCompletionResponseSchema = z.object({
  id: z.string(),
  provider: z.enum(["openai", "anthropic"]),
  model: z.string(),
  content: z.string(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
  cached: z.boolean().default(false),
});

export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>;
