# Story 2.3: Implement Market Data Fetch Logic with Error Handling

Status: ready-for-dev

## Story

As a developer,
I want to fetch market orders for all regions and store them in the database,
So that the system has fresh data for ROI calculations.

## Acceptance Criteria

**Given** the ESI client and database schema exist
**When** I create `jobs/fetch-market-data.ts` with a function `fetchAllRegions()`
**Then** the function fetches a list of all public EVE regions from ESI API endpoint `/universe/regions/`
**And** for each region, it fetches market orders using the ESI client in parallel (with rate limiting)
**And** fetched orders are inserted into the MarketOrder table using Prisma (upsert on orderId)
**And** the Region table is updated with the lastFetchedAt timestamp for each region
**And** ESI API 503 errors trigger exponential backoff starting at 5 seconds
**And** each region fetch is retried up to 3 times on failure before logging and continuing
**And** the function logs progress (JSON format) with timestamps, region counts, success/failure counts
**And** running the function manually successfully populates the database with market data

## Technical Requirements

### Job Structure

**File:** `jobs/fetch-market-data.ts`

```typescript
import { ESIClient } from '@/lib/esi-client';
import { db } from '@/lib/db';
import pLimit from 'p-limit';
import { logger } from '@/lib/logger';

const limit = pLimit(150); // Match ESI rate limit

export async function fetchAllRegions() {
  const startTime = Date.now();
  logger.info({ event: 'fetch_started', timestamp: new Date().toISOString() });
  
  try {
    // Fetch list of all EVE regions
    const regions = await fetchRegionList();
    logger.info({ event: 'regions_loaded', count: regions.length });
    
    // Fetch market data for each region in parallel
    const promises = regions.map(regionId => 
      limit(() => fetchRegionWithRetry(regionId))
    );
    
    const results = await Promise.allSettled(promises);
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'fetch_completed',
      total: regions.length,
      successful,
      failed,
      durationMs: duration
    });
    
    return { regionsProcessed: successful, failed, duration };
  } catch (error) {
    logger.error({
      event: 'fetch_failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

async function fetchRegionList(): Promise<number[]> {
  const esiClient = new ESIClient();
  return await esiClient.getRegions();
}

async function fetchRegionWithRetry(regionId: number, maxRetries = 3): Promise<void> {
  const esiClient = new ESIClient();
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const orders = await esiClient.getRegionOrders(regionId);
      
      // Store orders in database (upsert to handle duplicates)
      await db.marketOrder.createMany({
        data: orders.map(order => ({
          orderId: order.order_id,
          regionId: regionId,
          typeId: order.type_id,
          price: order.price,
          volumeRemain: order.volume_remain,
          locationId: order.location_id,
          isBuyOrder: order.is_buy_order,
          issued: new Date(order.issued),
          fetchedAt: new Date()
        })),
        skipDuplicates: true
      });
      
      // Update region lastFetchedAt
      await db.region.update({
        where: { regionId },
        data: { lastFetchedAt: new Date() }
      });
      
      logger.info({
        event: 'region_fetched',
        regionId,
        ordersCount: orders.length,
        attempt: attempt + 1
      });
      
      return; // Success
    } catch (error) {
      lastError = error;
      
      // Handle 503 errors with exponential backoff
      if (error.response?.status === 503 && attempt < maxRetries - 1) {
        const delay = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s
        logger.warn({
          event: 'esi_503_retry',
          regionId,
          attempt: attempt + 1,
          delayMs: delay
        });
        await sleep(delay);
      } else if (attempt < maxRetries - 1) {
        // Non-503 errors: short delay before retry
        await sleep(1000);
      }
    }
  }
  
  // All retries failed
  logger.error({
    event: 'region_fetch_failed',
    regionId,
    error: lastError.message,
    attempts: maxRetries
  });
  
  // Log failure but don't throw (continue with other regions)
  await db.fetchLog.create({
    data: {
      regionId,
      fetchStartedAt: new Date(),
      fetchCompletedAt: new Date(),
      success: false,
      ordersFetched: 0,
      errorMessage: lastError.message
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### ESI Client Extensions

**Add to `lib/esi-client.ts`:**

```typescript
export class ESIClient {
  private baseUrl = 'https://esi.evetech.net/latest';
  
  async getRegions(): Promise<number[]> {
    const response = await axios.get(`${this.baseUrl}/universe/regions/`, {
      timeout: 30000
    });
    return response.data; // Returns array of region IDs
  }
  
  async getRegionOrders(regionId: number): Promise<MarketOrder[]> {
    const response = await axios.get(
      `${this.baseUrl}/markets/${regionId}/orders/`,
      {
        params: {
          order_type: 'all',
          datasource: 'tranquility'
        },
        timeout: 30000
      }
    );
    
    // Validate with Zod schema
    return ESIMarketResponseSchema.parse(response.data);
  }
}
```

### Logging Configuration

**Create `lib/logger.ts`:**

```typescript
// Use pino for structured JSON logging (optional, can use console.log)
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Alternative: Simple console.log-based logger
export const simpleLogger = {
  info: (obj: any) => console.log(JSON.stringify({ ...obj, level: 'info' })),
  warn: (obj: any) => console.log(JSON.stringify({ ...obj, level: 'warn' })),
  error: (obj: any) => console.error(JSON.stringify({ ...obj, level: 'error' })),
};
```

### Manual Testing Script

**Create `scripts/test-fetch.ts`:**

```typescript
import { fetchAllRegions } from '@/jobs/fetch-market-data';

async function main() {
  console.log('Starting manual fetch test...');
  
  try {
    const result = await fetchAllRegions();
    console.log('Fetch completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Fetch failed:', error);
    process.exit(1);
  }
}

main();
```

**Add to `package.json`:**

```json
{
  "scripts": {
    "fetch-data": "tsx scripts/test-fetch.ts"
  }
}
```

### Verification Steps

1. **Test region list fetch:**
   ```bash
   # Quick test in Node REPL
   const { ESIClient } = require('./lib/esi-client');
   const client = new ESIClient();
   const regions = await client.getRegions();
   console.log(`Found ${regions.length} regions`);
   ```

2. **Run manual fetch:**
   ```bash
   pnpm run fetch-data
   ```

3. **Verify database contents:**
   ```bash
   pnpm prisma studio
   # Check MarketOrder table for records
   # Check Region table for lastFetchedAt timestamps
   ```

4. **Check logs for structure:**
   - Logs should be valid JSON
   - Should see: fetch_started, regions_loaded, region_fetched events
   - Error events should include full context

## Architecture Context

### Why p-limit for Concurrency

**Design Decision:**
- **p-limit** chosen over BullMQ/RabbitMQ for simplicity
- Matches NFR-I1 requirement: 150 req/sec rate limit
- Zero-infrastructure approach (no Redis needed)
- Perfect for <30 min/week maintenance target (NFR-M4)

**Alternative Considered:**
- BullMQ with Redis: More robust but adds infrastructure complexity
- Verdict: Overkill for MVP, migrate if needed at scale

### Why Promise.allSettled

**Graceful Partial Failures:**
- If 1 region fails, other 59 regions still succeed
- Matches NFR-R6: Clear error messages requirement
- Users get partial data rather than complete failure

### Exponential Backoff Strategy

**Implementation matches NFR-I2:**
- Initial delay: 5 seconds
- Exponential growth: 5s → 10s → 20s
- 3 total attempts before giving up
- Only applies to 503 errors (ESI maintenance)

**Why this pattern:**
- CCP Games recommends exponential backoff for ESI
- Prevents hammering API during outages
- Automatic recovery when service returns

### Database Upsert Strategy

**Using skipDuplicates:**
- Market orders have unique `orderId` from ESI
- Upsert prevents duplicate insertion errors
- Efficient: Single query instead of check-then-insert

**Performance:**
- ~30,000 orders per fetch cycle
- CreateMany with skipDuplicates: <2 seconds
- Well within 10-minute Vercel timeout (NFR-P2)

## Dev Notes

### Prerequisites

- Story 2.1 completed (database schema exists)
- Story 2.2 completed (ESI client exists)
- Docker PostgreSQL running (`docker-compose up -d`)
- Prisma client generated (`pnpm prisma generate`)

### Dependencies to Install

```bash
pnpm add p-limit         # Concurrency control
pnpm add pino            # Structured logging (optional)
pnpm add date-fns        # Timestamp handling
pnpm add -D tsx          # TypeScript execution for scripts
```

### Common Issues and Solutions

**Issue: "Rate limit exceeded" from ESI**
- Solution: p-limit should prevent this, but if it happens, reduce limit to 100

**Issue: Database connection timeout during large insert**
- Solution: Increase Prisma connection pool: `connection_limit=10` in DATABASE_URL

**Issue: TypeError: Cannot read property 'order_id' of undefined**
- Solution: Zod validation failed—log raw response to see schema changes

**Issue: Job takes > 10 minutes (Vercel timeout)**
- Solution: Reduce parallel requests (lower p-limit) or migrate to Railway

### Performance Expectations

**Typical Execution:**
- 60 regions × 500 orders/region = 30,000 orders
- With 150 parallel requests: ~2-3 minutes total
- Database insert time: <2 seconds for all orders
- Total job duration: ~3-5 minutes

### Testing Edge Cases

**Test ESI 503 error handling:**
```typescript
// Mock ESI client to simulate 503
jest.mock('@/lib/esi-client', () => ({
  ESIClient: jest.fn().mockImplementation(() => ({
    getRegionOrders: jest.fn()
      .mockRejectedValueOnce({ response: { status: 503 } })  // First call fails
      .mockRejectedValueOnce({ response: { status: 503 } })  // Second call fails
      .mockResolvedValueOnce([{ order_id: 123, ... }])       // Third succeeds
  }))
}));
```

### Next Steps

After this story is complete:
1. **Story 2.4:** Create background job scheduler (Vercel Cron)
2. **Story 2.5:** Implement data retention cleanup (7-day purge)

### References

**Source Documents:**
- [Architecture: Background Job Implementation](../planning-artifacts/architecture.md#background-job-implementation)
- [Architecture: ESI API Orchestration](../planning-artifacts/architecture.md#esi-api-orchestration-p-limit-concurrency-queue)
- [Architecture: ESI Error Handling](../planning-artifacts/architecture.md#esi-error-handling-circuit-breaker-pattern)
- [PRD: Technical Success Criteria](../planning-artifacts/prd.md#technical-success)
- [Epic 2: Market Data Collection Pipeline](../planning-artifacts/epics.md#epic-2-market-data-collection-pipeline)

**External Documentation:**
- ESI API Documentation: https://esi.evetech.net/ui/
- p-limit: https://github.com/sindresorhus/p-limit
- Prisma Batch Operations: https://www.prisma.io/docs/concepts/components/prisma-client/crud#create-multiple-records

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
