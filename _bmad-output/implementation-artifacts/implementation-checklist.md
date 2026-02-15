# Option A Implementation Checklist
**Project:** EVE Market Web App Storage Optimization
**Goal:** Reduce storage from 540 MB → ~220 MB, add caching layer
**Estimated time:** 2-4 hours
**Status:** Ready for development

---

## Pre-Implementation

### ✅ **Backup current database (optional but recommended)**
```bash
# Export current data as backup (if you want to keep historical data)
# This is optional - you're starting fresh, but good to have a safety net
pg_dump YOUR_NEON_CONNECTION_STRING > backup-$(date +%Y%m%d).sql
```

---

## Implementation Steps

### 📝 **Step 1: Remove Redundant Cleanup Job** (10 minutes)

**What to do:**
1. Find where `cleanupOldOrders()` is scheduled/called
2. Remove or comment out the invocation
3. Keep the file `webapp/src/jobs/cleanup-old-data.ts` (for reference, don't delete it)

**Files to check:**
- [ ] `.github/workflows/` - GitHub Actions workflows
- [ ] `vercel.json` or similar - cron config
- [ ] Any scheduler code that calls `cleanupOldOrders()`

**Why:** The per-region delete in `fetch-market-data.ts` already handles cleanup. The 7-day job is redundant and causes storage bloat.

---

### 💾 **Step 2: Create Cache Module** (30 minutes)

**Create:** `webapp/src/lib/market-cache.ts`

**Copy the full code from:** [option-a-optimization-plan.md:70-153](_bmad-output/implementation-artifacts/option-a-optimization-plan.md)

**Checklist:**
- [ ] Create file `webapp/src/lib/market-cache.ts`
- [ ] Copy the MarketCache class implementation
- [ ] Verify imports work (`@prisma/client`, `./logger`)
- [ ] Export singleton instance: `export const marketCache = new MarketCache(30, 35);`

**Key features:**
- Three-layer expiration (staleness check, event invalidation, safety TTL)
- Pattern-based invalidation
- Automatic cleanup every 30 minutes

---

### 🔧 **Step 3: Create Market Data Service** (30 minutes)

**Create:** `webapp/src/lib/market-data-service.ts`

**Copy the full code from:** [option-a-optimization-plan.md:160-214](_bmad-output/implementation-artifacts/option-a-optimization-plan.md)

**Checklist:**
- [ ] Create file `webapp/src/lib/market-data-service.ts`
- [ ] Implement `getRegionOrders(regionId)` with cache wrapper
- [ ] Implement `getOrdersByType(regionId, typeId)` with cache wrapper
- [ ] Add any other query patterns your API uses

**Key logic:**
- Check cache first
- On miss: fetch from DB, get `fetchedAt` from first order, cache with timestamp
- Return cached or fresh data

---

### 🔄 **Step 4: Update Fetch Job to Invalidate Cache** (15 minutes)

**Modify:** `webapp/src/jobs/fetch-market-data.ts`

**Add import at top:**
```typescript
import { marketCache } from '@/lib/market-cache';
```

**Add invalidation after region upsert** (around line 195-203):
```typescript
await prisma.region.upsert({
  where: { regionId },
  update: { lastFetchedAt: new Date() },
  create: {
    regionId,
    name: `Region ${regionId}`,
    lastFetchedAt: new Date()
  }
});

// 🆕 ADD THIS: Invalidate cache after new data is inserted
marketCache.invalidatePattern(new RegExp(`^region:${regionId}:`));

logger.info({
  event: 'region_fetched',
  regionId,
  ordersDeleted: deleteResult.count,
  ordersInserted: totalInserted,
  pages: page - 1,
  attempt: attempt + 1,
  cacheInvalidated: true, // 🆕 ADD THIS
  memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
});
```

**Checklist:**
- [ ] Import `marketCache`
- [ ] Add cache invalidation after region upsert
- [ ] Add `cacheInvalidated: true` to log output

---

### 🌐 **Step 5: Update API Routes** (30 minutes)

**Find all API routes that query `marketOrder` and replace with cached service.**

**Example locations:**
- `webapp/src/app/api/*/route.ts`
- Any server components that fetch market data

**Before:**
```typescript
const orders = await prisma.marketOrder.findMany({
  where: { regionId }
});
```

**After:**
```typescript
import { getRegionOrders } from '@/lib/market-data-service';

const orders = await getRegionOrders(regionId);
```

**Checklist:**
- [ ] Find all `prisma.marketOrder.findMany()` calls
- [ ] Replace with appropriate service function
- [ ] Add imports for service functions
- [ ] Test each updated endpoint

---

### 🗑️ **Step 6: Wipe Database (Start Fresh)** (5 minutes)

**⚠️ WARNING: This deletes all market data. Do this AFTER Steps 1-5 are deployed.**

**Run in Neon SQL Editor or via psql:**
```sql
-- Delete all market orders (this will free up ~440 MB)
DELETE FROM market_orders;

-- Reset region timestamps (optional - forces re-fetch on next job run)
UPDATE regions SET "lastFetchedAt" = NULL;

-- Verify cleanup
SELECT COUNT(*) FROM market_orders; -- Should return 0
```

**Why wipe:**
- Removes 7 days of duplicate/stale snapshots
- Immediate storage reduction from 540 MB → ~100 MB
- Next fetch will populate with fresh data only
- Verifies new logic works correctly from clean slate

**Checklist:**
- [ ] Deploy code changes (Steps 1-5) to production
- [ ] Run DELETE query on Neon database
- [ ] Verify `market_orders` count = 0
- [ ] Trigger a manual fetch job to repopulate with fresh data
- [ ] Check Neon dashboard - storage should drop to ~100-150 MB

---

### ✅ **Step 7: Verify Everything Works** (15 minutes)

**After deploying and wiping DB:**

1. **Trigger background fetch job manually** (or wait for scheduled run)
   - Check logs: `region_fetched` events with `cacheInvalidated: true`
   - Verify orders are inserted

2. **Check database:**
```sql
-- Should have ~1M orders (one snapshot per region)
SELECT COUNT(*) FROM market_orders;

-- Each region should have only 1 distinct fetchedAt timestamp
SELECT "regionId", COUNT(*), MIN("fetchedAt"), MAX("fetchedAt")
FROM market_orders
GROUP BY "regionId";
```

3. **Test API endpoints:**
   - First request → should log `cache_miss`
   - Second request (within 30 min) → should log `cache_hit`
   - Response times should be <10ms for cache hits

4. **Check Neon dashboard:**
   - Storage should be ~200-250 MB (down from 540 MB)
   - Usage: ~40-50% of 500 MB limit

**Checklist:**
- [ ] Background job completes successfully
- [ ] Database has ~1M orders (one snapshot per region)
- [ ] Cache hits working (check logs)
- [ ] API response times improved
- [ ] Neon storage ~200-250 MB

---

## Optional Optimizations (If Still Tight on Storage)

### **Drop Unused Indexes** (15 minutes)

**Check current indexes:**
```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

**Keep these indexes:**
- `market_orders_pkey` (primary key on `id`)
- `market_orders_orderId_key` (unique constraint on `orderId`)
- `market_orders_regionId_typeId_idx` (composite for ROI queries)

**Drop if not used:**
```sql
-- Example (only if you confirm it's not needed)
DROP INDEX IF EXISTS some_unused_index;
```

---

## Rollback Plan (If Something Breaks)

1. **Re-enable cleanup job:** Uncomment the scheduled cleanup
2. **Revert API routes:** Change service calls back to direct Prisma queries
3. **Remove cache import from fetch job**
4. **Database is unchanged:** No schema migrations, so no DB rollback needed

---

## Success Metrics

After completion, you should see:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Storage** | 540 MB | ~220 MB | <250 MB |
| **Storage usage** | 108% | ~44% | <80% |
| **Order count** | ~7M+ (duplicates) | ~1M | 1M |
| **Cache hit rate** | 0% (no cache) | >95% | >90% |
| **API response time** | 50-200ms | <10ms | <50ms |
| **DB queries/hour** | 1000s | <20 | <100 |

---

## Post-Implementation

**Monitor for 24-48 hours:**
- [ ] Check Neon storage usage (should stabilize at ~220 MB)
- [ ] Verify fetch jobs run successfully every 30 minutes
- [ ] Monitor cache hit rate in logs (should be >95%)
- [ ] Check for any errors or unexpected behavior

**Once stable:**
- [ ] Document cache TTL config (make it an env var if needed)
- [ ] Set up alerts if storage exceeds 400 MB (80% limit)
- [ ] Consider adding cache stats endpoint for monitoring

---

## Need Help?

**If you encounter issues:**
1. Check logs for errors (`cache_expired`, `cache_miss` reasons)
2. Verify cache invalidation fires after fetch (look for `cacheInvalidated: true`)
3. Test with a single region first before deploying globally
4. Reach out if you hit blockers

**Ready to start implementing?** Follow the steps in order and check them off as you go! 🚀
