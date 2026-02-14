# Story 2.2: Build ESI API Client with Rate Limiting

Status: ready-for-dev

## Story

As a developer,
I want to create an ESI API client that respects the 150 req/sec rate limit,
So that I can fetch market data without violating CCP's API terms.

## Acceptance Criteria

**Given** axios is installed
**When** I create `lib/esi-client.ts` with a class ESIClient that wraps axios
**Then** the client has a base URL of `https://esi.evetech.net/latest`
**And** the client implements a request queue that limits to 150 requests per second
**And** the client has a method `getRegionOrders(regionId: number): Promise<MarketOrder[]>` that fetches all orders for a region
**And** the client validates responses using zod schemas
**And** failed requests throw errors with context (regionId, status code, error message)
**And** I can successfully fetch market orders for region 10000002 (The Forge) in a test

## Technical Requirements

### ESI Client Implementation

**Create: `src/lib/esi-client.ts`**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

// ESI API Response Schemas (zod validation)
const ESIMarketOrderSchema = z.object({
  order_id: z.number(),
  type_id: z.number(),
  location_id: z.number(),
  volume_remain: z.number(),
  price: z.number(),
  is_buy_order: z.boolean(),
  issued: z.string().datetime(),
  duration: z.number(),
  min_volume: z.number(),
  range: z.string(),
  system_id: z.number().optional(),
});

type ESIMarketOrder = z.infer<typeof ESIMarketOrderSchema>;

const ESIRegionSchema = z.object({
  region_id: z.number(),
  name: z.string().optional(),
});

// Rate Limiter using Token Bucket Algorithm
class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    
    // Wait until a token is available
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
  }
}

export class ESIClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://esi.evetech.net/latest',
      timeout: 30000,
      headers: {
        'User-Agent': 'EVE-Market-Scanner/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });
    
    // NFR-I1: Respect 150 req/sec limit
    this.rateLimiter = new RateLimiter(150);
    
    // Request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquire();
      return config;
    });
    
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }
  
  private async handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const endpoint = error.config?.url || 'unknown';
      
      if (status === 503) {
        // Service unavailable - will be handled by retry logic in Story 2.3
        throw new ESIError(
          `ESI API unavailable (503): ${endpoint}`,
          status,
          endpoint,
          true // retryable
        );
      }
      
      if (status === 429) {
        // Rate limited (shouldn't happen with our rate limiter)
        throw new ESIError(
          `ESI API rate limited (429): ${endpoint}`,
          status,
          endpoint,
          true
        );
      }
      
      throw new ESIError(
        `ESI API error (${status}): ${endpoint}`,
        status,
        endpoint,
        false
      );
    }
    
    // Network error or timeout
    throw new ESIError(
      `Network error: ${error.message}`,
      0,
      error.config?.url || 'unknown',
      true
    );
  }
  
  async getAllRegions(): Promise<number[]> {
    try {
      const response = await this.axiosInstance.get<number[]>('/universe/regions/');
      
      // ESI returns array of region IDs
      const regionIds = z.array(z.number()).parse(response.data);
      
      // Filter out wormhole regions (starts with 110000xx)
      return regionIds.filter(id => !id.toString().startsWith('11'));
    } catch (error) {
      if (error instanceof ESIError) throw error;
      throw new ESIError('Failed to fetch region list', 0, '/universe/regions/', false);
    }
  }
  
  async getRegionOrders(regionId: number): Promise<ESIMarketOrder[]> {
    try {
      // ESI Market Orders endpoint (paginated)
      const allOrders: ESIMarketOrder[] = [];
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const response = await this.axiosInstance.get(
          `/markets/${regionId}/orders/`,
          { params: { page } }
        );
        
        // Validate response with zod
        const orders = z.array(ESIMarketOrderSchema).parse(response.data);
        allOrders.push(...orders);
        
        // Check X-Pages header for pagination
        const totalPages = parseInt(response.headers['x-pages'] || '1', 10);
        hasMorePages = page < totalPages;
        page++;
      }
      
      return allOrders;
    } catch (error) {
      if (error instanceof ESIError) {
        error.context = { ...error.context, regionId };
        throw error;
      }
      throw new ESIError(
        `Failed to fetch orders for region ${regionId}`,
        0,
        `/markets/${regionId}/orders/`,
        false,
        { regionId }
      );
    }
  }
}

// Custom error class for ESI API errors
export class ESIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public retryable: boolean,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ESIError';
  }
}

// Singleton instance
export const esiClient = new ESIClient();
```

### Test Script

**Create: `src/lib/__tests__/esi-client.test.ts`**

```typescript
import { esiClient } from '../esi-client';

async function testESIClient() {
  console.log('Testing ESI Client...\n');
  
  try {
    // Test 1: Fetch region list
    console.log('Test 1: Fetching all regions...');
    const regions = await esiClient.getAllRegions();
    console.log(`✅ Found ${regions.length} regions`);
    console.log(`Sample regions: ${regions.slice(0, 5).join(', ')}\n`);
    
    // Test 2: Fetch orders for The Forge (10000002)
    console.log('Test 2: Fetching orders for The Forge (regionId: 10000002)...');
    const startTime = Date.now();
    const orders = await esiClient.getRegionOrders(10000002);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Fetched ${orders.length} orders in ${duration}ms`);
    console.log(`Sample order:`, {
      order_id: orders[0].order_id,
      type_id: orders[0].type_id,
      price: orders[0].price,
      volume: orders[0].volume_remain,
      is_buy: orders[0].is_buy_order,
    });
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testESIClient();
```

**Run test:**
```bash
pnpm tsx src/lib/__tests__/esi-client.test.ts
```

## Architecture Context

### Rate Limiting Strategy (NFR-I1)

**CCP's ESI API Limit: 150 requests per second**

**Token Bucket Algorithm:**
- Bucket holds 150 tokens (max capacity)
- Tokens refill at 150/second
- Each request consumes 1 token
- If no tokens available, request waits

**Why Token Bucket vs Alternatives:**
- **Leaky Bucket:** Enforces strict constant rate, bad for bursts
- **Fixed Window:** Allows burst at window boundary (can exceed limit)
- **Token Bucket:** Allows controlled bursts (good for parallel fetching)

**Implementation Details:**
```typescript
// Scenario: Fetch 10 regions in parallel
await Promise.all(regions.map(id => esiClient.getRegionOrders(id)));

// Token bucket ensures total rate never exceeds 150 req/sec
// Requests naturally spread across time window
```

### Error Handling Strategy (NFR-I2, NFR-I3)

**Error Types:**
1. **503 Service Unavailable:** ESI API overloaded (retryable)
2. **429 Rate Limited:** Too many requests (retryable, shouldn't happen)
3. **4xx Client Errors:** Bad request (not retryable)
4. **Network Errors:** Timeout, DNS failure (retryable)

**Retry Logic (Story 2.3):**
- 503 errors: Exponential backoff starting at 5 seconds (NFR-I2)
- Up to 3 retry attempts (NFR-I3)
- ESIError carries `retryable` flag for easy decision

### Zod Validation (Runtime Type Safety)

**Why Validate ESI Responses:**
- ESI API can change without notice
- Prevents corrupted data from reaching database
- Type safety at runtime (TypeScript only covers compile-time)

**Performance Impact:**
- Zod parsing: ~0.1ms per object
- Parsing 10K orders: ~1 second overhead
- Acceptable for data integrity guarantee

### Pagination Handling

**ESI Market Orders Pagination:**
- Default page size: ~1000 orders
- Total pages in `X-Pages` response header
- Must fetch all pages to get complete dataset

**Example: The Forge (Jita)**
- ~150K active orders
- ~150 pages × 1000 orders/page
- ~150 API calls per region
- With rate limiter: ~1 second to fetch all pages

## Dev Notes

### Prerequisites

- **Story 1.4:** axios and zod installed ✅
- Internet connection for accessing ESI API

### Implementation Steps

```bash
# 1. Create ESI client file
# (Copy code from above into src/lib/esi-client.ts)

# 2. Create test file
# (Copy test code into src/lib/__tests__/esi-client.test.ts)

# 3. Run test to verify ESI connectivity
pnpm tsx src/lib/__tests__/esi-client.test.ts

# Expected output:
# Test 1: Fetching all regions...
# ✅ Found 60 regions
# Sample regions: 10000001, 10000002, 10000003, 10000004, 10000005
#
# Test 2: Fetching orders for The Forge...
# ✅ Fetched 150000 orders in 1200ms
# Sample order: { order_id: 6182965480, type_id: 34, price: 5.5, ... }
#
# ✅ All tests passed!
```

### Common Issues and Solutions

**Issue: "Network Error: connect ETIMEDOUT"**
- **Solution:** Check internet connection, ESI API may be down
- Status: https://esi.evetech.net/ui/

**Issue: "ESI API unavailable (503)"**
- **Solution:** ESI is temporarily overloaded, retry logic in Story 2.3 will handle this

**Issue: "Zod validation error"**
- **Solution:** ESI API response format changed, update schema accordingly
- Check ESI docs: https://esi.evetech.net/ui/

**Issue: Rate limiter not working (429 errors)**
- **Solution:** Verify token bucket math, check system clock (Date.now())

### Verification Checklist

- [ ] `src/lib/esi-client.ts` exists with ESIClient class
- [ ] Test script runs successfully against live ESI API
- [ ] `getAllRegions()` returns 60+ region IDs
- [ ] `getRegionOrders(10000002)` returns 100K+ orders
- [ ] No 429 rate limit errors during testing
- [ ] Zod validation passes for all ESI responses
- [ ] ESIError class properly captures error context

### Next Steps

After this story is complete:
1. **Story 2.3:** Use ESI client to fetch + store market data
2. **Story 2.4:** Schedule automatic fetching every 30 minutes
3. Add exponential backoff retry logic for 503 errors

### Performance Notes

**Fetch Time Estimates:**
- Single region (The Forge): ~1-2 seconds (150 pages)
- All 60 regions: ~60-120 seconds (parallel with rate limiting)
- Well within 30-minute window (NFR-I6)

**Rate Limiter Overhead:**
- Token acquisition: <1ms per request
- Minimal impact on overall performance

### References

- [Architecture: ESI API Client Architecture](../planning-artifacts/architecture.md#esi-api-client-architecture)
- [PRD: NFR-I1 (Rate Limiting)](../planning-artifacts/prd.md#nonfunctional-requirements)
- [Epic 2: Story 2.2](../planning-artifacts/epics.md#story-22-build-esi-api-client-with-rate-limiting)
- ESI Swagger UI: https://esi.evetech.net/ui/
- ESI GitHub: https://github.com/esi/esi-docs

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
