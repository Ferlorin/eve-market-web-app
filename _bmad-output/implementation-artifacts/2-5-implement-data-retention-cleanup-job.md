# Story 2.5: Implement Data Retention Cleanup Job

Status: ready-for-dev

## Story

As a developer,
I want to automatically purge market orders older than 7 days,
So that the database stays within the 0.5GB Neon free tier limit.

## Acceptance Criteria

**Given** the MarketOrder table contains data from multiple fetch cycles
**When** I create `jobs/cleanup-old-data.ts` with a function `cleanupOldOrders()`
**Then** the function deletes all MarketOrder records where fetchedAt is older than 7 days
**And** the function logs the number of records deleted
**And** I can schedule this function to run daily (or after each fetch cycle)
**And** running the function manually successfully removes old records
**And** the database size remains under 0.5GB after cleanup (verified with Prisma Migrate or Neon dashboard)

## Technical Requirements

### Cleanup Job Structure

**File:** `jobs/cleanup-old-data.ts`

```typescript
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const RETENTION_DAYS = 7;

export async function cleanupOldOrders() {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  logger.info({
    event: 'cleanup_started',
    timestamp: new Date().toISOString(),
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: RETENTION_DAYS
  });
  
  try {
    // Delete old market orders
    const result = await db.marketOrder.deleteMany({
      where: {
        fetchedAt: {
          lt: cutoffDate
        }
      }
    });
    
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'cleanup_completed',
      timestamp: new Date().toISOString(),
      recordsDeleted: result.count,
      durationMs: duration
    });
    
    return {
      recordsDeleted: result.count,
      duration
    };
  } catch (error) {
    logger.error({
      event: 'cleanup_failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Optional: Cleanup old fetch logs to save space
export async function cleanupOldFetchLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep logs for 30 days
  
  const result = await db.fetchLog.deleteMany({
    where: {
      fetchCompletedAt: {
        lt: cutoffDate
      }
    }
  });
  
  logger.info({
    event: 'logs_cleaned',
    recordsDeleted: result.count
  });
  
  return result.count;
}
```

### Scheduled Cleanup Cron

**Option 1: Daily Cleanup (Recommended)**

**Add to `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-markets",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Cron Schedule:** `0 2 * * *` = Daily at 2:00 AM UTC

**File:** `app/api/cron/cleanup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldOrders, cleanupOldFetchLogs } from '@/jobs/cleanup-old-data';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const ordersResult = await cleanupOldOrders();
    const logsResult = await cleanupOldFetchLogs();
    
    return NextResponse.json({
      success: true,
      ordersDeleted: ordersResult.recordsDeleted,
      logsDeleted: logsResult,
      durationMs: ordersResult.duration
    });
  } catch (error) {
    logger.error({
      event: 'cleanup_cron_failed',
      error: error.message
    });
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Option 2: Cleanup After Each Fetch**

**Modify `jobs/fetch-market-data.ts`:**

```typescript
export async function fetchAllRegions() {
  // ... existing fetch logic ...
  
  // After successful fetch, run cleanup
  logger.info({ event: 'starting_cleanup' });
  const cleanupResult = await cleanupOldOrders();
  logger.info({
    event: 'cleanup_after_fetch',
    recordsDeleted: cleanupResult.recordsDeleted
  });
  
  return { regionsProcessed: successful, failed, duration, cleaned: cleanupResult.recordsDeleted };
}
```

### Manual Testing Script

**Create `scripts/test-cleanup.ts`:**

```typescript
import { cleanupOldOrders, cleanupOldFetchLogs } from '@/jobs/cleanup-old-data';
import { db } from '@/lib/db';

async function main() {
  console.log('Testing cleanup job...\n');
  
  // Show current counts
  const beforeCount = await db.marketOrder.count();
  const oldCount = await db.marketOrder.count({
    where: {
      fetchedAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  });
  
  console.log(`Total orders: ${beforeCount}`);
  console.log(`Orders older than 7 days: ${oldCount}`);
  console.log('\nRunning cleanup...\n');
  
  // Run cleanup
  const result = await cleanupOldOrders();
  
  console.log(`Deleted: ${result.recordsDeleted} orders`);
  console.log(`Duration: ${result.duration}ms`);
  
  // Show final count
  const afterCount = await db.marketOrder.count();
  console.log(`\nFinal count: ${afterCount}`);
  
  // Cleanup logs
  console.log('\nCleaning old fetch logs...');
  const logsDeleted = await cleanupOldFetchLogs();
  console.log(`Deleted: ${logsDeleted} log entries`);
  
  process.exit(0);
}

main();
```

**Add to `package.json`:**

```json
{
  "scripts": {
    "cleanup": "tsx scripts/test-cleanup.ts"
  }
}
```

### Database Size Monitoring

**Query to check database size (Prisma):**

```typescript
// scripts/check-db-size.ts
import { db } from '@/lib/db';

async function checkDatabaseSize() {
  const orderCount = await db.marketOrder.count();
  const regionCount = await db.region.count();
  const logCount = await db.fetchLog.count();
  
  // Estimate size (rough calculation)
  // MarketOrder: ~200 bytes per row
  // Region: ~100 bytes per row
  // FetchLog: ~150 bytes per row
  
  const estimatedSizeMB = (
    (orderCount * 200) +
    (regionCount * 100) +
    (logCount * 150)
  ) / (1024 * 1024);
  
  console.log('Database Statistics:');
  console.log(`  Market Orders: ${orderCount.toLocaleString()}`);
  console.log(`  Regions: ${regionCount}`);
  console.log(`  Fetch Logs: ${logCount}`);
  console.log(`  Estimated Size: ${estimatedSizeMB.toFixed(2)} MB`);
  console.log(`  Free Tier Limit: 512 MB`);
  console.log(`  Usage: ${((estimatedSizeMB / 512) * 100).toFixed(1)}%`);
}

checkDatabaseSize();
```

**Run regularly:**

```bash
pnpm tsx scripts/check-db-size.ts
```

### Verification Steps

1. **Insert test data to verify cleanup works:**
   ```typescript
   // Create old test records
   await db.marketOrder.create({
     data: {
       orderId: 999999,
       regionId: 10000002,
       typeId: 34,
       price: 100,
       volumeRemain: 10,
       locationId: 60003760,
       isBuyOrder: false,
       issued: new Date('2026-01-01'),
       fetchedAt: new Date('2026-01-01') // 45 days ago
     }
   });
   ```

2. **Run cleanup:**
   ```bash
   pnpm run cleanup
   ```

3. **Verify old record deleted:**
   ```bash
   pnpm prisma studio
   # Check that orderId 999999 no longer exists
   ```

4. **Check Neon dashboard for database size:**
   - Login to Neon console
   - View project storage metrics
   - Verify under 512MB

## Architecture Context

### Why 7-Day Retention

**Design Decision:**
- **7 days** provides 14 complete fetch cycles (30-minute intervals)
- Allows historical analysis of price trends
- Keeps database well under 0.5GB limit

**Math:**
- 60 regions × 500 orders/region × 48 fetches/day × 7 days = ~10 million records
- At ~200 bytes per record = ~2GB without cleanup
- With 7-day purge: ~315,000 active records = ~63MB (well under limit)

### Why Daily Cleanup vs After-Fetch

**Daily Cleanup (Recommended):**
- Runs during low-traffic period (2 AM UTC)
- Doesn't slow down critical fetch job
- More predictable execution time
- Easier to monitor separately

**After-Fetch Cleanup:**
- Ensures cleanup happens even if cron fails
- Slightly increases fetch job duration
- Good fallback if Vercel cron unreliable

**Decision:** Use daily cron for MVP, add after-fetch as backup if needed

### Deletion Performance

**Prisma deleteMany Performance:**
- Deletion by index (fetchedAt) is fast
- ~10,000 records deleted in <1 second
- Uses database index on fetchedAt column
- No blocking of other operations (PostgreSQL handles it)

### Database Bloat Management

**PostgreSQL VACUUM:**
- Deleted records leave "dead tuples" (disk space not immediately reclaimed)
- Neon runs auto-vacuum regularly
- For manual vacuum: Connect via psql and run `VACUUM FULL market_orders;`
- Not required for MVP (Neon handles it)

## Dev Notes

### Prerequisites

- Story 2.1 completed (database schema with fetchedAt column)
- Story 2.3 completed (market data being populated)
- Some old data exists to test deletion

### No Additional Dependencies

- Uses existing Prisma client
- No new packages required

### Common Issues and Solutions

**Issue: Cleanup deletes too much data**
- Solution: Verify RETENTION_DAYS is set to 7, not 1
- Test with `WHERE fetchedAt < (NOW() - INTERVAL '7 days')` query first

**Issue: Database size not decreasing after cleanup**
- Solution: PostgreSQL needs VACUUM to reclaim space
- Neon runs auto-vacuum, wait 1-2 hours
- Or trigger manually: `await db.$executeRaw\`VACUUM market_orders;\``

**Issue: Cleanup takes too long (timeout)**
- Solution: Add batching (delete 10,000 records at a time in loop)
- Unlikely with current scale (7 days = ~300K records, deletes in <5 seconds)

**Issue: "Column fetchedAt does not exist"**
- Solution: Run Prisma migration: `pnpm prisma migrate dev`
- Ensure database schema is up to date

### Testing with Fake Old Data

**Insert old data for testing:**

```sql
-- Insert 1000 fake old orders
INSERT INTO market_orders (order_id, region_id, type_id, price, volume_remain, location_id, is_buy_order, issued, fetched_at)
SELECT 
  order_id + 10000000,
  region_id,
  type_id,
  price,
  volume_remain,
  location_id,
  is_buy_order,
  issued,
  NOW() - INTERVAL '10 days' as fetched_at
FROM market_orders
LIMIT 1000;
```

**Then run cleanup to verify deletion.**

### Monitoring Database Growth

**Set up weekly check:**

```bash
# Add to crontab or run manually
0 0 * * 0 pnpm tsx scripts/check-db-size.ts >> db-size.log
```

**Alert thresholds:**
- < 100MB: Healthy
- 100-300MB: Normal growth
- 300-450MB: Warning (review retention policy)
- > 450MB: Critical (immediate cleanup needed)

### Performance Expectations

**Typical Cleanup:**
- Records to delete: ~300,000 (7 days old)
- Deletion time: <5 seconds
- Database locks: Minimal (non-blocking operation)
- Frequency: Daily

### Next Steps

After this story is complete:
1. **Epic 3:** Begin building frontend UI (region selectors)
2. **Story 6.2:** Add health check to monitor database size
3. Consider adding alerts if database exceeds 400MB

### References

**Source Documents:**
- [Architecture: Database Size Optimization](../planning-artifacts/architecture.md#data-architecture)
- [Architecture: Storage Optimization](../planning-artifacts/architecture.md#storage-optimization)
- [PRD: Technical Success - Cost Target](../planning-artifacts/prd.md#cost-target)
- [Epic 2: Market Data Collection Pipeline](../planning-artifacts/epics.md#epic-2-market-data-collection-pipeline)

**External Documentation:**
- Prisma deleteMany: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#deletemany
- PostgreSQL VACUUM: https://www.postgresql.org/docs/current/sql-vacuum.html
- Neon Storage: https://neon.tech/docs/introduction/technical-preview-free-tier

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
