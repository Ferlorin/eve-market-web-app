# Story 6.1: Implement Structured JSON Logging with Pino

Status: ready-for-dev

## Story

As a developer troubleshooting production issues,
I want all application logs in structured JSON format with contextual metadata,
So that I can easily search, filter, and analyze logs using log aggregation tools.

## Acceptance Criteria

**Given** the app has various logging points (jobs, API routes, errors)
**When** I implement Pino structured logging library
**Then** all logs are output as JSON objects to stdout with timestamp, level, message, and context
**And** log levels follow standard hierarchy: trace (10), debug (20), info (30), warn (40), error (50), fatal (60)
**And** each log entry includes structured metadata: `requestId`, `userId`, `duration`, `statusCode`, `regionId`, etc.
**And** background jobs log start/end with metadata: `jobName`, `duration`, `successCount`, `errorCount`
**And** API routes log requests with metadata: `method`, `path`, `statusCode`, `duration`
**And** errors log full stack traces with metadata: `errorType`, `errorMessage`, `stack`
**And** development environment uses pretty-printed logs (human-readable)
**And** production environment uses JSON logs (machine-readable)

## Technical Requirements

### Install Pino and Pretty Printer

```bash
pnpm add pino pino-pretty
pnpm add -D @types/pino
```

### Logger Configuration

**File:** `lib/logger.ts`

```typescript
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Pretty print in development, JSON in production
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Base fields for all logs
  base: {
    env: process.env.NODE_ENV,
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Helper to create child loggers with context
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Common log patterns
export const logPatterns = {
  // API route logging
  apiRequest: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ) => {
    logger.info({
      type: 'api_request',
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    }, `${method} ${path} ${statusCode} - ${duration}ms`);
  },

  // Background job logging
  jobStart: (jobName: string, metadata?: Record<string, any>) => {
    logger.info({
      type: 'job_start',
      jobName,
      ...metadata,
    }, `Job started: ${jobName}`);
  },

  jobComplete: (
    jobName: string,
    duration: number,
    successCount: number,
    errorCount: number,
    metadata?: Record<string, any>
  ) => {
    logger.info({
      type: 'job_complete',
      jobName,
      duration,
      successCount,
      errorCount,
      ...metadata,
    }, `Job completed: ${jobName} - ${successCount} success, ${errorCount} errors (${duration}ms)`);
  },

  jobError: (jobName: string, error: Error, metadata?: Record<string, any>) => {
    logger.error({
      type: 'job_error',
      jobName,
      err: error,
      ...metadata,
    }, `Job failed: ${jobName} - ${error.message}`);
  },

  // Database operation logging
  dbQuery: (query: string, duration: number, metadata?: Record<string, any>) => {
    logger.debug({
      type: 'db_query',
      query,
      duration,
      ...metadata,
    }, `DB Query - ${duration}ms`);
  },

  // External API logging
  externalApi: (
    service: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ) => {
    logger.info({
      type: 'external_api',
      service,
      endpoint,
      statusCode,
      duration,
      ...metadata,
    }, `External API: ${service} ${endpoint} ${statusCode} - ${duration}ms`);
  },

  // Error logging
  error: (
    errorType: string,
    errorMessage: string,
    error: Error,
    metadata?: Record<string, any>
  ) => {
    logger.error({
      type: 'error',
      errorType,
      errorMessage,
      err: error,
      ...metadata,
    }, `Error: ${errorType} - ${errorMessage}`);
  },
};
```

### API Route Logging Middleware

**File:** `lib/middleware/logger-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger, logPatterns } from '@/lib/logger';
import { nanoid } from 'nanoid';

export async function withLogging(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = nanoid();

  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
  });

  try {
    // Log request start
    reqLogger.debug('Request received');

    // Execute handler
    const response = await handler(req);
    const duration = Date.now() - startTime;

    // Log request completion
    logPatterns.apiRequest(
      req.method,
      req.nextUrl.pathname,
      response.status,
      duration,
      { requestId }
    );

    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    logPatterns.error(
      'api_error',
      error instanceof Error ? error.message : 'Unknown error',
      error as Error,
      {
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        duration,
      }
    );

    // Re-throw to be handled by error boundary
    throw error;
  }
}
```

### Update Fetch Market Data Job with Logging

**Update `jobs/fetch-market-data.ts`:**

```typescript
import { logger, logPatterns } from '@/lib/logger';
import { esiClient } from '@/lib/external/esi-client';
import { prisma } from '@/lib/prisma';
import pLimit from 'p-limit';

export async function fetchAllRegions() {
  const jobName = 'fetch-market-data';
  const startTime = Date.now();

  logPatterns.jobStart(jobName);

  try {
    // Fetch all regions
    const regions = await prisma.region.findMany({
      select: { regionId: true, name: true },
    });

    logger.info({ regionCount: regions.length }, `Fetching market data for ${regions.length} regions`);

    // Concurrency control
    const limit = pLimit(5); // 5 concurrent regions
    let successCount = 0;
    let errorCount = 0;

    const results = await Promise.allSettled(
      regions.map((region) =>
        limit(async () => {
          const regionStart = Date.now();
          
          try {
            const orders = await fetchRegionWithRetry(region.regionId, region.name);
            
            // Store orders
            await prisma.marketOrder.createMany({
              data: orders,
              skipDuplicates: true,
            });

            // Update region last fetched timestamp
            await prisma.region.update({
              where: { regionId: region.regionId },
              data: { lastFetchedAt: new Date() },
            });

            const regionDuration = Date.now() - regionStart;
            successCount++;

            logger.info({
              regionId: region.regionId,
              regionName: region.name,
              orderCount: orders.length,
              duration: regionDuration,
            }, `Region fetched successfully: ${region.name} (${orders.length} orders)`);

            return { success: true, regionId: region.regionId, count: orders.length };
          } catch (error) {
            const regionDuration = Date.now() - regionStart;
            errorCount++;

            logger.error({
              regionId: region.regionId,
              regionName: region.name,
              duration: regionDuration,
              err: error,
            }, `Region fetch failed: ${region.name}`);

            return { success: false, regionId: region.regionId, error };
          }
        })
      )
    );

    const duration = Date.now() - startTime;
    const totalOrders = results
      .filter((r) => r.status === 'fulfilled' && r.value.success)
      .reduce((sum, r: any) => sum + r.value.count, 0);

    logPatterns.jobComplete(jobName, duration, successCount, errorCount, {
      regionCount: regions.length,
      totalOrders,
    });

    return {
      success: true,
      successCount,
      errorCount,
      totalOrders,
      duration,
    };
  } catch (error) {
    logPatterns.jobError(jobName, error as Error);
    throw error;
  }
}

async function fetchRegionWithRetry(
  regionId: number,
  regionName: string,
  maxRetries = 3
): Promise<any[]> {
  const regionLogger = logger.child({ regionId, regionName });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const orders = await esiClient.getMarketOrders(regionId);
      const duration = Date.now() - startTime;

      logPatterns.externalApi('ESI', `/markets/${regionId}/orders`, 200, duration, {
        regionId,
        regionName,
        orderCount: orders.length,
        attempt,
      });

      return orders;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      regionLogger.warn({
        attempt,
        maxRetries,
        err: error,
      }, `Fetch attempt ${attempt} failed for ${regionName}`);

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff
      const backoffMs = Math.pow(2, attempt) * 5000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(`Failed to fetch ${regionName} after ${maxRetries} attempts`);
}
```

### Update API Route with Logging

**Update `app/api/opportunities/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/middleware/logger-middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  buyRegionId: z.string().regex(/^\d+$/).transform(Number),
  sellRegionId: z.string().regex(/^\d+$/).transform(Number),
});

async function handler(req: NextRequest) {
  const startTime = Date.now();

  // Parse and validate query params
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const validation = querySchema.safeParse(searchParams);

  if (!validation.success) {
    logger.warn({
      errors: validation.error.errors,
      searchParams,
    }, 'Invalid query parameters');

    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.errors },
      { status: 400 }
    );
  }

  const { buyRegionId, sellRegionId } = validation.data;

  logger.info({ buyRegionId, sellRegionId }, 'Fetching opportunities');

  try {
    // Fetch market orders
    const queryStart = Date.now();
    const [buyOrders, sellOrders] = await Promise.all([
      prisma.marketOrder.findMany({
        where: { regionId: buyRegionId, isBuyOrder: false },
        select: { typeId: true, price: true, volumeRemain: true },
      }),
      prisma.marketOrder.findMany({
        where: { regionId: sellRegionId, isBuyOrder: true },
        select: { typeId: true, price: true, volumeRemain: true },
      }),
    ]);
    const queryDuration = Date.now() - queryStart;

    logger.debug({
      buyOrderCount: buyOrders.length,
      sellOrderCount: sellOrders.length,
      duration: queryDuration,
    }, 'Market orders fetched');

    // Calculate opportunities
    const calcStart = Date.now();
    const opportunities = calculateOpportunities(buyOrders, sellOrders);
    const calcDuration = Date.now() - calcStart;

    const totalDuration = Date.now() - startTime;

    logger.info({
      buyRegionId,
      sellRegionId,
      opportunityCount: opportunities.length,
      queryDuration,
      calcDuration,
      totalDuration,
    }, `Found ${opportunities.length} opportunities in ${totalDuration}ms`);

    return NextResponse.json(opportunities);
  } catch (error) {
    logger.error({
      buyRegionId,
      sellRegionId,
      err: error,
    }, 'Failed to fetch opportunities');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = (req: NextRequest) => withLogging(req, handler);
```

### Verification Steps

1. **Test development logs (pretty):**
   ```bash
   pnpm dev
   # Logs should be colorized and human-readable
   # Example: [12:34:56] INFO: Job started: fetch-market-data
   ```

2. **Test production logs (JSON):**
   ```bash
   NODE_ENV=production pnpm start
   # Logs should be JSON objects
   # Example: {"level":30,"time":"2024-01-15T12:34:56.789Z","msg":"Job started: fetch-market-data","jobName":"fetch-market-data"}
   ```

3. **Test log levels:**
   ```bash
   LOG_LEVEL=debug pnpm dev
   # Should see debug logs (DB queries, request start)
   
   LOG_LEVEL=warn pnpm dev
   # Should only see warnings and errors
   ```

4. **Test structured metadata:**
   ```bash
   # Trigger fetch job
   curl http://localhost:3000/api/cron/fetch-markets
   
   # Check logs contain:
   # - jobName
   # - duration
   # - successCount/errorCount
   # - regionId/regionName
   ```

5. **Test error logging:**
   ```bash
   # Trigger error (invalid region)
   curl 'http://localhost:3000/api/opportunities?buyRegionId=999999&sellRegionId=10000002'
   
   # Check logs contain:
   # - errorType
   # - errorMessage
   # - stack trace
   ```

6. **Test request IDs:**
   ```bash
   curl -v http://localhost:3000/api/opportunities?buyRegionId=10000002&sellRegionId=10000043
   
   # Response headers should include:
   # X-Request-ID: <unique-id>
   ```

## Architecture Context

### Why Pino

**Performance:**
- Fastest Node.js logger (2x faster than Winston)
- Minimal overhead in production
- Asynchronous by default

**Structured Logging:**
- Native JSON output
- Standardized log format
- Easy to parse by log aggregators (Datadog, Splunk)

**Developer Experience:**
- Pretty printer for development
- Child loggers for context
- Standard serializers (errors, HTTP)

### Why Structured JSON Logs

**Benefits over plain text:**
```
Plain text:
"User 123 fetched opportunities for regions 10000002 and 10000043 in 245ms"

JSON:
{
  "userId": 123,
  "buyRegionId": 10000002,
  "sellRegionId": 10000043,
  "duration": 245,
  "opportunityCount": 42
}
```

**Queryability:**
- Filter: `duration > 1000` (slow requests)
- Group by: `regionId` (popular regions)
- Aggregate: `avg(duration)` (performance trends)

### Log Levels

**Standard hierarchy:**
- **Trace (10):** Very detailed, rarely used
- **Debug (20):** Developer troubleshooting (DB queries, internal state)
- **Info (30):** Important events (job start/complete, API requests)
- **Warn (40):** Recoverable issues (retries, fallbacks)
- **Error (50):** Failures requiring attention
- **Fatal (60):** Application crash

**Production default: info (30)**
- Logs important events without noise
- Debug only enabled when troubleshooting

### Request ID Pattern

**Why unique request IDs:**
- Trace single request across multiple logs
- Correlate frontend errors with backend logs
- Debug distributed systems

**Implementation:**
- Generate on API entry (nanoid)
- Pass to child loggers
- Return in response header

### Context Loggers

**Pattern:**
```typescript
const logger = parentLogger.child({ regionId: 123 });
logger.info('Fetching data'); // Automatically includes regionId
```

**Benefits:**
- DRY: Don't repeat context in every log
- Consistency: All logs in scope have same metadata
- Clarity: Easy to filter logs by context

## Dev Notes

### Prerequisites

None - fresh dependency

### Install Dependencies

```bash
pnpm add pino pino-pretty nanoid
pnpm add -D @types/pino
```

### Common Issues and Solutions

**Issue: Pretty print not working**
- Solution: Check `NODE_ENV=development`
- Verify pino-pretty installed
- Try: `pnpm add pino-pretty`

**Issue: Too many debug logs**
- Solution: Set `LOG_LEVEL=info` in .env
- Production default: info
- Dev default: debug (useful for troubleshooting)

**Issue: JSON logs hard to read locally**
- Solution: Pipe through pino-pretty
```bash
pnpm start | pnpm exec pino-pretty
```

**Issue: Logs missing metadata**
- Solution: Check logger.child() usage
- Pass context to logPatterns functions
- Verify serializers configured

**Issue: Error stack trace not logging**
- Solution: Use `err` key (Pino convention)
```typescript
logger.error({ err: error }, 'Message');
```

### Performance Expectations

**Pino benchmarks:**
- ~20,000 logs/second (JSON)
- ~10,000 logs/second (pretty)
- <0.1ms per log entry

**No impact on API latency:**
- Async writing to stdout
- No blocking I/O

### Log Aggregation Setup (Future)

**Vercel integration:**
- Logs automatically sent to Vercel dashboard
- Filter by log level, time range
- Search by metadata fields

**Third-party (optional):**
- Datadog: Add Datadog Vercel integration
- Splunk: Forward logs via HTTP collector
- CloudWatch: Forward logs via Lambda

### Environment Variables

**`.env.local`:**
```bash
# Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# Node environment (development, production)
NODE_ENV=development
```

### Testing Tips

**Generate test logs:**
```typescript
import { logger } from '@/lib/logger';

logger.trace('Trace message');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.fatal('Fatal message');
```

**Filter logs in production:**
```bash
# Only errors
pm2 logs | grep '"level":50'

# Slow requests (>1s)
pm2 logs | grep '"duration":[1-9][0-9][0-9][0-9]'
```

### Next Steps

After this story is complete:
1. **Story 6.2:** Create health check endpoint
2. **Story 6.3:** Add manual job trigger endpoint
3. **Story 6.4:** Build stale data warning UI banner
4. **Story 6.5:** Create error handling and user-friendly error messages

### References

**Source Documents:**
- [Architecture: Logging Strategy](../planning-artifacts/architecture.md#logging-strategy)
- [Epic 6: System Operations & Monitoring](../planning-artifacts/epics.md#epic-6-system-operations--monitoring)

**External Documentation:**
- Pino Documentation: https://getpino.io/
- Pino Best Practices: https://github.com/pinojs/pino/blob/master/docs/best-practices.md
- Structured Logging: https://www.thoughtworks.com/insights/blog/structured-logging

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
