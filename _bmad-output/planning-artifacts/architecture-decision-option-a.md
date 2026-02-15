# Architecture Decision Record: Storage Optimization Strategy

**Date:** 2026-02-15
**Status:** Accepted
**Decision:** Optimize Neon free tier storage instead of migrating to MongoDB or upgrading to paid plan

---

## Context

The EVE Market Web App hit 100% of Neon PostgreSQL's free tier storage limit (0.5 GB). The app stores shared, read-heavy market data fetched from EVE Online's ESI API on a scheduled basis. There are no user-specific writes, and all users see the same data.

### Current State
- **Storage:** 540 MB / 500 MB (108% of limit)
- **Data pattern:** 1M+ market orders, updated every 15 minutes via background job
- **Retention logic:** 7-day cleanup job + per-region delete-on-fetch
- **Read pattern:** Every user request hits database (no caching)
- **Cost:** $0/month (Neon free tier)

---

## Problem Statement

The database is at risk of suspension due to exceeding storage limits. We need to either:
1. Reduce storage footprint
2. Migrate to a different database
3. Upgrade to a paid plan

---

## Decision

**We will optimize the existing Neon free tier setup** by:
1. Removing the redundant 7-day cleanup job (per-region delete already handles this)
2. Implementing in-memory caching with TTL matching fetch interval (15 minutes)
3. Optionally dropping unused indexes and reducing data precision

**We will NOT:**
- Migrate to MongoDB Atlas (avoided migration effort)
- Upgrade to Neon Launch ($3-5/month) until optimization proves insufficient

---

## Options Considered

### Option A: Optimize Neon Free Tier (CHOSEN)
- **Cost:** $0/month
- **Effort:** 2-4 hours implementation
- **Storage impact:** 540 MB → ~200-250 MB (expected)
- **Performance impact:** Database load reduced by 99% via caching (30-min TTL)
- **Risk:** Low (no schema changes, easy rollback)

**Pros:**
- Zero cost
- Keeps existing PostgreSQL + Prisma stack
- Minimal code changes
- Improves performance (caching)

**Cons:**
- Limited headroom for growth (~250 MB buffer)
- If growth continues, will need to revisit in 3-6 months

---

### Option B: Migrate to MongoDB Atlas Free Tier (REJECTED)
- **Cost:** $0/month
- **Effort:** 1-2 days (schema redesign, rewrite data layer)
- **Storage capacity:** 512 MB (only 12 MB more than Neon)
- **Risk:** Medium (migration errors, schema design mistakes)

**Pros:**
- Slightly more storage (512 MB vs 500 MB)
- No read/write operation limits
- Document model fits use case naturally

**Cons:**
- **High migration effort:** Rewrite Prisma → MongoDB driver, redesign schema
- **Minimal storage gain:** 12 MB difference doesn't justify effort
- **Unknown unknowns:** Potential bugs during migration

**Why rejected:** The storage gain (2.4%) doesn't justify 1-2 days of migration work when optimization can free up 60% of storage.

---

### Option C: Upgrade to Neon Launch (REJECTED FOR NOW)
- **Cost:** $3-5/month (usage-based)
- **Effort:** 5 minutes (just upgrade plan)
- **Storage capacity:** Pay-as-you-go (~$0.35/GB-month)
- **Risk:** Low (no code changes)

**Pros:**
- Instant fix
- Room to grow (5-10 GB for $2-4/month)
- Zero dev effort

**Cons:**
- Costs money (even if minimal)
- Doesn't address architectural inefficiency (read-heavy data doesn't need relational DB)

**Why rejected for now:** Paying $3-5/month is premature when free optimization can solve the problem. We'll keep this as a fallback if Option A fails.

---

## Technical Details

### Storage Breakdown (Current)
```
MarketOrder table: ~440 MB
  - 1M orders × ~200 bytes per row × multiple snapshots
  - 7-day retention + per-region overlaps = storage bloat

Indexes: ~80 MB
  - Primary key (id)
  - Unique constraint (orderId)
  - Composite index (regionId, typeId)

ItemType cache: ~10 MB
Location cache: ~10 MB
Region metadata: <1 MB

Total: ~540 MB
```

### Storage Breakdown (After Optimization)
```
MarketOrder table: ~200 MB
  - 1M orders × ~200 bytes per row × 1 snapshot only
  - Delete-on-fetch ensures only latest data exists

Indexes: ~80 MB
  - Same as before

Caches: ~20 MB
  - Same as before

Total: ~220 MB (59% reduction)
```

### Cache Architecture

**Two-Layer Expiration Strategy:**
```
┌─────────────────────────────────────────────┐
│             User Requests (1000)            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  In-Memory    │  ◄── Layer 1: Data staleness check (30 min max)
         │  Cache (Map)  │  ◄── Layer 2: Event-based invalidation
         │               │  ◄── Layer 3: Safety TTL (35 min)
         │  99% hit rate │
         └───────┬───────┘
                 │ 1% cache misses
                 ▼
         ┌───────────────┐
         │  PostgreSQL   │  ◄── Only queried on cache miss
         │  (Neon Free)  │      ~10-20 queries/hour (vs 1000s)
         └───────────────┘
                 ▲
                 │
         ┌───────┴───────┐
         │  Background   │  ◄── Invalidates cache on fetch
         │  Fetch Job    │      Runs every 30 min
         └───────────────┘
```

**Cache Expiration Flow:**
```
Cache Entry Created
  ├─ Stores: data + fetchedAt timestamp + cache timestamp
  │
User Request at T=29 min
  ├─ Check 1: Is data < 30 min old? (fetchedAt check)
  │   └─ YES → Return cached data ✓
  │
Background Job at T=30 min
  ├─ New data inserted
  └─ Cache invalidated for this region
  │
User Request at T=31 min
  ├─ Cache miss (was invalidated)
  └─ Fetch from DB (new data from T=30) ✓

Maximum staleness: 30 minutes (guaranteed)
```

---

## Consequences

### Positive
- **Storage reduced by ~60%** (540 MB → 220 MB)
- **Performance improved:** API response times drop from 50-200ms to <10ms (cache hits)
- **Database load reduced by 99%:** Neon free tier query limits no longer a concern
- **Zero cost:** Stays on free tier
- **Easy rollback:** No schema changes, can revert cache layer easily

### Negative
- **Memory usage increases slightly:** Cache consumes ~20-50 MB of Node.js heap (acceptable for 256 MB free VMs)
- **Cache invalidation complexity:** Must ensure cache is cleared after fetch (risk of serving stale data if logic fails)
- **Limited future growth:** Still only 250 MB headroom before hitting limits again

### Neutral
- **Caching is a prerequisite for scale:** Even if we migrate to MongoDB or upgrade to Neon Launch, we'd still need caching for 1000+ concurrent users
- **This optimization is not wasted effort:** The cache layer will remain valuable regardless of future database choices

---

## Success Metrics

After implementation, we expect:
1. **Storage usage:** <250 MB (verified via Neon dashboard)
2. **Cache hit rate:** >95% (logged via cache stats)
3. **API response times:** <10ms for cached endpoints (measured via logs)
4. **Database queries:** <20/hour per region (down from 1000s)

---

## Revisit Criteria

We'll revisit this decision if:
1. **Storage exceeds 400 MB** (80% of limit) despite optimization
2. **User count grows beyond 2000** (cache memory usage becomes a bottleneck)
3. **New features require relational queries** (e.g., user portfolios, historical price charts)

At that point, we'll choose between:
- **Neon Launch upgrade** ($3-5/month, keeps PostgreSQL)
- **MongoDB migration** (if we have dev time and want to learn MongoDB)

---

## Notes

- This decision prioritizes **pragmatism over purity**. PostgreSQL is overkill for this use case, but migration effort outweighs storage savings.
- The cache layer is a **forcing function for good architecture**: it decouples the API from the database and makes future migrations easier.
- If we later migrate to MongoDB, the cache layer and service abstraction (`market-data-service.ts`) remain unchanged — only the DB client swaps out.

---

**Decision made by:** Winston (Architect) + Harry (Product Owner)
**Reviewed by:** N/A
**Approved for implementation:** 2026-02-15
