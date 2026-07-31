/**
 * Cache simples em memória, com expiração por tempo (TTL) e limite de
 * entradas (política de despejo: a mais antiga sai primeiro, aproveitando
 * a ordem de inserção do Map).
 *
 * Suficiente para uma única instância do gateway. Em produção com múltiplas
 * réplicas, isso seria substituído por Redis — a interface pública
 * permaneceria a mesma.
 */
export class TtlCache<Value> {
  private readonly store = new Map<string, { value: Value; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number
  ) {}

  get(key: string): Value | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: Value): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Gera uma chave de cache determinística a partir do corpo da requisição.
 * Duas requisições com o mesmo conteúdo (mesma ordem de chaves ou não)
 * produzem a mesma chave.
 */
export function buildCacheKey(input: unknown): string {
  return JSON.stringify(input, Object.keys(input as object).sort());
}
