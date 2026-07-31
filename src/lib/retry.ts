export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Decide se um erro específico deve disparar uma nova tentativa. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Erro lançado por provedores para sinalizar respostas HTTP com status,
 * usado por `defaultShouldRetry` para decidir se vale a pena tentar de novo.
 */
export class ProviderHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof ProviderHttpError) {
    // 429 (rate limit) e 5xx (erro transitório do servidor) valem retry.
    // 4xx de cliente (ex: 400, 401) não adianta tentar de novo.
    return error.status === 429 || error.status >= 500;
  }
  // Erros de rede (timeout, conexão recusada) também valem retry.
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa `fn`, tentando novamente com backoff exponencial + jitter em
 * caso de falha, até `maxAttempts` tentativas.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 5_000,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw error;
      }

      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * exponential * 0.3;
      await sleep(exponential + jitter);
    }
  }

  // Inalcançável na prática (o loop sempre retorna ou lança), mas satisfaz o TypeScript.
  throw lastError;
}
