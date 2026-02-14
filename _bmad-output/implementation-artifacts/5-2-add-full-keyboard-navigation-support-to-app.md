# Story 5.2: Add Full Keyboard Navigation Support to App

Status: ready-for-dev

## Story

As a keyboard-only user,
I want to navigate the entire app using only keyboard controls with visible focus indicators,
So that I can use the app efficiently without a mouse.

## Acceptance Criteria

**Given** the app is fully functional for mouse users
**When** I implement comprehensive keyboard navigation patterns
**Then** all interactive elements (buttons, inputs, dropdowns) are reachable via Tab key in logical order
**And** focus indicators are clearly visible on all focusable elements (2px eve-blue outline)
**And** Shift+Tab moves focus backward in reverse order
**And** Enter/Space activates buttons and submit actions
**And** Escape dismisses dropdowns and closes modals
**And** Arrow keys navigate within dropdowns (already implemented in Story 3.3)
**And** focus is trapped within modal dialogs when open
**And** focus returns to trigger element after closing modals/dropdowns
**And** skip-to-content link is available for screen readers to bypass header navigation

## Technical Requirements

### Focus-Visible CSS Updates

**Update `app/globals.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Existing theme variables... */

/* Enhanced focus-visible styles */
:focus {
  outline: none; /* Remove default outline */
}

:focus-visible {
  outline: 2px solid #33B5E5; /* eve-blue */
  outline-offset: 2px;
  border-radius: 4px;
}

/* Specific focus styles for buttons */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #33B5E5;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(51, 181, 229, 0.2);
}

/* Focus within inputs */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #33B5E5;
  outline-offset: 0;
  border-color: #33B5E5;
  box-shadow: 0 0 0 3px rgba(51, 181, 229, 0.15);
}

/* Focus within Combobox dropdown items */
[role="option"]:focus-visible {
  outline: 2px solid #33B5E5;
  outline-offset: -2px;
  background-color: rgba(51, 181, 229, 0.15);
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #33B5E5;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 100;
  transition: top 0.2s ease;
}

.skip-to-content:focus {
  top: 8px;
  outline: 2px solid white;
  outline-offset: 2px;
}
```

### Skip-to-Content Link

**Update `app/layout.tsx`:**

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata = {
  title: 'EVE Market Scanner',
  description: 'Find profitable trading opportunities across EVE Online regions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Main Content ID Anchor

**Update `app/page.tsx`:**

```typescript
export default function HomePage() {
  // ... existing state and hooks

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              EVE Market Scanner
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Find profitable trading opportunities across regions
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content with ID for skip link */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Region selection section */}
          <section aria-labelledby="region-selection-heading">
            <h2 id="region-selection-heading" className="sr-only">
              Select Trading Regions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="buy-region" className="block text-sm font-medium mb-2">
                  Buy From (Low Price Region)
                </label>
                <RegionSelector
                  id="buy-region"
                  value={buyMarket}
                  onChange={setBuyMarket}
                  placeholder="Select buy region..."
                  aria-label="Select region to buy items from"
                />
              </div>

              <div>
                <label htmlFor="sell-region" className="block text-sm font-medium mb-2">
                  Sell To (High Price Region)
                </label>
                <RegionSelector
                  id="sell-region"
                  value={sellMarket}
                  onChange={setSellMarket}
                  placeholder="Select sell region..."
                  aria-label="Select region to sell items to"
                />
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <div 
                className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <p className="text-eve-red text-sm font-medium">
                  {validationError}
                </p>
              </div>
            )}

            {/* Selection summary */}
            {buyMarket && sellMarket && !validationError && (
              <div className="mb-6 p-4 bg-eve-blue/10 border border-eve-blue rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Finding opportunities: Buy from{' '}
                  <span className="font-mono font-semibold text-eve-blue">
                    {buyMarket.name}
                  </span>
                  {' → '}
                  <span className="font-mono font-semibold text-eve-blue">
                    {sellMarket.name}
                  </span>
                </p>
              </div>
            )}
          </section>

          {/* Opportunity table section */}
          <section aria-labelledby="opportunities-heading">
            <h2 id="opportunities-heading" className="text-xl font-semibold mb-4">
              Trading Opportunities
            </h2>
            
            {isLoading && (
              <div className="flex justify-center items-center h-64" role="status">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eve-blue"></div>
                <span className="sr-only">Loading opportunities...</span>
              </div>
            )}

            {error && (
              <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center" role="alert">
                <p className="text-red-500 mb-2">Failed to load opportunities</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {error.message}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 bg-eve-blue text-white rounded-lg hover:bg-eve-blue-dark
                    focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            {opportunities && opportunities.length === 0 && (
              <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No profitable trading opportunities found for this region pair.
                </p>
              </div>
            )}

            {opportunities && opportunities.length > 0 && (
              <OpportunityTable opportunities={opportunities} />
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DataFreshness />
        </div>
      </footer>
    </div>
  );
}
```

### Enhanced RegionSelector with ARIA

**Update `components/RegionSelector.tsx`:**

```typescript
'use client';

import { Combobox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRegions } from '@/lib/queries/regions';
import { useMemo, useState } from 'react';

interface Region {
  regionId: number;
  name: string;
}

interface RegionSelectorProps {
  id?: string;
  value: Region | null;
  onChange: (region: Region | null) => void;
  placeholder?: string;
  'aria-label'?: string;
}

export function RegionSelector({
  id,
  value,
  onChange,
  placeholder = 'Select a region...',
  'aria-label': ariaLabel,
}: RegionSelectorProps) {
  const { data: regions, isLoading } = useRegions();
  const [query, setQuery] = useState('');

  // Fuzzy search
  const filteredRegions = useMemo(() => {
    if (!regions || query === '') return regions || [];

    const lowerQuery = query.toLowerCase();
    return regions.filter((region) => {
      const lowerName = region.name.toLowerCase();
      
      // Substring match
      if (lowerName.includes(lowerQuery)) return true;

      // Character sequence match (e.g., "fnt" matches "Fountain")
      let queryIndex = 0;
      for (let i = 0; i < lowerName.length && queryIndex < lowerQuery.length; i++) {
        if (lowerName[i] === lowerQuery[queryIndex]) {
          queryIndex++;
        }
      }
      return queryIndex === lowerQuery.length;
    });
  }, [regions, query]);

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800">
        <span className="text-gray-500">Loading regions...</span>
      </div>
    );
  }

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          id={id}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 
            rounded-lg bg-white dark:bg-gray-800 
            text-gray-900 dark:text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2"
          displayValue={(region: Region | null) => region?.name || ''}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
        />
        <Combobox.Button 
          className="absolute inset-y-0 right-0 flex items-center pr-2"
          aria-label="Toggle region dropdown"
        >
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Combobox.Button>

        <Combobox.Options
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto 
            rounded-lg bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-700 
            shadow-lg scrollbar-thin
            focus:outline-none"
        >
          {filteredRegions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500" role="option" aria-disabled="true">
              No regions found
            </div>
          ) : (
            filteredRegions.map((region) => (
              <Combobox.Option
                key={region.regionId}
                value={region}
                className={({ active, selected }) =>
                  `cursor-pointer px-4 py-2 flex items-center justify-between
                  ${active ? 'bg-eve-blue/20 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
                  ${selected ? 'font-semibold' : 'font-normal'}`
                }
              >
                {({ selected }) => (
                  <>
                    <span>{region.name}</span>
                    {selected && (
                      <CheckIcon className="h-5 w-5 text-eve-blue" aria-hidden="true" />
                    )}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
}
```

### Enhanced OpportunityTable with Keyboard Sorting

**Update `components/OpportunityTable.tsx`:**

```typescript
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

// ... existing Opportunity interface and formatters

export function OpportunityTable({ opportunities }: OpportunityTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<keyof Opportunity>('roi');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting logic
  const sortedData = useMemo(() => {
    const sorted = [...opportunities].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return bStr < aStr ? -1 : bStr > aStr ? 1 : 0;
      }
    });
    return sorted;
  }, [opportunities, sortColumn, sortDirection]);

  // Virtualization
  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSort = (column: keyof Opportunity) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      const numericColumns: Array<keyof Opportunity> = ['roi', 'buyPrice', 'sellPrice', 'profitPerUnit', 'volume'];
      setSortDirection(numericColumns.includes(column) ? 'desc' : 'asc');
    }

    // Reset scroll position
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  };

  const SortButton = ({ column, label }: { column: keyof Opportunity; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSort(column);
        }
      }}
      className="flex items-center gap-1 hover:text-eve-blue transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
        p-1 -m-1 rounded"
      aria-label={`Sort by ${label} ${sortColumn === column ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
      aria-sort={sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      {sortColumn === column && (
        sortDirection === 'asc' ? (
          <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
        )
      )}
    </button>
  );

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-semibold text-sm">
        <SortButton column="itemName" label="Item Name" />
        <SortButton column="roi" label="ROI %" />
        <SortButton column="buyPrice" label="Buy Price" />
        <SortButton column="sellPrice" label="Sell Price" />
        <SortButton column="profitPerUnit" label="Profit/Unit" />
        <SortButton column="volume" label="Volume" />
        <SortButton column="buyRegion" label="Buy Region" />
        <SortButton column="sellRegion" label="Sell Region" />
      </div>

      {/* Virtual scrolling body */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto scrollbar-thin"
        role="grid"
        aria-label="Trading opportunities"
        aria-rowcount={sortedData.length}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const opportunity = sortedData[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid grid-cols-8 gap-4 px-4 py-3 text-sm border-b border-gray-200 dark:border-gray-700
                  ${virtualRow.index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-850'}`}
                role="row"
                aria-rowindex={virtualRow.index + 1}
              >
                <div className="truncate" title={opportunity.itemName} role="gridcell">
                  {opportunity.itemName}
                </div>
                <div className="font-mono text-eve-gold font-semibold" role="gridcell">
                  {formatROI(opportunity.roi)}
                </div>
                <div className="font-mono text-gray-700 dark:text-gray-300" role="gridcell">
                  {formatPrice(opportunity.buyPrice)}
                </div>
                <div className="font-mono text-gray-700 dark:text-gray-300" role="gridcell">
                  {formatPrice(opportunity.sellPrice)}
                </div>
                <div className="font-mono text-green-500" role="gridcell">
                  {formatPrice(opportunity.profitPerUnit)}
                </div>
                <div className="font-mono text-gray-700 dark:text-gray-300" role="gridcell">
                  {formatVolume(opportunity.volume)}
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs truncate" title={opportunity.buyRegion} role="gridcell">
                  {opportunity.buyRegion}
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs truncate" title={opportunity.sellRegion} role="gridcell">
                  {opportunity.sellRegion}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### Verification Steps

1. **Test Tab order:**
   ```
   1. Load page, press Tab
   2. Focus moves: Skip link → Theme toggle → Buy region → Sell region → Table sort buttons → Footer
   3. Verify logical left-to-right, top-to-bottom order
   ```

2. **Test focus indicators:**
   ```
   1. Tab through all interactive elements
   2. Each should show 2px blue outline
   3. Outline visible in both light/dark themes
   4. No elements missing focus styles
   ```

3. **Test skip-to-content:**
   ```
   1. Load page, press Tab
   2. First focus: "Skip to content" link appears
   3. Press Enter → Focus jumps to main content
   4. Verify header bypassed
   ```

4. **Test keyboard activation:**
   ```
   1. Tab to theme toggle, press Enter → Theme switches
   2. Tab to region selector, press Enter → Opens dropdown
   3. Arrow down → Highlights first region
   4. Press Enter → Selects region
   ```

5. **Test Escape dismissal:**
   ```
   1. Open region dropdown
   2. Press Escape → Dropdown closes
   3. Focus returns to input
   ```

6. **Test screen reader announcements:**
   ```
   1. Enable NVDA/JAWS
   2. Navigate to region selector → Announces "Select region to buy items from"
   3. Navigate to table → Announces "Trading opportunities, grid, 100 rows"
   4. Navigate to sort button → Announces "Sort by ROI % descending"
   ```

## Architecture Context

### Why Skip-to-Content Link

**Accessibility Best Practice:**
- Screen reader users don't need to tab through header on every page
- Saves 3-5 Tab presses per page load
- Common pattern on accessible websites

**Implementation:**
- Hidden by default (top: -40px)
- Appears on focus (top: 8px)
- Links to #main-content anchor

### Why :focus-visible over :focus

**Better UX:**
- `:focus` shows outline on mouse click (ugly, distracting)
- `:focus-visible` only shows outline for keyboard users
- Automatic browser detection

**Browser Support:**
- Chrome 86+, Firefox 85+, Safari 15.4+
- Covers >95% of users

### ARIA Roles and Labels

**Why explicit roles:**
- Grid role tells screen readers: "This is a table"
- Option role tells screen readers: "This is selectable"
- Alert role tells screen readers: "Read this immediately"

**Why aria-label:**
- Provides context beyond visible label
- "Select region to buy items from" more helpful than just "Select region"

### Tab Index Management

**tabIndex={-1} on main:**
- Makes main focusable programmatically
- Skip link can set focus
- Not in normal Tab order

**No tabIndex on divs:**
- Only interactive elements (buttons, inputs) in Tab order
- Non-interactive content not focusable

## Dev Notes

### Prerequisites

- @heroicons/react installed (Story 3.2)
- Headless UI Combobox (Story 3.2)
- Theme toggle button (Story 5.1)

### No Additional Dependencies

- Uses native browser focus management
- Uses HTML5 semantic elements
- Uses ARIA attributes (standard)

### Common Issues and Solutions

**Issue: Focus outline not visible**
- Solution: Check :focus-visible in globals.css
- Verify browser supports :focus-visible

**Issue: Tab order illogical**
- Solution: Ensure elements in DOM order match visual order
- Avoid positive tabIndex values (use 0 or -1 only)

**Issue: Skip link doesn't work**
- Solution: Verify #main-content ID exists
- Check tabIndex={-1} on main element

**Issue: Screen reader not announcing**
- Solution: Add aria-label to inputs
- Add role="alert" to error messages
- Add aria-live="polite" to dynamic content

**Issue: Focus lost after dropdown closes**
- Solution: Headless UI handles this automatically
- If custom dropdown, manually focus trigger

### Testing Tips

**Keyboard-only testing:**
```
1. Unplug mouse
2. Use only Tab, Shift+Tab, Enter, Escape, Arrow keys
3. Can you complete all tasks?
```

**Screen reader testing:**
- Windows: NVDA (free)
- Mac: VoiceOver (built-in, Cmd+F5)
- Chrome: ChromeVox extension

### Performance Expectations

**Focus changes:**
- <1ms (instant)
- No JavaScript needed (CSS only)

**Skip link:**
- <5ms focus jump
- Smooth scroll optional (behavior: 'smooth')

### Next Steps

After this story is complete:
1. **Story 5.3:** Apply WCAG AA accessibility standards
2. **Story 5.4:** Add font scaling feature

### References

**Source Documents:**
- [PRD: Keyboard Navigation](../planning-artifacts/prd.md#accessibility-level)
- [UX Spec: Keyboard Patterns](../planning-artifacts/ux-design-specification.md)
- [Epic 5: User Experience & Accessibility](../planning-artifacts/epics.md#epic-5-user-experience--accessibility)

**External Documentation:**
- MDN :focus-visible: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- MDN Skip Links: https://webaim.org/techniques/skipnav/
- ARIA Practices: https://www.w3.org/WAI/ARIA/apg/

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
