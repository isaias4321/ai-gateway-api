import { ProviderHttpError, withRetry } from "../lib/retry.js";
import type { ChatCompletionRequest } from "../schemas/chat.js";
import type { ProviderAdapter } from "./types.js";

const OPENAI_BASE_URL = process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1";

interface OpenAiChatResponse {
  id: string;
  model: string;
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export function createOpenAiAdapter(apiKey: string): ProviderAdapter {
  async function callApi(request: ChatCompletionRequest, stream: boolean): Promise<Response> {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProviderHttpError(`OpenAI respondeu ${response.status}: ${body}`, response.status);
    }

    return response;
  }

  return {
    name: "openai",

    async complete(request) {
      const response = await withRetry(() => callApi(request, false));
      const data = (await response.json()) as OpenAiChatResponse;

      return {
        id: data.id,
        provider: "openai",
        model: data.model,
        content: data.choices[0]?.message.content ?? "",
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens,
              total_tokens: data.usage.total_tokens,
            }
          : undefined,
        cached: false,
      };
    },

    async stream(request) {
      const response = await withRetry(() => callApi(request, true));
      if (!response.body) {
        throw new Error("A resposta da OpenAI não retornou um corpo em stream.");
      }
      // O formato SSE da OpenAI (`data: {...}\n\n`) já é compatível com o
      // que o cliente espera, então repassamos o stream bruto sem reprocessar.
      return response.body;
    },
  };
}
