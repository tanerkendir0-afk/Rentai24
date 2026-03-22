interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

class CacheService {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };

  constructor(maxSize = 1000, defaultTTLMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLMs;

    setInterval(() => this.cleanup(), 60_000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTTL),
      hits: 0,
    });
    this.stats.sets++;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  getStats(): typeof this.stats & { size: number; maxSize: number; hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : "0%",
    };
  }

  private evictLRU(): void {
    let lowestHits = Infinity;
    let lowestKey: string | null = null;

    for (const [key, entry] of this.store) {
      if (entry.hits < lowestHits) {
        lowestHits = entry.hits;
        lowestKey = key;
      }
    }

    if (lowestKey) {
      this.store.delete(lowestKey);
      this.stats.evictions++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const agentResponseCache = new CacheService(500, 10 * 60 * 1000);
export const faqCache = new CacheService(200, 30 * 60 * 1000);
export const analyticsCache = new CacheService(100, 5 * 60 * 1000);

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

export async function getOrSet<T>(
  cache: CacheService,
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  cache.set(key, value, ttlMs);
  return value;
}
