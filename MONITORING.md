# Database Monitoring Guide

## 📊 Built-in Observability

The new architecture includes automatic query tracking. After each workflow run, you'll see:

### **Console Output:**
```
============================================================
📊 DATABASE METRICS SUMMARY
============================================================
Total Queries:        327
Total Connections:    1
Duration:             4.23 minutes
Queries/Minute:       77.30

Operation Breakdown:
  INSERT               164
  UPDATE               113
  TRUNCATE             1
  SELECT               49
============================================================

💡 Expected Reduction:
Old approach: ~791 queries (per region: DELETE + INSERT batches + region update + VACUUM)
New approach: 327 queries (TRUNCATE + INSERT batches + region updates)
Reduction: 58.7%
```

## 🔍 Neon Console Monitoring

### **1. Real-time Metrics**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click **Monitoring** tab
4. Watch metrics during workflow runs:
   - **Active time** - Should be ~5 min instead of ~30 min
   - **Compute time** - Dramatically reduced
   - **Data transfer** - Lower bandwidth usage
   - **Connections** - Peak of ~5 instead of ~40

### **2. Query Performance Insights**
```sql
-- Run this query in Neon SQL Editor to see request patterns
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

### **3. Connection Monitoring**
```sql
-- See active connections
SELECT
  count(*) as total_connections,
  state,
  application_name
FROM pg_stat_activity
GROUP BY state, application_name;
```

## 📈 Expected Metrics (Per 30min Run)

| Metric | Old (CockroachDB) | New (Neon) | Reduction |
|--------|-------------------|------------|-----------|
| **Total Queries** | ~800 | ~350 | 56% |
| **Active Compute Time** | ~30 min | ~5 min | 83% |
| **Peak Connections** | ~40 | ~5 | 87% |
| **Data Transfer** | High | Low | ~80% |
| **Cost Impact** | High | Minimal | ~90% |

## 🎯 What to Monitor

### **GitHub Actions Logs**
Check the workflow output for:
- Phase 1 jobs: Should show 0 database queries
- Consolidate step: Shows exact query count
- VACUUM step: Shows 1-2 queries

### **Neon Dashboard**
Watch for:
- **Compute hours**: Should drop from ~24/month → ~2.5/month
- **Written data**: ~1.6M rows every 30min (expected)
- **Read queries**: Minimal (only from API endpoints)

### **API Endpoint Monitoring**
With reduced polling (5min instead of 60s):
- `/api/data-freshness`: ~12 requests/hour → ~288/day
- `/api/opportunities`: User-driven (no change)
- `/api/regions`: Cached for 1 hour

## 🚨 Alerts to Set Up

In Neon Console, set up alerts for:
1. **Compute time > 5 hours/day** (indicates issue)
2. **Active connections > 10** (potential leak)
3. **Storage > 400MB** (data bloat)

## 💰 Cost Tracking

**Neon Free Tier Limits:**
- ✅ 192 compute hours/month (~6.4 hours/day)
- ✅ 5GB data transfer/month
- ✅ 512MB storage

**Expected Usage:**
- ✅ ~2.5 compute hours/month (well under limit)
- ✅ ~500MB data transfer/month (10% of limit)
- ✅ ~100MB storage (20% of limit)

You should stay comfortably within the free tier! 🎉

## 📝 Troubleshooting

If you see high query counts:
1. Check GitHub Actions logs for Phase 1 - should have NO database queries
2. Verify TRUNCATE is being used (not DELETE per region)
3. Check Neon console for unexpected connections
4. Review API endpoint caching (5min intervals)

If compute time is high:
1. Ensure VACUUM runs as separate step (not per-region)
2. Check for failed jobs that retry multiple times
3. Verify connection pooling (max 5 connections)

## 🚀 Future Optimization: Frontend Query Aggregation

**Current Issue:**
The `/api/opportunities` endpoint pulls **ALL orders** for selected regions:
- The Forge: 444k sell + 444k buy = **888k rows per request**
- Each cache miss = high RTU usage
- Multiple users = multiplied cost

**Solution (Ready to Implement):**
Use database aggregation instead of pulling all rows:

```typescript
// OLD: Pull 444k rows
const orders = await prisma.marketOrder.findMany({
  where: { regionId, isBuyOrder }
});

// NEW: Aggregate to ~15k rows (one per item type)
const aggregated = await prisma.$queryRaw`
  SELECT
    typeId,
    MIN(price) as bestPrice,
    SUM(volumeRemain) as totalVolume,
    (array_agg(locationId ORDER BY price))[1] as bestLocation
  FROM market_orders
  WHERE regionId = ${regionId} AND isBuyOrder = ${isBuyOrder}
  GROUP BY typeId
`;
```

**Impact:**
- Reduces 444k → 15k rows (**97% reduction**)
- Dramatically lower RTUs
- Faster response times
- Same opportunity calculation results

See `market-data-service-optimized.ts` for implementation.

To enable:
1. Update `/api/opportunities/route.ts` to use `calculateOpportunitiesOptimized`
2. Test with The Forge region
3. Deploy

This is a **Phase 2 optimization** after verifying the current improvements work.
