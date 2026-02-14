# Story 4.3: Add Client-Side Column Sorting to Opportunity Table

Status: ready-for-dev

## Story

As a developer,
I want traders to sort the opportunity table by any column with a single click,
So that they can quickly find the best opportunities by their preferred metric.

## Acceptance Criteria

**Given** the OpportunityTable component exists with data
**When** a user clicks a column header (e.g., "ROI%")
**Then** the table sorts descending by that column (highest ROI first)
**And** clicking the same header again toggles to ascending sort (lowest ROI first)
**And** the active sort column shows a visual indicator (arrow icon or highlight, EVE blue #33B5E5)
**And** sorting completes in under 200ms regardless of dataset size
**And** sorting is client-side only (no API calls)
**And** all columns are sortable: Item Name (alphabetical), Buy Price (numerical), Sell Price (numerical), ROI% (numerical), Quantity (numerical)
**And** after sorting, the virtual scroller scrolls back to the top

## Technical Requirements

### Enhanced OpportunityTable Component

**File:** `components/OpportunityTable.tsx` (update)

```typescript
'use client';

import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

export interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  buyStation: number;
  sellStation: number;
  roi: number;
  volumeAvailable: number;
}

type SortColumn = 
  | 'itemName'
  | 'buyPrice'
  | 'sellPrice'
  | 'roi'
  | 'volumeAvailable'
  | 'buyStation'
  | 'sellStation';

type SortDirection = 'asc' | 'desc';

interface OpportunityTableProps {
  data: Opportunity[];
}

export function OpportunityTable({ data }: OpportunityTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('roi');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case 'itemName':
          aVal = a.itemName.toLowerCase();
          bVal = b.itemName.toLowerCase();
          break;
        case 'buyPrice':
          aVal = a.buyPrice;
          bVal = b.buyPrice;
          break;
        case 'sellPrice':
          aVal = a.sellPrice;
          bVal = b.sellPrice;
          break;
        case 'roi':
          aVal = a.roi;
          bVal = b.roi;
          break;
        case 'volumeAvailable':
          aVal = a.volumeAvailable;
          bVal = b.volumeAvailable;
          break;
        case 'buyStation':
          aVal = a.buyStation;
          bVal = b.buyStation;
          break;
        case 'sellStation':
          aVal = a.sellStation;
          bVal = b.sellStation;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column: default to descending for numbers, ascending for text
      setSortColumn(column);
      setSortDirection(column === 'itemName' ? 'asc' : 'desc');
    }

    // Scroll to top after sort
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatROI = (roi: number) => {
    return roi.toFixed(2) + '%';
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toLocaleString();
  };

  const headerButtonClass = (column: SortColumn) =>
    `w-full text-left px-0 py-0 text-xs font-semibold uppercase tracking-wider transition-colors
    ${sortColumn === column ? 'text-eve-blue' : 'text-gray-300 hover:text-white'}
    focus:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue rounded`;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      {/* Fixed Table Header with Sortable Columns */}
      <div className="border-b border-gray-700 bg-gray-900">
        <div className="grid grid-cols-8 gap-4 px-4 py-3">
          <button
            onClick={() => handleSort('itemName')}
            className={headerButtonClass('itemName')}
          >
            Item <SortIcon column="itemName" />
          </button>

          <button
            onClick={() => handleSort('buyStation')}
            className={`${headerButtonClass('buyStation')} text-center`}
          >
            Buy Station <SortIcon column="buyStation" />
          </button>

          <button
            onClick={() => handleSort('sellStation')}
            className={`${headerButtonClass('sellStation')} text-center`}
          >
            Sell Station <SortIcon column="sellStation" />
          </button>

          <button
            onClick={() => handleSort('buyPrice')}
            className={`${headerButtonClass('buyPrice')} text-right font-mono`}
          >
            Buy Price <SortIcon column="buyPrice" />
          </button>

          <button
            onClick={() => handleSort('sellPrice')}
            className={`${headerButtonClass('sellPrice')} text-right font-mono`}
          >
            Sell Price <SortIcon column="sellPrice" />
          </button>

          <button
            onClick={() => handleSort('roi')}
            className={`${headerButtonClass('roi')} text-right font-mono`}
          >
            ROI% <SortIcon column="roi" />
          </button>

          <button
            onClick={() => handleSort('volumeAvailable')}
            className={`${headerButtonClass('volumeAvailable')} text-right font-mono`}
          >
            Quantity <SortIcon column="volumeAvailable" />
          </button>

          <div className="text-right text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
            Volume
          </div>
        </div>
      </div>

      {/* Scrollable Table Body */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const opportunity = sortedData[virtualRow.index];
            const isEven = virtualRow.index % 2 === 0;

            return (
              <div
                key={virtualRow.key}
                className={`absolute top-0 left-0 w-full ${
                  isEven ? 'bg-gray-800' : 'bg-gray-850'
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-8 gap-4 px-4 py-2 items-center h-full">
                  <div className="text-sm text-white truncate">
                    {opportunity.itemName}
                  </div>
                  <div className="text-sm text-gray-300 text-center font-mono">
                    {opportunity.buyStation}
                  </div>
                  <div className="text-sm text-gray-300 text-center font-mono">
                    {opportunity.sellStation}
                  </div>
                  <div className="text-sm text-gray-300 text-right font-mono">
                    {formatPrice(opportunity.buyPrice)}
                  </div>
                  <div className="text-sm text-gray-300 text-right font-mono">
                    {formatPrice(opportunity.sellPrice)}
                  </div>
                  <div className="text-sm text-eve-blue text-right font-mono font-semibold">
                    {formatROI(opportunity.roi)}
                  </div>
                  <div className="text-sm text-gray-300 text-right font-mono">
                    {opportunity.volumeAvailable.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300 text-right font-mono">
                    {formatVolume(opportunity.volumeAvailable)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 bg-gray-900 px-4 py-2 flex justify-between items-center">
        <p className="text-xs text-gray-400">
          Showing {sortedData.length.toLocaleString()} opportunities
        </p>
        <p className="text-xs text-gray-500">
          Sorted by {sortColumn} ({sortDirection})
        </p>
      </div>
    </div>
  );
}
```

### Verification Steps

1. **Test default sort (ROI descending):**
   ```
   1. Load page with opportunities
   2. Table should show highest ROI first
   3. ROI column header highlighted in EVE blue
   4. Down arrow icon visible
   ```

2. **Test sort toggle:**
   ```
   1. Click ROI% header
   2. Table re-sorts (lowest ROI first)
   3. Up arrow icon appears
   4. Click again → Back to descending
   ```

3. **Test different columns:**
   ```
   1. Click "Item" header → Alphabetical (A-Z)
   2. Click "Buy Price" header → Lowest to highest
   3. Click "Quantity" header → Smallest to largest
   4. Active column always shows arrow + blue color
   ```

4. **Test performance:**
   ```
   1. Load 10,000 rows
   2. Click column header
   3. Sort completes in < 200ms (check Network tab timing)
   4. No visible lag or stuttering
   ```

5. **Test scroll reset:**
   ```
   1. Scroll to middle of table
   2. Click column header to sort
   3. Table scrolls back to top
   4. First row visible
   ```

## Architecture Context

### Why useMemo for Sorting

**Performance Optimization:**
- `useMemo` caches sorted array
- Only re-sorts when data, sortColumn, or sortDirection changes
- Prevents re-sorting on every render

**Without useMemo:**
- Sorting would run on every render (slow)
- 10,000 rows × multiple renders = poor performance

**With useMemo:**
- Sorting runs once per data change
- <100ms sort time for 10K rows

### Why Client-Side Sorting

**Design Decision:**
- Sort entire dataset in browser (no API call)
- Instant response (<200ms requirement)
- Reduces server load

**Trade-offs:**
- Works for <50K rows (current max: ~10K)
- If dataset grows larger: Move to server-side sorting with pagination

**Server-Side When:**
- Dataset exceeds 50,000 rows
- Need to sort across multiple pages
- Memory constraints on client

### Sorting Algorithm

**JavaScript Array.sort:**
- Time complexity: O(n log n)
- 10,000 rows: ~100ms
- 50,000 rows: ~500ms (still under budget)

**Optimizations:**
- Single-pass sorting (not multi-column)
- Simple comparisons (no complex logic)
- String lowercasing cached implicitly by JS engine

### Virtual Scroller Integration

**Scroll Reset After Sort:**
- `parentRef.current.scrollTop = 0` scrolls to top
- Prevents confusion (user sorted, expects to see top results)
- Matches standard table UX patterns

**Virtualizer Compatibility:**
- Virtual scroller works with any array order
- Re-rendering optimized by React keys
- No performance penalty for sorted array

## Dev Notes

### Prerequisites

- Story 4.2 completed (OpportunityTable with virtual scrolling)
- @heroicons/react installed (for sort icons)

### No Additional Dependencies

- Uses React built-in hooks (useMemo, useState)
- Already has @heroicons/react from Story 3.2

### Common Issues and Solutions

**Issue: Sorting slow (> 200ms)**
- Solution: Ensure useMemo wrapping sort logic
- Check data array size (should be <50K)

**Issue: Table doesn't re-render after sort**
- Solution: Verify sortedData used in virtualizer count
- Check useMemo dependency array includes all sort state

**Issue: Sort icon not appearing**
- Solution: Ensure @heroicons/react installed
- Check conditional rendering logic (`sortColumn === column`)

**Issue: Clicking header doesn't sort**
- Solution: Check onClick handler attached to button
- Verify handleSort function called correctly

**Issue: Scroll doesn't reset to top**
- Solution: Check parentRef.current not null
- Ensure scrollTop = 0 called after state update

### Testing Sort Correctness

**Numerical sorts:**
```typescript
// Ascending: 1, 2, 3, 4, 5
// Descending: 5, 4, 3, 2, 1
```

**Alphabetical sorts:**
```typescript
// Ascending: Amarr, Dodixie, Jita, Rens
// Descending: Rens, Jita, Dodixie, Amarr
```

**Edge cases:**
```typescript
// Equal values: Should maintain stable sort order
// Null/undefined: Should handle gracefully
```

### Styling Customization

**Change active column color:**
```typescript
text-eve-blue → text-eve-gold  // Use gold instead of blue
```

**Adjust icon size:**
```typescript
h-4 w-4 → h-5 w-5  // Larger sort arrows
```

**Add hover effects:**
```typescript
hover:bg-gray-800  // Highlight column on hover
```

### Performance Expectations

**Sort Performance:**
- 100 rows: <10ms
- 1,000 rows: <50ms
- 10,000 rows: <200ms (meets requirement)
- 50,000 rows: <500ms (still usable)

**Re-render Performance:**
- Virtual scroller: Only re-renders visible rows
- Total re-render: <100ms
- No full table re-mount

### Next Steps

After this story is complete:
1. **Story 4.4:** Display data freshness timestamp
2. **Story 4.5:** Integrate table with region selectors
3. Consider multi-column sorting (future enhancement)

### References

**Source Documents:**
- [Architecture: Client-Side Sorting](../planning-artifacts/architecture.md)
- [PRD: Sorting Performance Target](../planning-artifacts/prd.md#runtime-performance)
- [Epic 4: Trading Opportunity Analysis & Display](../planning-artifacts/epics.md#epic-4-trading-opportunity-analysis--display)

**External Documentation:**
- React useMemo: https://react.dev/reference/react/useMemo
- JavaScript Array.sort: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- Heroicons: https://heroicons.com/

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
