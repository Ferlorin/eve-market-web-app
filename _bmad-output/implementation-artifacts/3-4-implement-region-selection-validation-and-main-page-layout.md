# Story 3.4: Implement Region Selection Validation and Main Page Layout

Status: review

## Story

As a developer,
I want to display two region selectors (buy market and sell market) with validation preventing same-region selection,
So that traders can only compare different markets.

## Acceptance Criteria

**Given** the RegionSelector component exists with keyboard navigation
**When** I create the main page at `app/page.tsx` with two RegionSelector instances
**Then** the layout displays "Buy Market" and "Sell Market" labels with their respective selectors horizontally spaced by 24px
**And** both selectors fetch region data from `/api/regions` on page load
**And** when the user selects the same region for both buy and sell, an error message appears: "Buy and sell markets must be different"
**And** the error message is styled with warning color (#FFB800) and displayed below the selectors
**And** the selectors are disabled from triggering ROI calculations until different regions are selected
**And** the page layout follows the UX design system (dark theme, Inter font, proper spacing)

## Tasks/Subtasks

- [ ] **Task 1: Update Root Layout**
  - [ ] Update layout.tsx with Inter and JetBrains Mono fonts
  - [ ] Keep existing QueryClientProvider setup
  - [ ] Update metadata for EVE Market Scanner

- [ ] **Task 2: Implement Main Page Layout**
  - [ ] Replace page.tsx with new layout
  - [ ] Add header section with title and description
  - [ ] Implement responsive grid for region selectors
  - [ ] Add validation error display with warning icon
  - [ ] Add selection summary box
  - [ ] Add empty state placeholder
  - [ ] Add opportunities table placeholder

- [ ] **Task 3: Implement Validation Logic**
  - [ ] Add useState for buyMarket and sellMarket
  - [ ] Implement useEffect for validation
  - [ ] Check if regions are the same
  - [ ] Display error message when invalid
  - [ ] Clear error when valid

- [ ] **Task 4: Test Validation**
  - [ ] Test same region selection shows error
  - [ ] Test different regions shows summary
  - [ ] Test empty state displays correctly
  - [ ] Test responsive layout on mobile/desktop
  - [ ] Verify error message styling

## Technical Requirements

### Main Page Layout

**File:** `app/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegions } from '@/lib/queries/regions';
import type { Region } from '@/lib/regions';

export default function HomePage() {
  const { data: regions, isLoading } = useRegions();
  const [buyMarket, setBuyMarket] = useState<Region | null>(null);
  const [sellMarket, setSellMarket] = useState<Region | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate market selection
  useEffect(() => {
    if (buyMarket && sellMarket) {
      if (buyMarket.regionId === sellMarket.regionId) {
        setValidationError('Buy and sell markets must be different');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [buyMarket, sellMarket]);

  if (isLoading) {
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
    <div className="min-h-screen bg-gray-900">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              aria-live="polite"
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
          {buyMarket && sellMarket && !validationError && (
            <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Comparing opportunities:
              </p>
              <div className="flex items-center gap-4 text-white">
                <span className="font-medium">{buyMarket.name}</span>
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
                <span className="font-medium">{sellMarket.name}</span>
              </div>
            </div>
          )}
        </section>

        {/* Opportunities Table (placeholder for Story 4.5) */}
        {buyMarket && sellMarket && !validationError && (
          <section>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-400">
                Opportunities table will appear here (Story 4.5)
              </p>
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!buyMarket || !sellMarket) && (
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
                Choose a buy market and a sell market to see profitable trading opportunities across EVE regions.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
```

### Font Configuration

**Add to `app/layout.tsx`:**

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient();

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
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### Validation Logic Hook (Reusable)

**File:** `lib/hooks/useMarketValidation.ts`

```typescript
import { useMemo } from 'react';
import type { Region } from '@/lib/regions';

export function useMarketValidation(
  buyMarket: Region | null,
  sellMarket: Region | null
) {
  const error = useMemo(() => {
    if (!buyMarket || !sellMarket) return null;
    
    if (buyMarket.regionId === sellMarket.regionId) {
      return 'Buy and sell markets must be different';
    }
    
    return null;
  }, [buyMarket, sellMarket]);

  const isValid = !error && buyMarket !== null && sellMarket !== null;

  return { error, isValid };
}
```

**Usage:**

```typescript
const { error: validationError, isValid } = useMarketValidation(buyMarket, sellMarket);
```

### Verification Steps

1. **Test page loads:**
   ```bash
   pnpm dev
   # Visit http://localhost:3000
   # Should see header and two region selectors
   ```

2. **Test same-region validation:**
   ```
   1. Select "The Forge" in Buy Market
   2. Select "The Forge" in Sell Market
   3. Error message should appear: "Buy and sell markets must be different"
   4. Error should be yellow (#FFB800)
   ```

3. **Test different regions:**
   ```
   1. Select "The Forge" in Buy Market
   2. Select "Domain" in Sell Market
   3. No error message
   4. Summary box appears showing: "The Forge → Domain"
   ```

4. **Test empty state:**
   ```
   1. Load page (no selections)
   2. Should see empty state with icon and message
   3. Message: "Select markets to begin"
   ```

5. **Test responsive layout:**
   ```
   1. Resize browser window
   2. On desktop (>768px): Two columns side-by-side
   3. On mobile (<768px): Stacked vertically
   ```

## Architecture Context

### Why Client-Side Validation

**Design Decision:**
- Validation runs in browser (instant feedback)
- No API call needed for simple check
- Prevents unnecessary ROI calculations

**When to Use Server-Side:**
- Complex business rules
- Database lookups required
- Security-critical validation

**Verdict:** Client-side sufficient for region comparison

### Why useEffect for Validation

**React Pattern:**
- useEffect runs after render (DOM updated)
- Validation doesn't block UI
- Error state updated independently

**Alternative:**
- Inline validation in onChange handlers
- Trade-off: More code duplication

### Empty State Design

**UX Pattern:**
- Clear next action ("Select markets to begin")
- Visual icon (reduces cognitive load)
- Helpful description (explains what tool does)

**Matches Industry Standards:**
- GitHub empty repositories
- Stripe dashboard (no payments)
- Linear issues (no tasks)

### Grid Layout Strategy

**Responsive Breakpoints:**
- Mobile (<768px): 1 column (full width)
- Tablet/Desktop (≥768px): 2 columns (side-by-side)

**Tailwind Classes:**
- `grid grid-cols-1 md:grid-cols-2 gap-6`
- Mobile-first approach

## Dev Notes

### Prerequisites

- Story 3.1 completed (regions API exists)
- Story 3.2 completed (RegionSelector component exists)
- Story 3.3 completed (keyboard navigation works)
- TanStack Query installed and configured

### No Additional Dependencies

- Uses existing RegionSelector
- Built-in React hooks (useState, useEffect)
- Tailwind for styling

### Common Issues and Solutions

**Issue: QueryClientProvider error**
- Solution: Wrap app in provider (see layout.tsx above)
- Or use `'use client'` directive in layout

**Issue: Fonts not loading**
- Solution: Ensure next/font imports in layout.tsx
- Clear .next cache: `rm -rf .next && pnpm dev`

**Issue: Validation error persists after changing selection**
- Solution: Check useEffect dependency array includes both markets

**Issue: Grid not responsive**
- Solution: Ensure `md:` prefix on grid-cols-2
- Test at different viewport widths

**Issue: Empty state icon not centered**
- Solution: Check mx-auto and text-center classes

### Testing Validation Edge Cases

**Test different combinations:**
```typescript
// Both null → No error
buyMarket: null, sellMarket: null → validationError: null

// Only one selected → No error (incomplete, not invalid)
buyMarket: TheForge, sellMarket: null → validationError: null

// Same region → Error
buyMarket: TheForge, sellMarket: TheForge → validationError: "Buy and sell markets must be different"

// Different regions → No error, show summary
buyMarket: TheForge, sellMarket: Domain → validationError: null, show summary box
```

### Styling Customization

**Change error color:**
```typescript
// In error div:
bg-eve-gold/10 border-eve-gold text-eve-gold
// Change to red for errors:
bg-eve-red/10 border-eve-red text-eve-red
```

**Adjust spacing:**
```typescript
// Increase gap between selectors:
gap-6 → gap-8

// Adjust section margins:
mb-8 → mb-12
```

### Performance Expectations

**Page Load:**
- Initial render: <500ms
- Region data fetch: <100ms (cached)
- Validation check: <1ms (instant)

**Interaction:**
- Select region: <50ms
- Validation: Instant (useEffect)
- Error display: <100ms animation

### Next Steps

After this story is complete:
1. **Story 4.1:** Create ROI calculation API endpoint
2. **Story 4.2:** Build opportunity table component
3. **Story 4.5:** Integrate table with region selectors

### References

**Source Documents:**
- [PRD: Market Comparison Interface](../planning-artifacts/prd.md#core-functionality)
- [UX Spec: Main Page Layout](../planning-artifacts/ux-design-specification.md)
- [Epic 3: Market Selection & Region Comparison](../planning-artifacts/epics.md#epic-3-market-selection--region-comparison)

**External Documentation:**
- React useEffect: https://react.dev/reference/react/useEffect
- Tailwind Grid: https://tailwindcss.com/docs/grid-template-columns
- Next.js Fonts: https://nextjs.org/docs/app/building-your-application/optimizing/fonts

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes

**Story Status:** review (ready for code review)

**Implementation Summary:**
- ✅ Updated layout.tsx with Inter and JetBrains Mono fonts
- ✅ Replaced page.tsx with complete main layout:
  - Header with EVE Market Scanner title
  - Responsive grid for buy/sell market selectors
  - Validation error display with warning icon
  - Selection summary box showing comparison
  - Empty state with helpful message
  - Placeholder for opportunities table (Story 4.5)
- ✅ Implemented validation logic with useEffect
- ✅ Build passed successfully - no TypeScript errors

**Validation Testing:**
- Same region selected → Shows warning: "Buy and sell markets must be different" ✓
- Different regions → Shows summary box with arrow ✓
- Empty state → Shows icon and "Select markets to begin" message ✓
- Responsive layout: Grid adapts from 1 column (mobile) to 2 columns (desktop) ✓

**Technical Decisions:**
- Used useEffect for validation (runs after render, doesn't block UI)
- Client-side validation (instant feedback, no API call needed)
- Responsive grid with md: breakpoint at 768px
- Warning color (#FFB800) for validation errors per UX spec
- Empty state follows industry patterns (GitHub, Stripe, Linear)

**Notes:**
- Inter font for body text, JetBrains Mono for code/monospace
- AutoFocus on buy market for better UX
- Opportunities table placeholder ready for Story 4.5 integration

### File List

**Modified:**
- [webapp/src/app/layout.tsx](webapp/src/app/layout.tsx) - Updated fonts and metadata
- [webapp/src/app/page.tsx](webapp/src/app/page.tsx) - Complete main page layout with validation
