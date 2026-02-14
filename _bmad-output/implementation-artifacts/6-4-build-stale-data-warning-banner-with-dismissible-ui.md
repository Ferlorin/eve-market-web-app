# Story 6.4: Build Stale Data Warning Banner with Dismissible UI

Status: ready-for-dev

## Story

As a user viewing trading opportunities,
I want a prominent warning banner when market data is stale (>45 minutes old),
So that I'm aware the data may be outdated before making trading decisions.

## Acceptance Criteria

**Given** the app displays market data with timestamps
**When** I implement a stale data warning banner
**Then** a banner appears at the top of the main content area when data age exceeds 45 minutes
**And** the banner has three severity levels:
  - **Warning (45-120 min):** Yellow banner with clock icon and "Data is stale" message
  - **Critical (>120 min):** Red banner with alert icon and "Data is very stale" message
  - **Fresh (<45 min):** No banner displayed
**And** the banner displays the exact age text: "Last updated 62 minutes ago"
**And** the banner includes a "Dismiss" button (X icon) that hides it for current session
**And** dismissal state is stored in sessionStorage (resets on page refresh)
**And** the banner reappears if dismissed then data becomes staler (e.g., warning→critical)
**And** the banner animates in/out smoothly (slide down/up with fade)
**And** the banner is accessible with proper ARIA attributes

## Technical Requirements

### Stale Data Banner Component

**File:** `components/StaleDataBanner.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useDataFreshness } from '@/lib/queries/data-freshness';
import { formatDistanceToNow } from 'date-fns';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type SeverityLevel = 'warning' | 'critical';

interface BannerConfig {
  icon: typeof ClockIcon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  title: string;
}

const severityConfigs: Record<SeverityLevel, BannerConfig> = {
  warning: {
    icon: ClockIcon,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-400 dark:border-yellow-700',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-500',
    title: 'Data is stale',
  },
  critical: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-500 dark:border-red-700',
    textColor: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-500',
    title: 'Data is very stale',
  },
};

export function StaleDataBanner() {
  const { data, isLoading } = useDataFreshness();
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastSeverity, setLastSeverity] = useState<SeverityLevel | null>(null);

  // Determine severity level
  const getSeverity = (): SeverityLevel | null => {
    if (!data || data.status === 'fresh' || data.status === 'unknown') {
      return null;
    }

    if (data.status === 'very-stale') {
      return 'critical';
    }

    if (data.status === 'stale') {
      return 'warning';
    }

    return null;
  };

  const severity = getSeverity();

  // Check sessionStorage for dismissal
  useEffect(() => {
    const dismissed = sessionStorage.getItem('stale-data-banner-dismissed');
    const dismissedSeverity = sessionStorage.getItem('stale-data-banner-severity');

    if (dismissed === 'true' && dismissedSeverity === severity) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    setLastSeverity(severity);
  }, [severity]);

  // Reset dismissal if severity increases
  useEffect(() => {
    if (lastSeverity && severity && severity !== lastSeverity) {
      // Severity changed (e.g., warning → critical)
      // Reset dismissal
      setIsDismissed(false);
      sessionStorage.removeItem('stale-data-banner-dismissed');
    }
  }, [severity, lastSeverity]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('stale-data-banner-dismissed', 'true');
    sessionStorage.setItem('stale-data-banner-severity', severity || '');
  };

  // Don't render if loading, no severity, or dismissed
  if (isLoading || !severity || isDismissed) {
    return null;
  }

  const config = severityConfigs[severity];
  const Icon = config.icon;

  const timestamp = data?.lastFetchedAt ? new Date(data.lastFetchedAt) : null;
  const ageText = timestamp
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : 'unknown';

  return (
    <div
      className={`mb-6 p-4 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor} 
        animate-in slide-in-from-top-2 fade-in duration-300`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`text-sm mt-1 ${config.textColor}`}>
            Market data may be outdated. Last updated{' '}
            {timestamp && (
              <time dateTime={timestamp.toISOString()} className="font-medium">
                {ageText}
              </time>
            )}
            .
          </p>
          <p className={`text-xs mt-2 ${config.textColor} opacity-90`}>
            Trading opportunities shown may no longer be available or accurate.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 p-1 rounded-lg ${config.textColor} hover:bg-black/10 dark:hover:bg-white/10 
            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue`}
          aria-label="Dismiss warning"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
```

### Update Main Page with Banner

**Update `app/page.tsx`:**

```typescript
import { StaleDataBanner } from '@/components/StaleDataBanner';

export default function HomePage() {
  // ... existing hooks and state

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* ... existing header content */}
      </header>

      <main id="main-content" className="flex-1" role="main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stale data banner - appears before region selection */}
          <StaleDataBanner />

          {/* Region selection section */}
          <section aria-labelledby="region-selection-heading" className="mb-8">
            {/* ... existing region selection */}
          </section>

          {/* Validation error */}
          {validationError && (
            <aside 
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              {/* ... existing validation error */}
            </aside>
          )}

          {/* Selection summary */}
          {buyMarket && sellMarket && !validationError && (
            <aside 
              className="mb-6 p-4 bg-blue-50 dark:bg-eve-blue/10 border border-eve-blue rounded-lg"
              aria-live="polite"
            >
              {/* ... existing selection summary */}
            </aside>
          )}

          {/* Opportunity table section */}
          <section aria-labelledby="opportunities-heading">
            {/* ... existing opportunity table */}
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* ... existing footer */}
      </footer>
    </div>
  );
}
```

### Tailwind Animation Utilities

**Update `tailwind.config.ts`:**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'eve-blue': '#33B5E5',
        'eve-blue-dark': '#0099CC',
        'eve-gold': '#FFB800',
        'eve-red': '#FF4757',
        'eve-green': '#2ECC71',
      },
      keyframes: {
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-to-top': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
      },
      animation: {
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-out-to-top': 'slide-out-to-top 0.3s ease-in',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Verification Steps

1. **Test warning level (45-120 min):**
   ```sql
   -- Set data to 60 minutes old
   UPDATE regions
   SET "lastFetchedAt" = NOW() - INTERVAL '60 minutes';
   ```
   ```
   1. Load page
   2. Yellow banner appears
   3. Shows "Data is stale"
   4. Shows "Last updated 60 minutes ago"
   5. Clock icon visible
   ```

2. **Test critical level (>120 min):**
   ```sql
   -- Set data to 150 minutes old
   UPDATE regions
   SET "lastFetchedAt" = NOW() - INTERVAL '150 minutes';
   ```
   ```
   1. Load page
   2. Red banner appears
   3. Shows "Data is very stale"
   4. Shows "Last updated 2 hours ago"
   5. Warning triangle icon visible
   ```

3. **Test fresh data (no banner):**
   ```bash
   # Trigger fresh fetch
   curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   
   # Wait for completion, then load page
   1. No banner appears
   ```

4. **Test dismissal:**
   ```
   1. Load page with stale data (banner appears)
   2. Click X button
   3. Banner disappears smoothly
   4. Refresh page → Banner reappears (sessionStorage)
   ```

5. **Test severity escalation:**
   ```
   1. Set data to 60 minutes old (warning)
   2. Load page, dismiss banner
   3. Set data to 150 minutes old (critical)
   4. Refresh page → Banner reappears (severity increased)
   ```

6. **Test animation:**
   ```
   1. Load page with stale data
   2. Banner should slide down + fade in (300ms)
   3. Click dismiss
   4. Banner should slide up + fade out (300ms)
   ```

7. **Test accessibility:**
   ```
   1. Enable screen reader (NVDA/JAWS)
   2. Load page with stale banner
   3. Should announce: "Alert: Data is stale. Market data may be outdated..."
   4. Tab to dismiss button
   5. Should announce: "Dismiss warning, button"
   ```

## Architecture Context

### Why sessionStorage vs localStorage

**sessionStorage:**
- Clears on browser tab close
- User sees banner again on new session
- Appropriate for temporary dismissal

**localStorage:**
- Persists forever
- User might miss critical warnings
- Too permanent for time-sensitive data

**Verdict:** sessionStorage balances convenience and safety

### Why Three Status Levels

**Design Decision:**
- **Fresh (<45 min):** Normal operation, no warning
- **Warning (45-120 min):** Noticeable but not critical
- **Critical (>120 min):** Data significantly outdated

**Rationale:**
- Matches cron schedule (30 min intervals)
- 45 min = missed 1 scheduled run
- 120 min = missed 3+ scheduled runs (system issue)

### Severity Escalation Pattern

**Problem:**
User dismisses warning banner, then data gets staler.

**Solution:**
- Track dismissed severity in sessionStorage
- If severity increases (warning→critical), reset dismissal
- User sees critical banner even if warning was dismissed

**Code:**
```typescript
if (lastSeverity && severity && severity !== lastSeverity) {
  setIsDismissed(false);
  sessionStorage.removeItem('stale-data-banner-dismissed');
}
```

### aria-live="assertive"

**Why assertive:**
- Interrupts current screen reader output
- Important for time-sensitive warnings
- User needs to know data is stale before acting

**Alternative:**
- `aria-live="polite"` waits for current announcement to finish
- Too passive for warnings

### Animation Performance

**CSS transforms:**
- `translateY()` uses GPU acceleration
- Smooth 60fps animation
- No layout reflow (performant)

**Tailwind animate utilities:**
```css
animate-in slide-in-from-top-2 fade-in duration-300
```
- Built-in Tailwind v4 animations
- Combines multiple effects
- Declarative (no custom CSS)

## Dev Notes

### Prerequisites

- useDataFreshness hook (Story 4.4)
- date-fns installed (Story 4.4)
- @heroicons/react installed (Story 3.2)

### No Additional Dependencies

- Uses sessionStorage (browser API)
- Uses Tailwind animations (built-in)

### Common Issues and Solutions

**Issue: Banner doesn't appear**
- Solution: Check data freshness
```bash
curl http://localhost:3000/api/data-freshness | jq
```
- Verify status is 'stale' or 'very-stale'

**Issue: Banner reappears after dismissal**
- Solution: Check sessionStorage
```javascript
// Browser console
console.log(sessionStorage.getItem('stale-data-banner-dismissed'));
```
- Should be 'true' after dismissal

**Issue: Animation stutters**
- Solution: Check for CSS conflicts
- Ensure no `transition: all` on parent elements
- Use `will-change: transform` for hint

**Issue: Dismissed banner doesn't reset on severity change**
- Solution: Verify useEffect dependencies
- Check `lastSeverity` state updating

**Issue: Banner blocks content**
- Solution: Add margin-bottom
```typescript
<StaleDataBanner /> {/* Has mb-6 class */}
<section> {/* Content below */}
```

### Testing Tips

**Force stale data quickly:**
```typescript
// Temporary mock in lib/queries/data-freshness.ts
export function useDataFreshness() {
  return {
    data: {
      status: 'stale', // or 'very-stale'
      lastFetchedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ageMinutes: 60,
    },
    isLoading: false,
  };
}
```

**Clear sessionStorage:**
```javascript
// Browser console
sessionStorage.clear();
```

**Test animations:**
```css
/* Slow down for debugging */
.animate-in {
  animation-duration: 3s !important;
}
```

### Accessibility Testing

**Screen reader checklist:**
- [ ] Banner announced on appear
- [ ] Title read first
- [ ] Message read second
- [ ] Dismiss button labeled
- [ ] Focus visible on dismiss button

**Keyboard navigation:**
- [ ] Tab reaches dismiss button
- [ ] Enter/Space dismisses banner
- [ ] Focus moves to next element after dismiss

### Performance Expectations

**Render time:**
- Component mount: <5ms
- Animation: 300ms
- Total perceived: <350ms

**No performance impact:**
- Conditional render (only when stale)
- Lightweight component
- No expensive calculations

### User Experience Considerations

**Why dismissible:**
- Users may already be aware of stale data
- Reduces banner fatigue
- Temporary dismissal is compromise

**Why reappear on severity change:**
- User dismissed warning (yellow)
- Data becomes critical (red)
- User should be re-alerted

**Why prominent placement:**
- Top of main content
- Before interactive elements
- User sees before selecting regions

### Next Steps

After this story is complete:
1. **Story 6.5:** Create error handling and user-friendly error messages

### References

**Source Documents:**
- [PRD: Data Freshness Indicator](../planning-artifacts/prd.md#data-staleness-warning)
- [UX Spec: Warning Banners](../planning-artifacts/ux-design-specification.md)
- [Epic 6: System Operations & Monitoring](../planning-artifacts/epics.md#epic-6-system-operations--monitoring)

**External Documentation:**
- aria-live: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- sessionStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- Tailwind Animations: https://tailwindcss.com/docs/animation

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
