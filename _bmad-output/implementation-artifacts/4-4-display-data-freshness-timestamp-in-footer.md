# Story 4.4: Display Data Freshness Timestamp in Footer

Status: ready-for-dev

## Story

As a developer,
I want to show a "Last updated" timestamp prominently in the UI,
So that traders know how fresh the market data is.

## Acceptance Criteria

**Given** the Region table tracks lastFetchedAt timestamps
**When** I create a footer component that fetches the most recent lastFetchedAt from any region
**Then** the footer displays "Last updated: [timestamp]" in small text (12px, low emphasis color #6B7785)
**And** the timestamp is formatted as "Feb 14, 2026 9:02 AM" using date-fns
**And** if the data is older than 45 minutes, the text turns yellow (#FFB800) with a warning icon
**And** if the data is older than 2 hours, the text turns red (#FF4757) with a "Stale data" label
**And** the footer is positioned at the bottom of the page with 12px vertical + 16px horizontal padding
**And** the timestamp updates when the page is refreshed

## Technical Requirements

### Data Freshness API

**File:** `app/api/data-freshness/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    const mostRecent = await db.region.findFirst({
      where: {
        lastFetchedAt: {
          not: null,
        },
      },
      orderBy: {
        lastFetchedAt: 'desc',
      },
      select: {
        lastFetchedAt: true,
        name: true,
      },
    });

    if (!mostRecent || !mostRecent.lastFetchedAt) {
      return NextResponse.json({
        success: false,
        error: 'No data available',
      });
    }

    const now = new Date();
    const lastUpdate = new Date(mostRecent.lastFetchedAt);
    const ageMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);

    let status: 'fresh' | 'stale' | 'very-stale';
    if (ageMinutes < 45) {
      status = 'fresh';
    } else if (ageMinutes < 120) {
      status = 'stale';
    } else {
      status = 'very-stale';
    }

    return NextResponse.json({
      success: true,
      lastFetchedAt: mostRecent.lastFetchedAt,
      ageMinutes,
      status,
      regionName: mostRecent.name,
    });
  } catch (error) {
    console.error('Data freshness API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data freshness' },
      { status: 500 }
    );
  }
}
```

### DataFreshness Component

**File:** `components/DataFreshness.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  XCircleIcon 
} from '@heroicons/react/20/solid';

interface DataFreshnessResponse {
  success: boolean;
  lastFetchedAt: string;
  ageMinutes: number;
  status: 'fresh' | 'stale' | 'very-stale';
  regionName: string;
}

export function DataFreshness() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-freshness'],
    queryFn: async (): Promise<DataFreshnessResponse> => {
      const response = await fetch('/api/data-freshness');
      if (!response.ok) throw new Error('Failed to fetch data freshness');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });

  if (isLoading) {
    return (
      <div className="py-3 px-4 bg-gray-900 border-t border-gray-700">
        <p className="text-xs text-gray-500">Loading data status...</p>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="py-3 px-4 bg-gray-900 border-t border-gray-700">
        <p className="text-xs text-gray-500">Unable to determine data freshness</p>
      </div>
    );
  }

  const lastUpdate = new Date(data.lastFetchedAt);
  const formattedDate = format(lastUpdate, 'MMM d, yyyy h:mm a');
  const relativeTime = formatDistanceToNow(lastUpdate, { addSuffix: true });

  const getStatusConfig = () => {
    switch (data.status) {
      case 'fresh':
        return {
          color: 'text-gray-400',
          icon: ClockIcon,
          label: 'Last updated',
        };
      case 'stale':
        return {
          color: 'text-eve-gold',
          icon: ExclamationTriangleIcon,
          label: 'Data may be stale',
        };
      case 'very-stale':
        return {
          color: 'text-eve-red',
          icon: XCircleIcon,
          label: 'Stale data',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const Icon = statusConfig.icon;

  return (
    <div className="py-3 px-4 bg-gray-900 border-t border-gray-700">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${statusConfig.color}`} />
          <span className={statusConfig.color}>
            {statusConfig.label}: {formattedDate}
          </span>
          <span className="text-gray-600">({relativeTime})</span>
        </div>
        
        {data.status !== 'fresh' && (
          <span className={`${statusConfig.color} font-medium`}>
            {data.ageMinutes} minutes old
          </span>
        )}
      </div>
    </div>
  );
}
```

### Integration with Main Page

**Update `app/page.tsx`:**

```typescript
import { DataFreshness } from '@/components/DataFreshness';

export default function HomePage() {
  // ... existing code ...

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header>...</header>

      {/* Main Content */}
      <main className="flex-1">...</main>

      {/* Footer with Data Freshness */}
      <DataFreshness />
    </div>
  );
}
```

### Verification Steps

1. **Test fresh data (< 45 minutes):**
   ```
   1. Run fetch-data job
   2. Load page immediately
   3. Footer shows: "Last updated: [time]" in gray
   4. Clock icon displayed
   ```

2. **Test stale data (45-120 minutes):**
   ```
   1. Manually update lastFetchedAt to 1 hour ago
   2. Refresh page
   3. Footer shows: "Data may be stale" in yellow (#FFB800)
   4. Warning triangle icon displayed
   5. Shows "60 minutes old"
   ```

3. **Test very stale data (> 120 minutes):**
   ```
   1. Manually update lastFetchedAt to 3 hours ago
   2. Refresh page
   3. Footer shows: "Stale data" in red (#FF4757)
   4. X-circle icon displayed
   5. Shows "180 minutes old"
   ```

4. **Test auto-refresh:**
   ```
   1. Keep page open for 2 minutes
   2. Footer automatically re-queries every minute
   3. Timestamp updates if new data fetched
   ```

5. **Test timestamp format:**
   ```
   - Displays: "Feb 14, 2026 9:02 AM"
   - Relative: "2 minutes ago"
   - Both shown simultaneously
   ```

## Architecture Context

### Why Separate API Endpoint

**Design Decision:**
- Dedicated `/api/data-freshness` endpoint
- Queried independently from opportunities
- Lightweight (single database query)

**Benefits:**
- Can be polled frequently (every minute)
- Doesn't require regions to be selected
- Shows data status on empty state

**Alternative:**
- Include in opportunities API response
- Trade-off: Only shows when querying opportunities

### Why Auto-Refresh Every Minute

**User Experience:**
- Background job runs every 30 minutes
- Polling every minute shows progress
- Users see timestamp update without manual refresh

**Performance:**
- Lightweight query (<10ms)
- Minimal bandwidth (~200 bytes JSON)
- Acceptable for 1-minute interval

### Why Three Status Levels

**Fresh (<45 minutes):**
- Normal operation
- Background job runs every 30 min
- 15-minute buffer before warning

**Stale (45-120 minutes):**
- One missed job cycle
- Warning but data still usable
- Traders should verify prices in-game

**Very Stale (>120 minutes):**
- Two+ missed job cycles
- Clear "do not trust" signal
- System health issue likely

### Date Formatting Strategy

**Absolute + Relative:**
- Absolute: "Feb 14, 2026 9:02 AM" (exact time)
- Relative: "2 minutes ago" (quick context)
- Both shown for best UX

**Using date-fns:**
- Lighter than moment.js (13KB vs 67KB)
- Tree-shakeable (only import used functions)
- Better TypeScript support

## Dev Notes

### Prerequisites

- Story 2.3 completed (lastFetchedAt populated)
- Story 2.4 completed (background job running)
- date-fns installed: `pnpm add date-fns`

### Dependencies to Install

```bash
pnpm add date-fns
```

### Common Issues and Solutions

**Issue: "No data available" error**
- Solution: Run fetch-data job first: `pnpm run fetch-data`
- Ensure Region table has lastFetchedAt values

**Issue: Timestamp not updating**
- Solution: Check refetchInterval set to 60000 (1 minute)
- Verify TanStack Query not disabled

**Issue: Wrong timezone displayed**
- Solution: date-fns uses local timezone by default
- To force UTC: Import `formatInTimeZone` from `date-fns-tz`

**Issue: Age calculation incorrect**
- Solution: Check both dates are Date objects, not strings
- Use `new Date()` to convert if needed

**Issue: Icons not displaying**
- Solution: Ensure @heroicons/react installed
- Check correct import path (20/solid vs 24/outline)

### Testing Different Age Scenarios

**Manually set lastFetchedAt:**

```sql
-- Fresh data (10 minutes ago)
UPDATE regions SET last_fetched_at = NOW() - INTERVAL '10 minutes';

-- Stale data (60 minutes ago)
UPDATE regions SET last_fetched_at = NOW() - INTERVAL '60 minutes';

-- Very stale data (3 hours ago)
UPDATE regions SET last_fetched_at = NOW() - INTERVAL '3 hours';
```

### Styling Customization

**Change thresholds:**
```typescript
// In API route:
if (ageMinutes < 60) {  // More lenient
  status = 'fresh';
} else if (ageMinutes < 180) {  // 3 hours before critical
  status = 'stale';
}
```

**Adjust colors:**
```typescript
text-eve-gold → text-yellow-500  // Different yellow
text-eve-red → text-red-500      // Different red
```

### Performance Expectations

**API Response:**
- Database query: <10ms
- JSON response: <50ms total
- Polling every minute: Negligible impact

**Component Render:**
- Initial render: <5ms
- Re-render on update: <2ms
- No performance concerns

### Next Steps

After this story is complete:
1. **Story 4.5:** Integrate opportunity table with region selectors
2. **Story 6.4:** Build stale data warning banner (more prominent)
3. Consider adding "Refresh Now" button for manual trigger

### References

**Source Documents:**
- [Architecture: Data Freshness Tracking](../planning-artifacts/architecture.md)
- [PRD: Data Freshness Communication](../planning-artifacts/prd.md#core-functionality)
- [Epic 4: Trading Opportunity Analysis & Display](../planning-artifacts/epics.md#epic-4-trading-opportunity-analysis--display)

**External Documentation:**
- date-fns format: https://date-fns.org/docs/format
- date-fns formatDistanceToNow: https://date-fns.org/docs/formatDistanceToNow
- TanStack Query refetchInterval: https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
