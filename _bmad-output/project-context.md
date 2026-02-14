---
project_name: 'eve-market-web-app'
user_name: 'Harry'
date: '2026-02-14'
sections_completed: ['initialization', 'technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_dont_miss_rules']
version: '1.0.0'
last_updated: '2026-02-14'
status: 'complete'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Framework & Runtime
- **Next.js:** 16.1.6 (App Router, Turbopack default bundler)
- **React:** 19.2.4
- **Node.js:** 20.9+ (minimum requirement)
- **TypeScript:** 5.9.3

### UI & Styling
- **Tailwind CSS:** 4.1 (with `@tailwindcss/vite` plugin)
- **Headless UI:** 2.1 (React - accessibility-first components)

### Data Management
- **Database:** PostgreSQL via Neon (serverless, free tier: 0.5GB)
- **ORM:** Prisma 5.8.0 (type-safe queries, automatic migrations)
- **State Management:**
  - TanStack Query 5.20.5 (server state, caching)
  - Zustand 4.5.0 (UI state)

### Performance & Optimization
- **Virtual Scrolling:** TanStack Virtual 3.0.4 (for 10K+ row tables)
- **Validation:** Zod 3.22.4 (runtime validation for ESI API responses)

### External Integrations
- **HTTP Client:** Axios 1.6.7 (ESI API requests)
- **Concurrency Control:** p-limit 5.0.0 (ESI rate limiting)
- **Logging:** Pino 8.17.2 (structured JSON logging)

### Testing
- **Unit/Integration:** Vitest 1.2.0 + @vitest/ui 1.2.0
- **E2E:** Playwright 1.40.0 + @playwright/test 1.40.0
- **Mocking:** MSW 2.0.0 (Mock Service Worker for API mocking)
- **Testing Library:** @testing-library/react 14.1.2

### Development Tools
- **Dev Logging:** pino-pretty 10.3.1 (pretty console output)
- **Package Manager:** pnpm (recommended)

---

## Critical Implementation Rules

### 1. ESI API Integration Requirements

**MANDATORY COMPLIANCE:**
- **Rate Limit:** 150 requests/second maximum (enforced with p-limit)
- **Error Handling:** Exponential backoff starting at 5s for 503 errors
- **Retry Logic:** 3 attempts before job failure
- **Data Validation:** ALL ESI responses MUST be validated with Zod schemas

**Circuit Breaker Pattern:**
```typescript
// REQUIRED for all ESI API calls
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'closed' | 'open' | 'half-open';
}
```

**Anti-Pattern:**
```typescript
// ❌ NEVER call ESI without rate limiting
await Promise.all(regions.map(r => fetchESI(r)));
```

**Correct Pattern:**
```typescript
// ✅ ALWAYS use p-limit for ESI requests
import pLimit from 'p-limit';
const limit = pLimit(150);
await Promise.all(regions.map(r => limit(() => fetchESI(r))));
```

### 2. Database Schema & Naming Conventions

**CRITICAL: snake_case for ALL database identifiers**
- Tables: `market_orders`, `fetch_logs`, `opportunity_cache`
- Columns: `region_id`, `type_id`, `is_buy_order`, `fetch_completed_at`
- Indexes: `idx_region_type`, `idx_buy_orders`, `idx_updated`

**Composite Indexes (REQUIRED):**
```sql
-- Performance-critical indexes
INDEX idx_region_type (region_id, type_id)
INDEX idx_buy_orders (region_id, is_buy_order, type_id)
INDEX idx_updated (updated_at)
```

**Storage Optimization (0.5GB free tier limit):**
- Retention: Purge orders older than 7 days
- Cache expiry: opportunity_cache expires after 1 hour
- Estimated storage: ~100MB for 7 days of data

### 3. Data Freshness Tracking (CRITICAL REQUIREMENT)

**Staleness Thresholds:**
- **Fresh:** < 35 minutes since last successful fetch
- **Acceptable:** 35-44 minutes
- **Stale (WARNING):** 45+ minutes

**MANDATORY Display:**
- "Last updated" timestamp MUST be visible on initial page load
- Stale data (45+ min) MUST trigger prominent warning
- Health check endpoint MUST track data age across all regions

**Implementation:**
```typescript
// REQUIRED: Data age calculation
const dataAge = Math.floor((now - lastFetchTime) / 60000);
const staleness = dataAge < 35 ? 'fresh' 
  : dataAge < 45 ? 'acceptable' 
  : 'stale';
```

### 4. Performance Requirements (NON-NEGOTIABLE)

**Page Load Times:**
- Initial page load: < 2 seconds
- Time to Interactive (TTI): < 2.5 seconds
- First Contentful Paint (FCP): < 1 second

**Runtime Performance:**
- Table rendering (10K+ rows): < 500ms
- Sorting operations: < 200ms (client-side)
- API response time: < 500ms (with cache hit)

**Bundle Size:**
- Initial bundle: < 500KB gzipped
- API response payload: < 2MB per query

**Virtual Scrolling REQUIRED:**
```typescript
// MANDATORY for OpportunitiesTable
import { useVirtualizer } from '@tanstack/react-virtual';
// Never render more than visible rows + buffer
```

### 5. Naming Conventions (STRICT ENFORCEMENT)

**Database & API:**
- snake_case: `buy_market`, `sell_market`, `roi_percentage`
- Plural endpoints: `/api/opportunities`, `/api/markets`
- Query params: `?buy_market=10000002&sell_market=10000030`

**TypeScript/React:**
- PascalCase components: `OpportunitiesTable.tsx`, `MarketSelector.tsx`
- camelCase functions/variables: `calculateROI`, `fetchMarketData`
- camelCase files: `roi.ts`, `esi-client.ts`

**Tests:**
- Co-located with source: `OpportunitiesTable.test.tsx`
- Same directory as tested file (NO `__tests__/` folder)

### 6. Error Handling Patterns

**API Errors (RFC 7807 Problem Details):**
```typescript
// REQUIRED format for all API errors
{
  "type": "/problems/stale-data",
  "title": "Market Data Is Stale",
  "status": 503,
  "detail": "Market data hasn't been updated in 47 minutes.",
  "instance": "/api/opportunities?buy_market=10000002",
  "data_age_minutes": 47, // Custom fields allowed
  "last_fetch_time": "2026-02-14T10:43:00.000Z"
}
```

**React Error Boundaries (REQUIRED):**
```typescript
// Page-level boundary
<ErrorBoundary fallback={<GenericErrorPage />}>
  <AppContent />
</ErrorBoundary>

// Component-level boundary
<ErrorBoundary fallback={<TableErrorMessage />}>
  <OpportunitiesTable />
</ErrorBoundary>
```

**System Errors (Logging):**
```typescript
// REQUIRED: Full context logging
logger.error({
  event: 'fetch_failed',
  regionId: 10000002,
  error: error.message,
  stack: error.stack,
  attempt: retryCount
});
```

### 7. State Management Patterns

**TanStack Query (Server State):**
```typescript
// ✅ REQUIRED: Array keys with primitives
['opportunities', buyMarketId, sellMarketId]
['markets']
['health']

// ❌ NEVER use object keys
['opportunities', {buy: buyMarketId, sell: sellMarketId}]
```

**Zustand (UI State):**
```typescript
// ✅ REQUIRED: Single-purpose setters
setBuyMarket: (region) => set({ buyMarket: region })
setSellMarket: (region) => set({ sellMarket: region })

// ✅ REQUIRED: Selector pattern for components
const buyMarket = useMarketStore((state) => state.buyMarket);

// ❌ NEVER get entire store
const store = useMarketStore(); // Re-renders on ANY change
```

**State Ownership:**
- TanStack Query → Server state (API data, loading, errors)
- Zustand → UI state (selections, filters, preferences)
- React useState → Component-local ephemeral state

### 8. Logging Structure

**REQUIRED Format:**
```typescript
// ✅ Flat structure with 'event' field
logger.info({
  event: 'fetch_completed',
  regionId: 10000002,
  duration: 1250,
  ordersProcessed: 45000
});

// ❌ NEVER nest context
logger.info({
  context: { event: 'fetch_completed', data: {...} }
});
```

**Log Levels:**
- `error`: ESI failures, database errors, crashes
- `warn`: Stale data, rate limits approaching, slow queries (>1s)
- `info`: Job completions, API requests, cache invalidations
- `debug`: Detailed execution (disabled in production)

### 9. API Response Format

**Success Response:**
```typescript
{
  "data": [...],  // Main payload
  "meta": {       // Metadata
    "buy_market": 10000002,
    "sell_market": 10000030,
    "count": 1250,
    "generated_at": "2026-02-14T11:30:00.000Z",
    "data_age_minutes": 28
  }
}
```

**Data Formats:**
- Timestamps: ISO 8601 UTC strings (`"2026-02-14T11:30:00.000Z"`)
- Decimals: Numbers (`5.20`), NOT strings (`"5.20"`)
- Booleans: `true`/`false`, NOT `1`/`0`
- Nulls: Use `null` for missing optional values

### 10. File Organization

**Structure:**
```
app/
  page.tsx                    # Main page
  layout.tsx                  # Root layout
  api/
    opportunities/route.ts    # REST endpoints
    cron/fetch-markets/route.ts

components/
  OpportunitiesTable.tsx      # Flat structure
  OpportunitiesTable.test.tsx # Co-located tests
  MarketSelector.tsx

lib/                          # Domain-grouped utilities
  calculations/
    roi.ts
    roi.test.ts
  esi/
    client.ts
    circuit-breaker.ts
    schemas.ts                # Zod schemas
  db/
    prisma.ts                 # Singleton client
    queries.ts
  store.ts                    # Zustand store
  logger.ts                   # Pino setup
  errors.ts                   # RFC 7807 types
```

**File Naming:**
- Components: PascalCase (`OpportunitiesTable.tsx`)
- Utilities: camelCase (`calculateROI.ts`)
- Tests: Same name + `.test.ts` suffix
- API routes: `route.ts` (Next.js convention)

### 11. Caching Strategy

**opportunity_cache table (REQUIRED):**
- TTL: 1 hour expiry
- Invalidation: On new data fetch per region
- Purpose: < 500ms API response for ROI calculations

**Cache Hit vs Miss:**
- Cache hit: < 50ms response
- Cache miss: < 2s calculation + storage

### 12. Background Job Implementation

**Vercel Cron Configuration:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/fetch-markets",
    "schedule": "*/30 * * * *"  // Every 30 minutes
  }]
}
```

**Job Requirements:**
- 10-minute timeout (Vercel free tier limit)
- Parallel fetching with p-limit (150 concurrent)
- Success/failure logging to fetch_logs table
- Automatic cache invalidation on completion

### 13. Zero-Cost Hosting Constraints

**Phase 1 (MVP - $0/month):**
- Frontend: Vercel free tier
- Database: Neon free tier (0.5GB, 3 databases)
- Background jobs: Vercel Cron
- Bandwidth: 100GB/month limit

**Migration Trigger:**
- If serverless timeout (10 min) exceeded
- If database storage > 0.5GB
- Solution: Move backend to Railway ($5/month)

### 14. Testing Requirements

**Coverage Target:** 80%+ for business logic

**Test Organization:**
- Unit tests: Co-located with source files
- Integration tests: `/tests/integration/`
- E2E tests: `/tests/e2e/`

**Critical Test Coverage:**
- ROI calculations (`/lib/calculations/`)
- ESI client with circuit breaker (`/lib/esi/`)
- API endpoints (with test database)
- Market selection + table rendering (E2E)

### 15. Accessibility Requirements

**Keyboard Navigation (MANDATORY):**
- Tab: Navigate between controls
- Enter: Trigger actions
- Arrow keys: Navigate dropdowns
- Escape: Close dropdowns/modals

**Theme Support (REQUIRED):**
- Light/dark mode toggle
- System preference detection (`prefers-color-scheme`)
- Preference persistence (localStorage)

**Region Selection:**
- Fuzzy autocomplete with keyboard navigation
- Type "for" → matches "The Forge"
- No exact spelling required

---

## Anti-Patterns (NEVER DO THIS)

### ❌ Database
```typescript
// NEVER use camelCase in database
CREATE TABLE marketOrders (orderId BIGINT);
```

### ❌ ESI API
```typescript
// NEVER call ESI without rate limiting
await Promise.all(regions.map(fetchESI));
```

### ❌ State Management
```typescript
// NEVER use object keys in TanStack Query
['opportunities', {buy: 1, sell: 2}]

// NEVER get entire Zustand store
const store = useMarketStore();
```

### ❌ Error Handling
```typescript
// NEVER return generic error messages
return NextResponse.json({ error: "Something went wrong" });
```

### ❌ Performance
```typescript
// NEVER render all 10K+ rows without virtualization
{opportunities.map(opp => <Row data={opp} />)}
```

---

## Quick Reference Commands

### Development
```bash
# Start development server
pnpm dev

# Start local database
docker-compose up -d

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed

# Run tests
pnpm test              # Unit tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # Coverage report

# Lint & format
pnpm lint
pnpm format
```

### Deployment
```bash
# Deploy to Vercel (auto on git push to main)
vercel

# Apply migrations to production
pnpm prisma migrate deploy

# Check production health
curl https://your-app.vercel.app/api/health
```

---

## Project Constraints Summary

1. **Zero-cost hosting** ($0/month on free tiers, $5/month fallback acceptable)
2. **Desktop-first** (no mobile optimization required)
3. **Modern browsers only** (Chrome/Firefox/Edge/Safari latest 2 versions)
4. **No authentication** (public ESI data only)
5. **ESI API compliance** (150 req/sec, exponential backoff, retry logic)
6. **Data freshness tracking** (45-minute stale warning threshold)
7. **Performance targets** (<2s load, <500ms table render, <200ms sort)
8. **Minimal maintenance** (<30 min/week operational burden)

---

## Usage Guidelines

### For AI Agents

**Before implementing ANY code:**
1. Read this entire file to understand project standards
2. Follow ALL rules exactly as documented  
3. When uncertain, prefer the more restrictive option
4. Reference specific sections for implementation patterns

**During implementation:**
- Verify naming conventions match (snake_case DB/API, camelCase code)
- Ensure error handling uses RFC 7807 format
- Confirm state management uses correct ownership boundaries
- Check that performance requirements are met

**After implementation:**
- Verify all tests pass and are co-located
- Confirm no anti-patterns were introduced
- Ensure logging includes proper context
- Validate against the Quick Reference Checklist

### For Humans

**Maintenance:**
- Review quarterly for outdated or obvious rules
- Update when technology stack versions change
- Add new patterns as they emerge from implementation
- Remove rules that become universally understood

**Evolution:**
- Keep file lean and focused on non-obvious requirements
- Prioritize rules that prevent mistakes over general advice
- Update version numbers when dependencies change
- Document migration patterns when architectural changes occur

**Optimization:**
- Target < 5000 tokens for optimal LLM context usage
- Combine related rules to reduce redundancy
- Use specific examples rather than abstract descriptions
- Maintain scannable structure with clear hierarchy

---

## Document Metadata

- **Created:** 2026-02-14
- **Last Updated:** 2026-02-14
- **Status:** Complete
- **Version:** 1.0.0
- **Total Sections:** 15 critical implementation rules
- **Optimized for:** LLM context efficiency
- **Target Audience:** AI agents implementing code for eve-market-web-app

---

**Ready for Implementation** ✅

AI agents should begin by running: `pnpm create next-app@latest eve-market-web-app --yes`
