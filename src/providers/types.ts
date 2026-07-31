import type { ChatCompletionRequest, ChatCompletionResponse } from "../schemas/chat.js";

export interface ProviderAdapter {
  readonly name: "openai" | "anthropic";

  /** Chamada padrão, sem streaming: retorna a resposta completa de uma vez. */
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Chamada com streaming: retorna um ReadableStream de texto bruto
   * (Server-Sent Events) já pronto para ser repassado direto ao cliente.
   */
  stream(request: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>>;
}
