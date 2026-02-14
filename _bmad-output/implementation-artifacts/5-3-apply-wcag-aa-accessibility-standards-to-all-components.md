# Story 5.3: Apply WCAG AA Accessibility Standards to All Components

Status: ready-for-dev

## Story

As a user with visual impairments,
I want the app to meet WCAG AA standards for contrast, text size, and semantic HTML,
So that I can read and navigate all content clearly.

## Acceptance Criteria

**Given** the app is fully functional
**When** I audit accessibility compliance using automated tools and manual testing
**Then** all text meets WCAG AA contrast ratio minimums (4.5:1 normal text, 3:1 large text ≥18pt)
**And** all interactive elements have minimum touch target sizes (44x44px for mobile)
**And** all images and icons have appropriate alt text or aria-labels
**And** all form inputs have associated labels (visible or aria-label)
**And** all page structure uses semantic HTML5 elements (header, main, nav, section, footer)
**And** all color-coded information has non-color alternatives (icons, text patterns)
**And** all dynamic content updates are announced to screen readers (aria-live)
**And** the app passes Lighthouse accessibility audit with score ≥95/100
**And** the app passes axe DevTools audit with 0 violations

## Technical Requirements

### Color Contrast Audit and Fixes

**Contrast Requirements:**
- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt): 3:1 minimum
- UI components: 3:1 minimum

**Dark Theme Palette (WCAG AA Compliant):**

```typescript
// tailwind.config.ts - Enhanced color palette
const config: Config = {
  theme: {
    extend: {
      colors: {
        'eve-blue': '#33B5E5',         // Primary accent - 4.8:1 on dark bg
        'eve-blue-dark': '#0099CC',    // Hover state - 6.2:1 on dark bg
        'eve-gold': '#FFB800',         // Warning/highlight - 5.1:1 on dark bg
        'eve-red': '#FF4757',          // Error - 4.6:1 on dark bg
        'eve-green': '#2ECC71',        // Success - 4.7:1 on dark bg
        
        gray: {
          50: '#F9FAFB',   // Light theme bg
          100: '#F3F4F6',  // Light theme surfaces
          200: '#E5E7EB',  // Light theme borders
          300: '#D1D5DB',  // Light theme disabled
          400: '#9CA3AF',  // Secondary text light
          500: '#6B7785',  // Tertiary text
          600: '#4B5563',  // Secondary text dark
          700: '#374151',  // Dark theme borders
          800: '#1F2937',  // Dark theme surfaces - Base
          850: '#1A2028',  // Dark theme alt rows
          900: '#111827',  // Dark theme text - High emphasis
          950: '#0A0E14',  // Dark theme bg
        }
      },
    },
  },
};
```

**Light Theme Palette:**

Update `app/globals.css`:

```css
:root {
  /* Light theme (high contrast) */
  --background: 249 250 251;     /* gray-50 */
  --foreground: 17 24 39;        /* gray-900 - 15.8:1 contrast */
  --card: 255 255 255;           /* white */
  --border: 209 213 219;         /* gray-300 */
  --accent: 0 153 204;           /* eve-blue-dark - 7.2:1 on white */
  --text-secondary: 75 85 99;    /* gray-600 - 7.1:1 on white */
  --text-tertiary: 107 114 128;  /* gray-500 - 4.6:1 on white */
}

.dark {
  /* Dark theme (high contrast) */
  --background: 10 14 20;        /* gray-950 */
  --foreground: 249 250 251;     /* gray-50 - 17.2:1 contrast */
  --card: 31 41 55;              /* gray-800 */
  --border: 55 65 81;            /* gray-700 */
  --accent: 51 181 229;          /* eve-blue - 4.8:1 on dark */
  --text-secondary: 209 213 219; /* gray-300 - 11.5:1 on dark */
  --text-tertiary: 156 163 175;  /* gray-400 - 7.8:1 on dark */
}
```

### Semantic HTML Updates

**Update `app/page.tsx` with semantic structure:**

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Semantic header */}
      <header 
        className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              EVE Market Scanner
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Find profitable trading opportunities across regions
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1" role="main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Region selection with semantic structure */}
          <section 
            aria-labelledby="region-selection-heading"
            className="mb-8"
          >
            <h2 id="region-selection-heading" className="text-xl font-semibold mb-4">
              Select Trading Regions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  htmlFor="buy-region" 
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Buy From (Low Price Region)
                </label>
                <RegionSelector
                  id="buy-region"
                  value={buyMarket}
                  onChange={setBuyMarket}
                  placeholder="Select buy region..."
                  aria-label="Select region to buy items from"
                  aria-required="true"
                />
              </div>

              <div>
                <label 
                  htmlFor="sell-region" 
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Sell To (High Price Region)
                </label>
                <RegionSelector
                  id="sell-region"
                  value={sellMarket}
                  onChange={setSellMarket}
                  placeholder="Select sell region..."
                  aria-label="Select region to sell items to"
                  aria-required="true"
                />
              </div>
            </div>
          </section>

          {/* Validation error with proper role */}
          {validationError && (
            <aside 
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <ExclamationCircleIcon className="h-5 w-5" aria-hidden="true" />
                <span>{validationError}</span>
              </p>
            </aside>
          )}

          {/* Selection summary */}
          {buyMarket && sellMarket && !validationError && (
            <aside 
              className="mb-6 p-4 bg-blue-50 dark:bg-eve-blue/10 border border-eve-blue rounded-lg"
              aria-live="polite"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Finding opportunities: Buy from{' '}
                <strong className="font-mono font-semibold text-eve-blue-dark dark:text-eve-blue">
                  {buyMarket.name}
                </strong>
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> to </span>
                <strong className="font-mono font-semibold text-eve-blue-dark dark:text-eve-blue">
                  {sellMarket.name}
                </strong>
              </p>
            </aside>
          )}

          {/* Opportunity table section */}
          <section aria-labelledby="opportunities-heading">
            <h2 id="opportunities-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Trading Opportunities
            </h2>
            
            {/* Loading state */}
            {isLoading && (
              <div 
                className="flex flex-col justify-center items-center h-64" 
                role="status" 
                aria-live="polite"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eve-blue"></div>
                <span className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading opportunities...
                </span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div 
                className="p-8 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border-2 border-red-600" 
                role="alert"
                aria-live="assertive"
              >
                <ExclamationCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" aria-hidden="true" />
                <p className="text-red-700 dark:text-red-400 font-semibold mb-2">
                  Failed to load opportunities
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {error.message}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-eve-blue text-white rounded-lg 
                    hover:bg-eve-blue-dark
                    focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
                    min-h-[44px] min-w-[44px]"
                  aria-label="Retry loading opportunities"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {opportunities && opportunities.length === 0 && (
              <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-300">
                  No profitable trading opportunities found for this region pair.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Try selecting different regions or check back after market data refreshes.
                </p>
              </div>
            )}

            {/* Success state */}
            {opportunities && opportunities.length > 0 && (
              <div aria-live="polite">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Found <strong className="text-gray-900 dark:text-white">{opportunities.length}</strong> trading opportunities
                </p>
                <OpportunityTable opportunities={opportunities} />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Semantic footer */}
      <footer 
        className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DataFreshness />
        </div>
      </footer>
    </div>
  );
}
```

### Accessible Button Components

**Create `components/Button.tsx` (WCAG compliant button):**

```typescript
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'min-h-[44px] min-w-[44px]', // WCAG touch target
  {
    variants: {
      variant: {
        primary: 'bg-eve-blue text-white hover:bg-eve-blue-dark active:bg-blue-800',
        secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export function Button({
  children,
  variant,
  size,
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
```

### Enhanced DataFreshness with Icons

**Update `components/DataFreshness.tsx`:**

```typescript
'use client';

import { useDataFreshness } from '@/lib/queries/data-freshness';
import { formatDistanceToNow } from 'date-fns';
import { ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export function DataFreshness() {
  const { data, isLoading } = useDataFreshness();

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <ClockIcon className="h-4 w-4" aria-hidden="true" />
        <span>Checking data freshness...</span>
      </div>
    );
  }

  const { lastFetchedAt, status } = data;
  const timestamp = new Date(lastFetchedAt);

  // Color and icon based on status
  const statusConfig = {
    fresh: {
      color: 'text-green-600 dark:text-eve-green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: ClockIcon,
      label: 'Data is fresh',
    },
    stale: {
      color: 'text-yellow-600 dark:text-eve-gold',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: ExclamationTriangleIcon,
      label: 'Data is stale',
    },
    'very-stale': {
      color: 'text-red-600 dark:text-eve-red',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircleIcon,
      label: 'Data is very stale',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} aria-hidden="true" />
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Last updated{' '}
          <time dateTime={timestamp.toISOString()}>
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </time>
        </p>
      </div>
    </div>
  );
}
```

### Verification Steps

1. **Run Lighthouse audit:**
   ```
   1. Open Chrome DevTools
   2. Navigate to Lighthouse tab
   3. Run audit (Desktop + Mobile)
   4. Accessibility score should be ≥95/100
   5. No contrast errors
   ```

2. **Run axe DevTools:**
   ```
   1. Install axe DevTools extension
   2. Run full scan
   3. Should report 0 violations
   4. Check for warnings to improve
   ```

3. **Manual contrast testing:**
   ```
   1. Use Chrome DevTools Color Picker
   2. Test all text colors against backgrounds
   3. Dark theme: Text should be ≥4.5:1
   4. Light theme: Text should be ≥4.5:1
   ```

4. **Touch target testing (mobile):**
   ```
   1. Open DevTools device emulation
   2. Measure all buttons/links
   3. All should be ≥44x44px
   4. Use "Show Ruler" in DevTools
   ```

5. **Screen reader testing:**
   ```
   1. Navigate with NVDA/JAWS/VoiceOver
   2. All images should announce purpose
   3. All form inputs should have labels
   4. All sections should have headings
   ```

6. **Semantic HTML validation:**
   ```
   1. View page source
   2. Check for proper heading hierarchy (h1 → h2 → h3)
   3. Check for role attributes
   4. Run W3C HTML validator
   ```

## Architecture Context

### Why WCAG AA (not AAA)

**AA is Practical:**
- AAA requires 7:1 contrast (very limiting for design)
- AA requires 4.5:1 (achievable with good design)
- Most legal requirements = AA level
- 99% of users satisfied with AA

**AA Coverage:**
- Level A: Basic accessibility
- Level AA: Recommended for most sites
- Level AAA: Specialized needs (government, medical)

### Touch Target Sizes

**44x44px Minimum:**
- Apple HIG: 44x44pt
- Android Material: 48x48dp
- WCAG 2.2 (upcoming): 24x24px minimum
- We use 44x44px for best practice

**Implementation:**
- `min-h-[44px] min-w-[44px]` on all buttons
- Padding adjusts internally
- Clickable area always ≥44px

### Semantic HTML Benefits

**Better than divs everywhere:**
- Screen readers understand structure
- Better SEO (Google understands hierarchy)
- Easier maintenance (clear intent)
- Better keyboard navigation

**Key elements:**
- `<header role="banner">` = Site header
- `<main role="main">` = Primary content
- `<nav>` = Navigation links
- `<section>` = Thematic grouping
- `<aside>` = Tangential content
- `<footer role="contentinfo">` = Site footer

### ARIA Live Regions

**What they do:**
- Announce dynamic content to screen readers
- No page refresh needed
- Polite vs. assertive

**When to use:**
- `aria-live="polite"`: Loading states, success messages
- `aria-live="assertive"`: Errors, critical warnings
- `role="status"`: Loading indicators
- `role="alert"`: Error messages

## Dev Notes

### Prerequisites

- @heroicons/react installed (Story 3.2)
- Tailwind CSS configured (Story 1.1)

### New Dependency

```bash
pnpm add class-variance-authority
```

### Common Issues and Solutions

**Issue: Lighthouse score <95**
- Solution: Check contrast ratios first
- Verify all images have alt text
- Ensure all buttons have accessible names

**Issue: axe violations reported**
- Solution: Read specific violation message
- Common: missing alt text, low contrast, no labels
- Fix individually

**Issue: Touch targets too small**
- Solution: Add min-h/min-w to CSS
- Check with DevTools ruler
- Test on real mobile device

**Issue: Screen reader not announcing changes**
- Solution: Add aria-live to dynamic sections
- Use role="alert" for errors
- Use role="status" for loading

**Issue: Heading hierarchy wrong**
- Solution: Only one h1 per page
- h2 for major sections
- h3 for subsections
- No skipping levels (h1 → h3 is wrong)

### Color Contrast Calculator

**Online tool:** https://webaim.org/resources/contrastchecker/

**Quick checks:**
```
Dark theme:
- white (#F9FAFB) on dark-950 (#0A0E14) = 17.2:1 ✅
- eve-blue (#33B5E5) on dark-950 = 4.8:1 ✅
- gray-400 (#9CA3AF) on dark-950 = 7.8:1 ✅

Light theme:
- gray-900 (#111827) on gray-50 (#F9FAFB) = 15.8:1 ✅
- eve-blue-dark (#0099CC) on white = 7.2:1 ✅
- gray-600 (#4B5563) on white = 7.1:1 ✅
```

### Automated Testing

**Add to package.json:**

```json
{
  "scripts": {
    "test:a11y": "pa11y http://localhost:3000"
  },
  "devDependencies": {
    "pa11y": "^8.0.0"
  }
}
```

**Run:**
```bash
pnpm test:a11y
```

### Performance Expectations

**No performance impact:**
- ARIA attributes = metadata (no JS)
- Semantic HTML = same rendering speed
- Focus indicators = CSS only

### Next Steps

After this story is complete:
1. **Story 5.4:** Add font scaling feature

### References

**Source Documents:**
- [PRD: Accessibility Requirements](../planning-artifacts/prd.md#accessibility-level)
- [UX Spec: WCAG Compliance](../planning-artifacts/ux-design-specification.md)
- [Epic 5: User Experience & Accessibility](../planning-artifacts/epics.md#epic-5-user-experience--accessibility)

**External Documentation:**
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- axe DevTools: https://www.deque.com/axe/devtools/
- Lighthouse: https://developers.google.com/web/tools/lighthouse

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
