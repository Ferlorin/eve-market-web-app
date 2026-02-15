# Option A: Neon Free Tier Optimization Plan
**Created:** 2026-02-15
**Status:** Ready to implement
**Estimated effort:** 2-4 hours
**Expected outcome:** Reduce storage from 540 MB to ~200-250 MB

---

## Overview

We're staying on Neon's free tier (500 MB limit) by implementing storage optimizations and an in-memory caching layer. This avoids migration costs and keeps the existing PostgreSQL + Prisma stack intact.

---

## Implementation Steps

### ✅ **Step 1: Remove Redundant Cleanup Job** (10 minutes)

**Problem:** The 7-day cleanup job is redundant because we already delete all orders per-region during each fetch.

**What to do:**
1. Remove or disable the cleanup job invocation from wherever it's scheduled
2. Keep the `cleanup-old-data.ts` file for now (in case we need it later), but don't call it
3. Verify the fetch job is correctly deleting old orders per-region (it already does this at `fetch-market-data.ts:167-169`)

**Files to check/modify:**
- Any cron job config or scheduler that calls `cleanupOldOrders()`
- GitHub Actions workflows (`.github/workflows/`)
- Vercel cron config or similar

**Verification:**
- After next fetch cycle, run this query to confirm only latest snapshot exists per region:
```sql
SELECT "regionId", COUNT(*), MIN("fetchedAt"), MAX("fetchedAt")
FROM market_orders
GROUP BY "regionId";
```
- Each region should have only 1 distinct `fetchedAt` timestamp

---

### ✅ **Step 2: Implement In-Memory Cache** (1-2 hours)

**Goal:** Serve 99% of user requests from RAM, only hitting DB once per fetch cycle.

**Cache Strategy - Two-Layer Expiration:**
1. **Data staleness check:** Data can't be older than 30 minutes (based on `fetchedAt` from DB)
2. **Cache invalidation:** Background job clears cache when new data arrives
3. **Safety TTL:** Cache entries expire after 35 minutes as a safety net

This guarantees users **never see data older than 30 minutes**, even if:
- Cache invalidation fails
- Background job is delayed
- A user requests at T=29 (they get 29-min-old data, which is within the limit)

**Architecture:**
```
User Request → Cache (check staleness) → Data < 30 min old? → Return cached data
                                       → Data ≥ 30 min old? → Expire, fetch from DB

Background Fetch (every 30 min) → Insert new data → Invalidate cache → Next user gets fresh data
```

**Implementation:**

#### **2a. Create the cache module**

Create `webapp/src/lib/market-cache.ts`:

```typescript
import { MarketOrder } from '@prisma/client';
import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fetchedAt: Date; // When the data was fetched from ESI (from DB)
}

class MarketCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxStalenessMs: number; // Maximum age of data in cache
  private ttl: number; // Safety TTL (slightly longer than fetch interval)

  constructor(maxStalenessMinutes: number = 30, safetyTtlMinutes: number = 35) {
    this.cache = new Map();
    this.maxStalenessMs = maxStalenessMinutes * 60 * 1000;
    this.ttl = safetyTtlMinutes * 60 * 1000;

    // Clean up stale entries every 30 minutes
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

    // Check 1: Safety TTL (cache entry too old)
    if (cacheAge > this.ttl) {
      logger.debug({ event: 'cache_expired', key, reason: 'ttl_exceeded', cacheAgeMs: cacheAge });
      this.cache.delete(key);
      return null;
    }

    // Check 2: Data staleness (data itself is too old, even if cache is fresh)
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
      fetchedAt
    });
    logger.debug({
      event: 'cache_set',
      key,
      fetchedAt: fetchedAt.toISOString(),
      sizeBytes: JSON.stringify(data).length
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug({ event: 'cache_invalidated', key });
  }

  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.info({ event: 'cache_pattern_invalidated', pattern: pattern.source, keysInvalidated: count });
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
      safetyTtlMinutes: this.ttl / (60 * 1000)
    };
  }
}

// Singleton instance
// maxStaleness = 30 min (data can't be older than this)
// safetyTTL = 35 min (cache entries cleaned up after this, even if not stale)
export const marketCache = new MarketCache(30, 35);
```

#### **2b. Wrap database queries with cache**

Create `webapp/src/lib/market-data-service.ts`:

```typescript
import { prisma } from './db';
import { marketCache } from './market-cache';
import { MarketOrder } from '@prisma/client';

export async function getRegionOrders(regionId: number): Promise<MarketOrder[]> {
  const cacheKey = `region:${regionId}:orders`;

  // Check cache first
  const cached = marketCache.get<MarketOrder[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from DB
  const orders = await prisma.marketOrder.findMany({
    where: { regionId },
    orderBy: { fetchedAt: 'desc' }
  });

  if (orders.length === 0) {
    return [];
  }

  // Use the fetchedAt timestamp from the most recent order
  // (all orders for a region have the same fetchedAt from the same fetch cycle)
  const fetchedAt = orders[0].fetchedAt;

  // Store in cache with the data's actual fetch timestamp
  marketCache.set(cacheKey, orders, fetchedAt);

  return orders;
}

export async function getOrdersByType(regionId: number, typeId: number): Promise<MarketOrder[]> {
  const cacheKey = `region:${regionId}:type:${typeId}:orders`;

  const cached = marketCache.get<MarketOrder[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const orders = await prisma.marketOrder.findMany({
    where: {
      regionId,
      typeId
    },
    orderBy: { fetchedAt: 'desc' }
  });

  if (orders.length === 0) {
    return [];
  }

  const fetchedAt = orders[0].fetchedAt;
  marketCache.set(cacheKey, orders, fetchedAt);

  return orders;
}

// Add more query patterns as needed...
```

#### **2c. Invalidate cache after fetch**

Modify `webapp/src/jobs/fetch-market-data.ts` to invalidate cache after each region fetch:

```typescript
import { marketCache } from '@/lib/market-cache';

// In fetchRegionWithRetry(), after successful fetch:
// IMPORTANT: Update region timestamp first
await prisma.region.upsert({
  where: { regionId },
  update: { lastFetchedAt: new Date() },
  create: {
    regionId,
    name: `Region ${regionId}`,
    lastFetchedAt: new Date()
  }
});

// 🆕 CRITICAL: Invalidate cache AFTER new data is inserted
// This ensures users get old cached data during the fetch operation
// and fresh data from the next request after invalidation
marketCache.invalidatePattern(new RegExp(`^region:${regionId}:`));

logger.info({
  event: 'region_fetched',
  regionId,
  ordersDeleted: deleteResult.count,
  ordersInserted: totalInserted,
  pages: page - 1,
  attempt: attempt + 1,
  cacheInvalidated: true,
  memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
});
```

**Why invalidate AFTER, not before?**
- During the fetch operation, the database is in transition (old data deleted, new data being inserted)
- If we invalidate before, users might query during this window and get empty or partial results
- By invalidating after, users get slightly stale cached data during the fetch (acceptable)
- The cache staleness check (30-min limit) ensures data never gets too old anyway

#### **2d. Update API routes to use cache**

Replace direct Prisma calls with cached service calls:

```typescript
// Before:
const orders = await prisma.marketOrder.findMany({ where: { regionId } });

// After:
import { getRegionOrders } from '@/lib/market-data-service';
const orders = await getRegionOrders(regionId);
```

**Files to update:**
- Any API route in `webapp/src/app/api/` that queries `marketOrder`
- Any server component that fetches market data

---

### ✅ **Step 3: Verify Storage Reduction** (15 minutes)

**After deploying Step 1 and Step 2:**

1. **Check database size:**
```sql
-- Connect to Neon database
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

2. **Check order count:**
```sql
SELECT COUNT(*) FROM market_orders;
```

Expected result: ~1 million orders (one snapshot per region)

3. **Verify cache is working:**
- Check logs for `cache_hit` and `cache_miss` events
- First request to an endpoint should be a cache miss, subsequent requests (within 30 min) should be hits

---

### ✅ **Step 4: Optional Optimizations** (30 minutes - 1 hour)

If storage is still tight after Steps 1-3, do these:

#### **4a. Drop unused indexes**

Check current indexes:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

Drop any indexes that aren't being used in queries. Keep:
- Primary keys (id, orderId)
- `regionId_typeId` composite index (used for ROI queries)

Drop if not needed:
- Any single-column indexes that duplicate composite index coverage

#### **4b. Reduce data precision where possible**

If `price` is stored as `Decimal(20, 2)` but EVE prices don't need 2 decimal places:
```sql
-- Check if you can reduce precision
ALTER TABLE market_orders ALTER COLUMN price TYPE DECIMAL(18, 0);
```

This saves ~2-4 bytes per row × 1M rows = ~2-4 MB (minor, but helps)

#### **4c. Archive ItemType and Location caches**

If you have thousands of cached item types/locations that are rarely used:
- Only keep items that appear in recent market orders
- Delete stale entries that haven't been seen in 30+ days

---

## Expected Results

### **Storage reduction:**
- **Before:** 540 MB (7 days × ~672 snapshots per region)
- **After:** ~200-250 MB (1 snapshot per region + indexes)
- **Headroom:** ~250 MB (50% of free tier limit)

### **Performance improvement:**
- **Before:** Every request hits database (50-200ms)
- **After:** 99% of requests served from cache (<10ms)
- **Database load:** Reduced by 99%

### **Cost:**
- Still $0/month

---

## Rollback Plan

If something breaks:

1. **Re-enable cleanup job:** Uncomment the scheduled cleanup (reverts Step 1)
2. **Remove cache layer:** Revert API routes to direct Prisma calls (reverts Step 2)
3. **Database is unchanged:** No schema migrations, so no DB rollback needed

---

## Monitoring & Validation

After deployment, monitor these metrics:

1. **Neon dashboard:** Watch storage usage (should drop to ~200-250 MB within 24 hours)
2. **Cache hit rate:** Should be >95% after warmup period
3. **API response times:** Should improve (50-200ms → <10ms for cached endpoints)
4. **Memory usage:** Node.js process should stay under 256 MB (check with `process.memoryUsage()`)

---

## Next Steps After Optimization

Once storage is stable:

1. **Add monitoring:** Set up alerts if storage exceeds 400 MB (80% of limit)
2. **Document cache TTL:** Make it configurable via env var (`CACHE_TTL_MINUTES=30`)
3. **Consider Redis:** If you scale to multiple server instances, migrate from in-memory cache to Redis (Upstash free tier: 10k commands/day)

---

## Questions or Issues?

If you hit any blockers during implementation:
- Check logs for errors
- Verify cache invalidation is firing after fetch jobs
- Test with a single region first before deploying globally

Let me know if you need help with any of these steps.
