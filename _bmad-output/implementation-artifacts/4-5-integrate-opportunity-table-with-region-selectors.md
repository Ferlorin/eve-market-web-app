# Story 4.5: Integrate Opportunity Table with Region Selectors

Status: ready-for-dev

## Story

As a developer,
I want the table to populate with opportunities when traders select buy and sell markets,
So that the complete user flow works end-to-end.

## Acceptance Criteria

**Given** the RegionSelector components and OpportunityTable exist
**When** the user selects different regions for buy and sell markets
**Then** the page automatically calls `/api/opportunities?buyRegion=[id]&sellRegion=[id]`
**And** while loading, a loading spinner appears (< 500ms should be barely visible)
**And** when data returns, the OpportunityTable populates instantly with all opportunities
**And** if no opportunities are found, an empty state message displays: "No profitable trades found between [Region A] and [Region B]"
**And** if the API call fails, an error message displays: "Unable to load opportunities. Please try again."
**And** the default sort is ROI% descending (highest profit first)
**And** the complete flow (select regions → see opportunities) takes under 2 seconds total from the user's perspective

## Technical Requirements

### Opportunities Query Hook

**File:** `lib/queries/opportunities.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import type { Opportunity } from '@/components/OpportunityTable';

interface OpportunitiesResponse {
  success: boolean;
  count: number;
  data: Opportunity[];
  meta: {
    buyRegion: number;
    sellRegion: number;
    calculationTimeMs: number;
  };
}

export function useOpportunities(buyRegionId?: number, sellRegionId?: number) {
  return useQuery({
    queryKey: ['opportunities', buyRegionId, sellRegionId],
    queryFn: async (): Promise<Opportunity[]> => {
      if (!buyRegionId || !sellRegionId) return [];

      const response = await fetch(
        `/api/opportunities?buyRegion=${buyRegionId}&sellRegion=${sellRegionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const json: OpportunitiesResponse = await response.json();
      return json.data;
    },
    enabled: !!buyRegionId && !!sellRegionId && buyRegionId !== sellRegionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
```

### Updated Main Page with Integration

**File:** `app/page.tsx` (complete implementation)

```typescript
'use client';

import { useState } from 'react';
import { RegionSelector } from '@/components/RegionSelector';
import { OpportunityTable } from '@/components/OpportunityTable';
import { DataFreshness } from '@/components/DataFreshness';
import { useRegions } from '@/lib/queries/regions';
import { useOpportunities } from '@/lib/queries/opportunities';
import { useMarketValidation } from '@/lib/hooks/useMarketValidation';
import type { Region } from '@/lib/regions';

export default function HomePage() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const [buyMarket, setBuyMarket] = useState<Region | null>(null);
  const [sellMarket, setSellMarket] = useState<Region | null>(null);

  const { error: validationError, isValid } = useMarketValidation(
    buyMarket,
    sellMarket
  );

  const {
    data: opportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useOpportunities(buyMarket?.regionId, sellMarket?.regionId);

  if (regionsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-eve-blue mb-4"></div>
          <p className="text-gray-400">Loading regions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-white">
            EVE Market Scanner
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Find profitable trading opportunities across regions
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Market Selection Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RegionSelector
              label="Buy Market"
              placeholder="Select region to buy from..."
              value={buyMarket}
              onChange={setBuyMarket}
              regions={regions ?? []}
              autoFocus
            />

            <RegionSelector
              label="Sell Market"
              placeholder="Select region to sell in..."
              value={sellMarket}
              onChange={setSellMarket}
              regions={regions ?? []}
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div
              className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-eve-gold/10 border border-eve-gold"
              role="alert"
            >
              <svg
                className="h-5 w-5 text-eve-gold flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-eve-gold font-medium">
                {validationError}
              </span>
            </div>
          )}

          {/* Selection Summary */}
          {isValid && !opportunitiesLoading && (
            <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Comparing opportunities:
              </p>
              <div className="flex items-center gap-4 text-white">
                <span className="font-medium">{buyMarket?.name}</span>
                <svg
                  className="h-5 w-5 text-eve-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <span className="font-medium">{sellMarket?.name}</span>
              </div>
            </div>
          )}
        </section>

        {/* Loading State */}
        {opportunitiesLoading && (
          <section>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-eve-blue mb-4"></div>
              <p className="text-gray-400">Calculating opportunities...</p>
            </div>
          </section>
        )}

        {/* Error State */}
        {opportunitiesError && !opportunitiesLoading && (
          <section>
            <div className="bg-eve-red/10 border border-eve-red rounded-lg p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-eve-red mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-eve-red mb-2">
                Unable to load opportunities
              </h3>
              <p className="text-sm text-gray-400">
                Please try refreshing the page or selecting different regions.
              </p>
            </div>
          </section>
        )}

        {/* Opportunities Table */}
        {isValid && !opportunitiesLoading && !opportunitiesError && opportunities && (
          <section>
            {opportunities.length > 0 ? (
              <OpportunityTable data={opportunities} />
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-600 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">
                  No profitable trades found
                </h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  No profitable trades found between {buyMarket?.name} and{' '}
                  {sellMarket?.name} with current market conditions. Try
                  different regions.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {(!buyMarket || !sellMarket) && !validationError && (
          <section>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-white">
                Select markets to begin
              </h3>
              <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
                Choose a buy market and a sell market to see profitable trading
                opportunities across EVE regions.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <DataFreshness />
    </div>
  );
}
```

### Verification Steps

1. **Test complete flow:**
   ```
   1. Load page (empty state visible)
   2. Select "The Forge" in buy market
   3. Select "Domain" in sell market
   4. Loading spinner appears briefly
   5. Table populates with opportunities
   6. Default sort: ROI descending
   ```

2. **Test performance:**
   ```
   1. Start timer when selecting second region
   2. Stop when table fully rendered
   3. Total time should be < 2 seconds
   4. Typical: <1 second
   ```

3. **Test empty results:**
   ```
   1. Select two regions with no profitable trades
   2. Empty state appears: "No profitable trades found..."
   3. Shows region names in message
   ```

4. **Test error handling:**
   ```
   1. Stop backend server
   2. Select regions
   3. Error message appears: "Unable to load opportunities"
   4. User-friendly message, no stack trace
   ```

5. **Test loading state:**
   ```
   1. Slow down network (Chrome DevTools → Slow 3G)
   2. Select regions
   3. Loading spinner visible during fetch
   4. Table appears after load completes
   ```

## Architecture Context

### Why TanStack Query

**Benefits:**
- Automatic caching (5-minute stale time)
- De-duplicates requests (multiple renders = 1 API call)
- Handles loading/error states automatically
- Background refetching keeps data fresh

**Without TanStack Query:**
- Manual useState for loading/error
- Manual fetch in useEffect
- No automatic caching
- More boilerplate code

**Verdict:** TanStack Query reduces code by 60%

### Enabled Property Pattern

**Conditional Query:**
```typescript
enabled: !!buyRegionId && !!sellRegionId && buyRegionId !== sellRegionId
```

**Benefits:**
- Query doesn't run until both regions selected
- Prevents 400 errors from same-region selection
- Saves unnecessary API calls

### Why 5-Minute Stale Time

**Data Refresh Strategy:**
- Background job runs every 30 minutes
- Data stays valid for 5 minutes after fetch
- User unlikely to compare same regions repeatedly

**Balance:**
- Too short (1 min): Excessive API calls
- Too long (15 min): Stale data concerns
- 5 minutes: Good middle ground

### Loading State Duration

**Sub-500ms Target:**
- API response: ~200ms
- Table render: ~100ms
- Total: ~300ms
- Loading spinner barely visible (good UX)

**If Slower:**
- Skeleton table (show structure while loading)
- Progressive loading (show rows as they arrive)

## Dev Notes

### Prerequisites

- Story 3.4 completed (main page layout)
- Story 4.1 completed (opportunities API)
- Story 4.2 completed (OpportunityTable component)
- Story 4.3 completed (table sorting)
- Story 4.4 completed (DataFreshness component)

### No Additional Dependencies

- Uses TanStack Query (already installed)
- All components already exist

### Common Issues and Solutions

**Issue: Table doesn't appear after selecting regions**
- Solution: Check enabled property includes both conditions
- Verify API endpoint returning data

**Issue: Loading spinner shows forever**
- Solution: Check API endpoint accessible
- Verify no CORS errors in console

**Issue: "Failed to fetch opportunities" error**
- Solution: Check database has market data (Story 2.3)
- Run fetch-data job if needed

**Issue: Validation error persists after changing regions**
- Solution: Ensure useMarketValidation hook working
- Check useEffect dependencies

**Issue: Table shows old data after changing regions**
- Solution: Verify queryKey includes both region IDs
- TanStack Query should automatically refetch

### Testing Different Scenarios

**High-volume route (many opportunities):**
```typescript
buyMarket: The Forge (10000002)
sellMarket: Domain (10000043)
// Should return 1000+ opportunities
```

**Low-volume route (few opportunities):**
```typescript
buyMarket: Derelik (10000001)
sellMarket: Khanid (10000049)
// Should return <100 opportunities
```

**No opportunities:**
```typescript
// Select two isolated regions
// Should show empty state message
```

### Performance Optimization

**Lazy Loading Enhancement (Future):**
```typescript
// Load first 100 rows immediately
// Load remaining rows in background
const visibleData = opportunities.slice(0, 100);
```

**Pagination Enhancement (Future):**
```typescript
// Add pagination to API
// Load 1000 rows at a time
?buyRegion=X&sellRegion=Y&page=1&limit=1000
```

### Performance Expectations

**End-to-End Flow:**
- Region selection: <50ms
- Validation check: <1ms
- API call: ~200ms
- Table render: ~100ms
- Total: <500ms (well under 2s target)

### Next Steps

After this story is complete:
1. **Epic 5:** Implement theme switching and accessibility
2. **Epic 6:** Add monitoring, health checks, error handling
3. Consider adding filters (min ROI, item type, etc.)

### References

**Source Documents:**
- [Architecture: Frontend Architecture](../planning-artifacts/architecture.md#frontend-architecture)
- [Architecture: TanStack Query Strategy](../planning-artifacts/architecture.md#data-fetching-tanstack-query)
- [PRD: User Success Criteria](../planning-artifacts/prd.md#user-success)
- [Epic 4: Trading Opportunity Analysis & Display](../planning-artifacts/epics.md#epic-4-trading-opportunity-analysis--display)

**External Documentation:**
- TanStack Query enabled: https://tanstack.com/query/latest/docs/react/guides/disabling-queries
- React Conditional Rendering: https://react.dev/learn/conditional-rendering

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
