import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fetchedAt: Date;
}

class MarketCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxStalenessMs: number;
  private ttl: number;

  constructor(maxStalenessMinutes: number = 30, safetyTtlMinutes: number = 35) {
    this.cache = new Map();
    this.maxStalenessMs = maxStalenessMinutes * 60 * 1000;
    this.ttl = safetyTtlMinutes * 60 * 1000;

    setInterval(() => this.cleanup(), 30 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug({ event: 'cache_miss', key, reason: 'not_found' });
      return null;
    }

    const now = Date.now();
    const cacheAge = now - entry.timestamp;
    const dataAge = now - entry.fetchedAt.getTime();

    if (cacheAge > this.ttl) {
      logger.debug({ event: 'cache_expired', key, reason: 'ttl_exceeded', cacheAgeMs: cacheAge });
      this.cache.delete(key);
      return null;
    }

    if (dataAge > this.maxStalenessMs) {
      logger.debug({ event: 'cache_expired', key, reason: 'data_stale', dataAgeMs: dataAge });
      this.cache.delete(key);
      return null;
    }

    logger.debug({ event: 'cache_hit', key, cacheAgeMs: cacheAge, dataAgeMs: dataAge });
    return entry.data as T;
  }

  set<T>(key: string, data: T, fetchedAt: Date): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      fetchedAt,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.info({ event: 'cache_pattern_invalidated', pattern: pattern.source, keysInvalidated: count });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const cacheAge = now - entry.timestamp;
      const dataAge = now - entry.fetchedAt.getTime();

      if (cacheAge > this.ttl || dataAge > this.maxStalenessMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info({ event: 'cache_cleanup', removedEntries: removed, totalEntries: this.cache.size });
    }
  }

  stats() {
    return {
      entries: this.cache.size,
      maxStalenessMinutes: this.maxStalenessMs / (60 * 1000),
      safetyTtlMinutes: this.ttl / (60 * 1000),
    };
  }
}

// Singleton instance
// maxStaleness = 30 min (data can't be older than this)
// safetyTTL = 35 min (cache entries cleaned up after this, even if not stale)
export const marketCache = new MarketCache(30, 35);
