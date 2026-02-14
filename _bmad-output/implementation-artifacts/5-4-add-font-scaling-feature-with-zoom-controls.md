# Story 5.4: Add Font Scaling Feature with Zoom Controls

Status: ready-for-dev

## Story

As a user with vision challenges,
I want to adjust the text size across the entire app (75%/100%/125%/150%),
So that I can read all content comfortably without browser zoom.

## Acceptance Criteria

**Given** the app has text of varying sizes
**When** I implement font scaling controls
**Then** a font size picker appears in the header with 4 preset options: Small (75%), Normal (100%), Large (125%), X-Large (150%)
**And** clicking any option instantly scales all text proportionally using CSS rem units
**And** the selected scale is stored in localStorage as `fontSize: number` (75, 100, 125, or 150)
**And** the font scale persists across page refreshes and browser sessions
**And** the default scale is 100% (Normal)
**And** all layouts remain intact at all scale levels (no text overflow, no broken grids)
**And** the table remains readable at 150% scale (may require horizontal scroll)

## Technical Requirements

### Font Scale Context and Hook

**File:** `lib/contexts/FontScaleContext.tsx`

```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type FontScale = 75 | 100 | 125 | 150;

interface FontScaleContextType {
  scale: FontScale;
  setScale: (scale: FontScale) => void;
}

const FontScaleContext = createContext<FontScaleContextType | undefined>(undefined);

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<FontScale>(100);
  const [mounted, setMounted] = useState(false);

  // Initialize font scale on mount
  useEffect(() => {
    setMounted(true);

    // Check localStorage
    const storedScale = localStorage.getItem('fontSize');
    if (storedScale) {
      const parsedScale = parseInt(storedScale, 10);
      if ([75, 100, 125, 150].includes(parsedScale)) {
        setScaleState(parsedScale as FontScale);
        document.documentElement.style.fontSize = `${parsedScale}%`;
      }
    }
  }, []);

  const setScale = (newScale: FontScale) => {
    setScaleState(newScale);
    document.documentElement.style.fontSize = `${newScale}%`;
    localStorage.setItem('fontSize', newScale.toString());
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <FontScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (context === undefined) {
    throw new Error('useFontScale must be used within FontScaleProvider');
  }
  return context;
}
```

### Font Scale Picker Component

**File:** `components/FontScalePicker.tsx`

```typescript
'use client';

import { useFontScale } from '@/lib/contexts/FontScaleContext';
import { CheckIcon } from '@heroicons/react/24/solid';

const fontSizes = [
  { value: 75 as const, label: 'Small', description: '75%' },
  { value: 100 as const, label: 'Normal', description: '100%' },
  { value: 125 as const, label: 'Large', description: '125%' },
  { value: 150 as const, label: 'X-Large', description: '150%' },
];

export function FontScalePicker() {
  const { scale, setScale } = useFontScale();

  return (
    <div className="relative">
      <label 
        htmlFor="font-scale" 
        className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
      >
        Text Size
      </label>
      <div 
        role="radiogroup" 
        aria-label="Select text size"
        className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-300 dark:border-gray-700"
      >
        {fontSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => setScale(size.value)}
            role="radio"
            aria-checked={scale === size.value}
            aria-label={`${size.label} text size (${size.description})`}
            className={`
              flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
              min-h-[36px]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
              ${
                scale === size.value
                  ? 'bg-eve-blue text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <span className="flex items-center justify-center gap-1">
              {scale === size.value && (
                <CheckIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {size.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Update Layout with Font Scale Provider

**Update `app/layout.tsx`:**

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { FontScaleProvider } from '@/lib/contexts/FontScaleContext';
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
          <FontScaleProvider>
            {children}
          </FontScaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Update Header with Font Scale Picker

**Update `app/page.tsx` header:**

```typescript
import { ThemeToggle } from '@/components/ThemeToggle';
import { FontScalePicker } from '@/components/FontScalePicker';

// In the header:
<header className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          EVE Market Scanner
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Find profitable trading opportunities across regions
        </p>
      </div>
      
      <div className="flex items-start gap-4">
        <FontScalePicker />
        <ThemeToggle />
      </div>
    </div>
  </div>
</header>
```

### CSS Updates for Rem-Based Scaling

**Update `app/globals.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Base font size (16px = 100%) */
html {
  font-size: 100%; /* Default, will be overridden by JS */
}

/* Ensure all text uses rem units for proportional scaling */
body {
  font-size: 1rem; /* 16px at 100% */
}

h1 {
  font-size: 1.5rem; /* 24px at 100% */
}

h2 {
  font-size: 1.25rem; /* 20px at 100% */
}

h3 {
  font-size: 1.125rem; /* 18px at 100% */
}

/* Text size classes in rem */
.text-xs {
  font-size: 0.75rem; /* 12px at 100% */
}

.text-sm {
  font-size: 0.875rem; /* 14px at 100% */
}

.text-base {
  font-size: 1rem; /* 16px at 100% */
}

.text-lg {
  font-size: 1.125rem; /* 18px at 100% */
}

.text-xl {
  font-size: 1.25rem; /* 20px at 100% */
}

.text-2xl {
  font-size: 1.5rem; /* 24px at 100% */
}

/* Icon sizes should NOT scale (remain pixel-based) */
.icon-fixed {
  width: 20px !important;
  height: 20px !important;
}

/* Fixed height elements (buttons, inputs) */
button,
input,
select {
  /* Heights remain in pixels for consistency */
  min-height: 44px; /* Touch target unchanged */
}

/* Table row heights fixed for virtualization */
.virtual-row {
  height: 48px; /* Fixed for virtualizer estimateSize */
}

/* Prevent horizontal overflow at large scales */
.max-w-7xl {
  max-width: 80rem; /* Scales with font size */
}

/* Enable horizontal scroll for table at large scales */
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  /* Smaller screens: reduce max scale */
  html[style*="font-size: 150%"] {
    font-size: 125% !important;
  }
}
```

### Update OpportunityTable for Large Scales

**Update `components/OpportunityTable.tsx`:**

```typescript
export function OpportunityTable({ opportunities }: OpportunityTableProps) {
  // ... existing state and hooks

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

      {/* Virtual scrolling body with horizontal scroll support */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto scrollbar-thin table-container"
        role="grid"
        aria-label="Trading opportunities"
        aria-rowcount={sortedData.length}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            minWidth: '900px', // Prevent column squishing at large scales
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
                className={`grid grid-cols-8 gap-4 px-4 py-3 text-sm border-b border-gray-200 dark:border-gray-700 virtual-row
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

1. **Test all scale levels:**
   ```
   1. Click "Small" (75%) → Text shrinks
   2. Click "Normal" (100%) → Text returns to default
   3. Click "Large" (125%) → Text enlarges
   4. Click "X-Large" (150%) → Text enlarges more
   ```

2. **Test proportional scaling:**
   ```
   1. Set to 150%
   2. All text should scale proportionally
   3. Headers larger, body text larger
   4. Ratios preserved (h1 still 1.5x body)
   ```

3. **Test persistence:**
   ```
   1. Set to Large (125%)
   2. Refresh page → Still Large
   3. Close browser, reopen → Still Large
   4. Check localStorage: fontSize=125
   ```

4. **Test layout integrity:**
   ```
   1. Set to 150%
   2. Check for text overflow → Should truncate with ellipsis
   3. Check grid layouts → Should remain intact
   4. Check buttons → Should not break (fixed height)
   ```

5. **Test table scrolling:**
   ```
   1. Set to 150%
   2. Table may require horizontal scroll
   3. Scroll should be smooth
   4. All columns visible (with scroll)
   ```

6. **Test mobile responsiveness:**
   ```
   1. Open DevTools mobile emulation
   2. Set to 150%
   3. Check for overflow issues
   4. Text should wrap, not overflow
   ```

## Architecture Context

### Why CSS rem Units

**rem vs px:**
- `rem`: Relative to root font-size (scalable)
- `px`: Absolute (not scalable)
- `em`: Relative to parent (cascading issues)

**Strategy:**
- Text sizes: Use rem (scales with root)
- Fixed elements: Use px (buttons, icons)
- Spacing: Use rem for consistency

### Why 75%/100%/125%/150% Scales

**WCAG SC 1.4.4 (Resize Text):**
- Text must be resizable up to 200%
- We support 150% (sufficient for most users)
- Browser zoom still available for 200%+

**User Research:**
- 75%: Power users with large screens
- 100%: Default (most users)
- 125%: Mild vision impairment
- 150%: Moderate vision impairment

### Fixed Height Elements

**Why buttons/inputs don't scale:**
- Touch targets must remain ≥44px
- Virtualization requires fixed row heights
- Icons look best at native sizes

**What scales:**
- Padding and margins (rem)
- Text content (rem)
- Layout widths (rem or %)

### localStorage Persistence

**Why client-side only:**
- Preference personal to device
- No account system needed
- Instant read (no network)

**Default 100%:**
- Matches browser default
- No surprise scaling

### Horizontal Scroll at Large Scales

**Acceptable Trade-off:**
- 150% scale = very large text
- Table has 8 columns (lots of data)
- Horizontal scroll better than column squishing
- Alternative: Hide less important columns (complex)

## Dev Notes

### Prerequisites

- React Context API (built-in)
- localStorage (browser API)
- ThemeProvider from Story 5.1

### No Additional Dependencies

- Uses vanilla React + CSS

### Common Issues and Solutions

**Issue: Text overlaps at 150%**
- Solution: Check container widths
- Use `truncate` class for long text
- Add `overflow-x-auto` to tables

**Issue: Buttons too large at 150%**
- Solution: Use `min-h-[44px]` (px, not rem)
- Button height doesn't scale
- Padding scales (text centered)

**Issue: Icons too large**
- Solution: Icons use pixel sizes (h-5 w-5)
- Don't convert to rem
- Icons should not scale with text

**Issue: localStorage not persisting**
- Solution: Check browser privacy settings
- Incognito blocks localStorage
- Check for typos in key name

**Issue: Layout breaks at 150%**
- Solution: Test all breakpoints
- Use `max-w-full` to prevent overflow
- Add `overflow-hidden` to containers

### Testing on Real Devices

**Mobile:**
```
1. iOS Safari: Settings → Accessibility → Larger Text
2. Android Chrome: Settings → Accessibility → Text scaling
3. Test with native browser scaling + our scaling
```

**Desktop:**
```
1. Test with browser zoom (Ctrl/Cmd +)
2. Our scale should work with browser zoom
3. Combined scaling may require horizontal scroll
```

### Performance Expectations

**Scale change:**
- DOM update: <10ms
- Reflow/repaint: <50ms
- Total perceived: <100ms (instant)

**No performance degradation:**
- Same number of DOM nodes
- Same virtualization efficiency

### Accessibility Benefits

**WCAG 1.4.4 Compliance:**
- ✅ Text resizable up to 150%
- ✅ No loss of content/functionality
- ✅ No horizontal scroll needed (except table at 150%)

**User benefits:**
- Vision impairment: Larger text
- High-DPI displays: Reduce eye strain
- Personal preference: Control over readability

### Next Steps

After this story is complete:
1. **Epic 6:** System Operations & Monitoring
2. **Story 6.1:** Implement structured JSON logging

### References

**Source Documents:**
- [PRD: Font Scaling Requirement](../planning-artifacts/prd.md#accessibility-level)
- [UX Spec: Text Scaling](../planning-artifacts/ux-design-specification.md)
- [Epic 5: User Experience & Accessibility](../planning-artifacts/epics.md#epic-5-user-experience--accessibility)

**External Documentation:**
- WCAG 1.4.4 Resize Text: https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html
- CSS rem units: https://developer.mozilla.org/en-US/docs/Web/CSS/length#rem
- Font size accessibility: https://www.24a11y.com/2019/pixels-vs-ems-users-do-change-font-size/

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
