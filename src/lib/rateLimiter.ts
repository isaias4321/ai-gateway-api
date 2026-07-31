interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

/**
 * Rate limiter baseado em token bucket: cada chave de API tem um "balde"
 * com capacidade máxima. A cada requisição, um token é consumido; os
 * tokens são reabastecidos gradualmente ao longo do tempo até o limite.
 *
 * Isso permite rajadas curtas de tráfego (até a capacidade do balde) sem
 * bloquear o usuário, ao mesmo tempo em que impõe um teto médio sustentado.
 */
export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillWindowMs: number
  ) {}

  /** Retorna true se a requisição pode prosseguir, false se deve ser bloqueada. */
  tryConsume(key: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.maxTokens, lastRefillAt: now };

    const elapsed = now - bucket.lastRefillAt;
    const refillRate = this.maxTokens / this.refillWindowMs; // tokens por ms
    const refilled = Math.min(this.maxTokens, bucket.tokens + elapsed * refillRate);

    if (refilled < 1) {
      const msUntilNextToken = (1 - refilled) / refillRate;
      this.buckets.set(key, { tokens: refilled, lastRefillAt: now });
      return { allowed: false, retryAfterMs: Math.ceil(msUntilNextToken), remaining: 0 };
    }

    const remaining = refilled - 1;
    this.buckets.set(key, { tokens: remaining, lastRefillAt: now });
    return { allowed: true, retryAfterMs: 0, remaining: Math.floor(remaining) };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}
