# Story 6.2: Create Health Check Endpoint for System Status Monitoring

Status: ready-for-dev

## Story

As a DevOps engineer monitoring the production system,
I want a `/api/health` endpoint that reports system health metrics,
So that I can detect issues proactively and set up automated monitoring/alerts.

## Acceptance Criteria

**Given** the app is deployed to Vercel
**When** I call GET `/api/health`
**Then** the endpoint returns JSON with status "healthy" or "degraded"
**And** the response includes database connectivity status (boolean)
**And** the response includes data freshness status and timestamp of last successful fetch
**And** the response includes system uptime in seconds
**And** the response time is <500ms
**And** the endpoint is publicly accessible (no authentication required)
**And** if database is unreachable, status = "degraded" but returns 200 OK (not 500)
**And** if data is stale (>120 minutes), status = "degraded" but returns 200 OK

## Technical Requirements

### Health Check Types

**File:** `types/health.ts`

```typescript
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded';
  timestamp: string; // ISO 8601
  uptime: number; // seconds since process start
  checks: {
    database: DatabaseCheck;
    dataFreshness: DataFreshnessCheck;
  };
}

export interface DatabaseCheck {
  status: 'healthy' | 'unhealthy';
  responseTime: number; // milliseconds
  error?: string;
}

export interface DataFreshnessCheck {
  status: 'fresh' | 'stale' | 'very-stale' | 'unknown';
  lastFetchedAt: string | null; // ISO 8601
  ageMinutes: number | null;
  error?: string;
}
```

### Health Check Logic

**File:** `lib/health/checks.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { DatabaseCheck, DataFreshnessCheck } from '@/types/health';

/**
 * Check database connectivity by executing a simple query
 */
export async function checkDatabase(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    logger.debug({ responseTime }, 'Database health check passed');

    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ err: error, responseTime }, 'Database health check failed');

    return {
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check data freshness by looking at most recent Region.lastFetchedAt
 */
export async function checkDataFreshness(): Promise<DataFreshnessCheck> {
  try {
    // Get most recent fetch timestamp
    const mostRecentRegion = await prisma.region.findFirst({
      where: {
        lastFetchedAt: { not: null },
      },
      orderBy: {
        lastFetchedAt: 'desc',
      },
      select: {
        lastFetchedAt: true,
      },
    });

    if (!mostRecentRegion || !mostRecentRegion.lastFetchedAt) {
      logger.warn('No fetch timestamps found in database');

      return {
        status: 'unknown',
        lastFetchedAt: null,
        ageMinutes: null,
      };
    }

    const lastFetchedAt = mostRecentRegion.lastFetchedAt;
    const now = new Date();
    const ageMinutes = Math.floor(
      (now.getTime() - lastFetchedAt.getTime()) / (1000 * 60)
    );

    // Determine status based on age
    let status: 'fresh' | 'stale' | 'very-stale';
    if (ageMinutes < 45) {
      status = 'fresh';
    } else if (ageMinutes < 120) {
      status = 'stale';
    } else {
      status = 'very-stale';
    }

    logger.debug({
      lastFetchedAt: lastFetchedAt.toISOString(),
      ageMinutes,
      status,
    }, 'Data freshness check completed');

    return {
      status,
      lastFetchedAt: lastFetchedAt.toISOString(),
      ageMinutes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ err: error }, 'Data freshness check failed');

    return {
      status: 'unknown',
      lastFetchedAt: null,
      ageMinutes: null,
      error: errorMessage,
    };
  }
}

/**
 * Get system uptime in seconds
 */
export function getUptime(): number {
  return process.uptime();
}
```

### Health Check API Route

**File:** `app/api/health/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkDatabase, checkDataFreshness, getUptime } from '@/lib/health/checks';
import { logger } from '@/lib/logger';
import type { HealthCheckResponse } from '@/types/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  logger.debug('Health check requested');

  try {
    // Run all checks in parallel
    const [databaseCheck, dataFreshnessCheck] = await Promise.all([
      checkDatabase(),
      checkDataFreshness(),
    ]);

    const uptime = getUptime();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' = 'healthy';

    if (
      databaseCheck.status === 'unhealthy' ||
      dataFreshnessCheck.status === 'very-stale' ||
      dataFreshnessCheck.status === 'unknown'
    ) {
      overallStatus = 'degraded';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      checks: {
        database: databaseCheck,
        dataFreshness: dataFreshnessCheck,
      },
    };

    const duration = Date.now() - startTime;

    logger.info({
      status: overallStatus,
      duration,
      databaseStatus: databaseCheck.status,
      dataFreshnessStatus: dataFreshnessCheck.status,
    }, `Health check completed: ${overallStatus} (${duration}ms)`);

    // Always return 200 OK (even when degraded)
    // Monitoring tools check response body for status
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ err: error, duration }, 'Health check failed');

    // Return degraded status (still 200 OK)
    const response: HealthCheckResponse = {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(getUptime()),
      checks: {
        database: {
          status: 'unhealthy',
          responseTime: 0,
          error: errorMessage,
        },
        dataFreshness: {
          status: 'unknown',
          lastFetchedAt: null,
          ageMinutes: null,
          error: errorMessage,
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
```

### Verification Steps

1. **Test healthy status:**
   ```bash
   # After successful data fetch
   curl http://localhost:3000/api/health
   
   # Expected response:
   {
     "status": "healthy",
     "timestamp": "2024-01-15T12:34:56.789Z",
     "uptime": 3600,
     "checks": {
       "database": {
         "status": "healthy",
         "responseTime": 12
       },
       "dataFreshness": {
         "status": "fresh",
         "lastFetchedAt": "2024-01-15T12:30:00.000Z",
         "ageMinutes": 4
       }
     }
   }
   ```

2. **Test degraded status (stale data):**
   ```bash
   # Wait 2+ hours after last fetch (or manually set old timestamp)
   curl http://localhost:3000/api/health
   
   # Expected response:
   {
     "status": "degraded",
     "checks": {
       "dataFreshness": {
         "status": "very-stale",
         "ageMinutes": 150
       }
     }
   }
   ```

3. **Test database connectivity:**
   ```bash
   # Stop PostgreSQL
   docker-compose stop postgres
   
   curl http://localhost:3000/api/health
   
   # Expected response:
   {
     "status": "degraded",
     "checks": {
       "database": {
         "status": "unhealthy",
         "error": "Connection refused"
       }
     }
   }
   
   # Restart PostgreSQL
   docker-compose start postgres
   ```

4. **Test response time:**
   ```bash
   # Should complete in <500ms
   time curl http://localhost:3000/api/health
   
   # Check response time in logs
   ```

5. **Test caching headers:**
   ```bash
   curl -v http://localhost:3000/api/health
   
   # Verify headers include:
   # Cache-Control: no-store, no-cache, must-revalidate
   ```

6. **Test uptime:**
   ```bash
   # Start server
   pnpm dev
   
   # Immediately check health
   curl http://localhost:3000/api/health | jq '.uptime'
   # Should be small number (e.g., 5)
   
   # Wait 60 seconds, check again
   sleep 60
   curl http://localhost:3000/api/health | jq '.uptime'
   # Should be ~65
   ```

## Architecture Context

### Why Always Return 200 OK

**Health Check Pattern:**
- HTTP status = transport layer health
- Response body = application health
- 200 OK = Server is running and responding

**Why not 503 Service Unavailable:**
- Load balancers remove unhealthy instances based on HTTP status
- We want to report degraded state, not remove instance
- 503 triggers circuit breakers (too aggressive)

**Monitoring tools:**
- Check response body: `status: "degraded"`
- Alert on degraded state
- Keep instance in rotation (self-healing possible)

### Health vs Degraded vs Down

**Definitions:**
- **healthy:** All systems operational
- **degraded:** Partial functionality (some features may not work)
- **down:** Cannot respond (no response at all)

**Our Implementation:**
- Database unreachable → degraded (read-only possible from cache)
- Data stale → degraded (old data still useful)
- Server crashed → down (no health check response)

### Cache-Control Headers

**Why no caching:**
- Health status changes frequently
- Stale health checks → false positives/negatives
- Monitoring tools expect fresh data

**Headers:**
```
Cache-Control: no-store, no-cache, must-revalidate
```

### Uptime Metric

**process.uptime():**
- Seconds since Node.js process started
- Resets on deployment (Vercel redeploys)
- Not same as "time since last deploy"

**Use cases:**
- Detect recent restarts (uptime < 60s)
- Correlate errors with deployments
- Not useful for overall availability (use external monitoring)

### Parallel Health Checks

**Promise.all pattern:**
```typescript
const [db, data] = await Promise.all([
  checkDatabase(),
  checkDataFreshness(),
]);
```

**Benefits:**
- Faster (checks run concurrently)
- Total time = slowest check (not sum)
- Target: <500ms total

### Data Freshness Thresholds

**Rationale:**
- Fresh (<45min): Normal operation (job every 30min)
- Stale (45-120min): Missed 1-3 jobs (warning)
- Very stale (>120min): Missed 4+ jobs (critical)

**Thresholds match UX:**
- Story 4.4 uses same thresholds for footer display
- Consistent user experience

## Dev Notes

### Prerequisites

- Prisma client configured (Story 2.1)
- Logger configured (Story 6.1)

### No Additional Dependencies

- Uses Prisma for database check
- Uses native Date for timestamps

### Common Issues and Solutions

**Issue: Database check times out**
- Solution: Set query timeout in Prisma
```typescript
await prisma.$queryRaw`SELECT 1`.timeout(5000); // 5 seconds
```

**Issue: Health check slow (>500ms)**
- Solution: Check database connection pool
- Ensure indexes on Region.lastFetchedAt
- Use `prisma.$connect()` to pre-warm pool

**Issue: Uptime resets frequently**
- Solution: Normal on Vercel (serverless)
- Each cold start = new uptime
- Don't rely on uptime for availability metrics

**Issue: No lastFetchedAt timestamps**
- Solution: Run initial fetch job
```bash
curl -X GET http://localhost:3000/api/cron/fetch-markets \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Issue: Always returns "unknown" status**
- Solution: Check database seeded with regions
- Run: `pnpm prisma db seed`

### Monitoring Setup

**Vercel Monitoring:**
- Deployment monitoring (built-in)
- Function logs (built-in)
- No built-in health check monitoring

**External Monitoring (Recommended):**

**1. UptimeRobot (Free):**
```
- Add HTTP(s) monitor
- URL: https://your-app.vercel.app/api/health
- Keyword: "healthy"
- Frequency: 5 minutes
- Alert contacts: email/SMS
```

**2. Datadog Synthetic Monitoring:**
```javascript
// Datadog API test
{
  "assertions": [
    {
      "type": "statusCode",
      "operator": "is",
      "target": 200
    },
    {
      "type": "body",
      "operator": "contains",
      "target": "\"status\":\"healthy\""
    },
    {
      "type": "responseTime",
      "operator": "lessThan",
      "target": 500
    }
  ]
}
```

**3. GitHub Actions (Self-Hosted):**
Create `.github/workflows/health-check.yml`:
```yaml
name: Health Check
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Check health endpoint
        run: |
          response=$(curl -s https://your-app.vercel.app/api/health)
          status=$(echo $response | jq -r '.status')
          if [ "$status" != "healthy" ]; then
            echo "Health check failed: $response"
            exit 1
          fi
```

### Testing Tips

**Simulate database failure:**
```typescript
// lib/health/checks.ts (temporary for testing)
export async function checkDatabase(): Promise<DatabaseCheck> {
  throw new Error('Simulated database failure');
}
```

**Simulate stale data:**
```sql
-- Set all lastFetchedAt to 3 hours ago
UPDATE regions
SET "lastFetchedAt" = NOW() - INTERVAL '3 hours';
```

**Load testing:**
```bash
# 100 requests in parallel
seq 100 | xargs -P100 -I{} curl -s http://localhost:3000/api/health > /dev/null
```

### Performance Expectations

**Target: <500ms**
- Database check: <50ms
- Data freshness check: <100ms
- Overhead: <50ms
- Total: ~200ms typical

**Optimization:**
- Index on Region.lastFetchedAt DESC
- Connection pooling (Prisma default)
- Minimal query complexity

### Next Steps

After this story is complete:
1. **Story 6.3:** Add manual job trigger endpoint
2. **Story 6.4:** Build stale data warning UI banner
3. **Story 6.5:** Create error handling and user-friendly error messages

### References

**Source Documents:**
- [Architecture: Health Checks](../planning-artifacts/architecture.md#monitoring)
- [Epic 6: System Operations & Monitoring](../planning-artifacts/epics.md#epic-6-system-operations--monitoring)

**External Documentation:**
- Health Check Pattern: https://microservices.io/patterns/observability/health-check-api.html
- HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- Vercel Monitoring: https://vercel.com/docs/concepts/analytics

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
