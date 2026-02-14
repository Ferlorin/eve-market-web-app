# Story 3.3: Add Keyboard Navigation to Region Selectors

Status: ready-for-dev

## Story

As a developer,
I want region selectors to be fully keyboard-navigable,
So that power users can select markets without using a mouse.

## Acceptance Criteria

**Given** the RegionSelector component exists
**When** a user focuses on the input field
**Then** pressing the down arrow key opens the dropdown and highlights the first option
**And** pressing up/down arrow keys navigates through the list of region options
**And** pressing Enter selects the highlighted region and closes the dropdown
**And** pressing Escape closes the dropdown without selecting
**And** pressing Tab moves focus to the next element (buy market → sell market)
**And** keyboard focus states are visible (2px solid #33B5E5 outline)
**And** all keyboard interactions work consistently in Chrome, Firefox, Edge, and Safari

## Technical Requirements

### Enhanced RegionSelector Component

**File:** `components/RegionSelector.tsx` (update)

```typescript
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Region } from '@/lib/regions';

interface RegionSelectorProps {
  label: string;
  placeholder?: string;
  value: Region | null;
  onChange: (region: Region | null) => void;
  regions: Region[];
  disabled?: boolean;
  autoFocus?: boolean;
}

export function RegionSelector({
  label,
  placeholder = 'Search regions...',
  value,
  onChange,
  regions,
  disabled = false,
  autoFocus = false
}: RegionSelectorProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Fuzzy search implementation
  const filteredRegions = useMemo(() => {
    if (query === '') return regions;

    const lowerQuery = query.toLowerCase();
    
    return regions.filter((region) => {
      const lowerName = region.name.toLowerCase();
      
      // Exact match or substring match
      if (lowerName.includes(lowerQuery)) return true;
      
      // Fuzzy match: all query chars appear in order
      let queryIndex = 0;
      for (let i = 0; i < lowerName.length && queryIndex < lowerQuery.length; i++) {
        if (lowerName[i] === lowerQuery[queryIndex]) {
          queryIndex++;
        }
      }
      return queryIndex === lowerQuery.length;
    });
  }, [query, regions]);

  return (
    <div className="w-full">
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => (
          <div className="relative">
            {/* Label */}
            <Combobox.Label className="block text-sm font-medium text-gray-300 mb-2">
              {label}
            </Combobox.Label>

            {/* Input Field */}
            <div className="relative">
              <Combobox.Input
                ref={inputRef}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-3 pr-10 text-white placeholder:text-gray-500 
                  focus:border-eve-blue focus:outline-none focus:ring-2 focus:ring-eve-blue focus:ring-offset-2 focus:ring-offset-gray-900 
                  focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
                  disabled:cursor-not-allowed disabled:opacity-50
                  sm:text-sm transition-colors"
                placeholder={placeholder}
                displayValue={(region: Region | null) => region?.name ?? ''}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  // Open dropdown on arrow down when closed
                  if (event.key === 'ArrowDown' && !open) {
                    event.preventDefault();
                    inputRef.current?.click();
                  }
                  // Close dropdown on Escape
                  if (event.key === 'Escape') {
                    setQuery('');
                  }
                }}
              />
              
              <Combobox.Button 
                className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="Toggle region dropdown"
              >
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors"
                  aria-hidden="true"
                />
              </Combobox.Button>
            </div>

            {/* Dropdown Options */}
            {filteredRegions.length > 0 && (
              <Combobox.Options 
                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-800 py-1 text-base shadow-lg 
                  focus:outline-none sm:text-sm
                  scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
              >
                {filteredRegions.map((region) => (
                  <Combobox.Option
                    key={region.regionId}
                    value={region}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-3 pr-9 transition-colors ${
                        active ? 'bg-eve-blue/20 text-white' : 'text-gray-300'
                      }`
                    }
                  >
                    {({ active, selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {region.name}
                        </span>

                        {selected && (
                          <span
                            className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                              active ? 'text-white' : 'text-eve-blue'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            )}

            {/* No Results Message */}
            {query !== '' && filteredRegions.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 py-2 px-3 text-sm text-gray-400">
                No regions found matching "{query}"
              </div>
            )}
          </div>
        )}
      </Combobox>
    </div>
  );
}
```

### CSS for Custom Scrollbar

**Add to `app/globals.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar for region dropdown */
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  @apply bg-gray-800;
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  @apply bg-gray-600;
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}

/* Firefox scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #3E4855 #151921;
}

/* Focus-visible styles (keyboard only, not mouse) */
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #33B5E5;
  outline-offset: 2px;
}
```

### Test Page with Tab Navigation

**File:** `app/test-keyboard/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegions } from '@/lib/queries/regions';
import type { Region } from '@/lib/regions';

export default function KeyboardTestPage() {
  const { data: regions, isLoading } = useRegions();
  const [buyMarket, setBuyMarket] = useState<Region | null>(null);
  const [sellMarket, setSellMarket] = useState<Region | null>(null);

  if (isLoading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Keyboard Navigation Test
        </h1>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <RegionSelector
            label="Buy Market"
            placeholder="Select buy region..."
            value={buyMarket}
            onChange={setBuyMarket}
            regions={regions ?? []}
            autoFocus
          />

          <RegionSelector
            label="Sell Market"
            placeholder="Select sell region..."
            value={sellMarket}
            onChange={setSellMarket}
            regions={regions ?? []}
          />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Keyboard Shortcuts
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-mono text-eve-blue">Tab</dt>
              <dd className="text-gray-400">Move to next field</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Shift + Tab</dt>
              <dd className="text-gray-400">Move to previous field</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">↓ Arrow Down</dt>
              <dd className="text-gray-400">Open dropdown / Next option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">↑ Arrow Up</dt>
              <dd className="text-gray-400">Previous option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Enter</dt>
              <dd className="text-gray-400">Select highlighted option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Escape</dt>
              <dd className="text-gray-400">Close dropdown / Clear input</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Type</dt>
              <dd className="text-gray-400">Filter regions</dd>
            </div>
          </dl>
        </div>

        {(buyMarket || sellMarket) && (
          <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Selected Markets
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Buy Market:</p>
                <p className="text-white font-medium">
                  {buyMarket?.name ?? 'Not selected'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Sell Market:</p>
                <p className="text-white font-medium">
                  {sellMarket?.name ?? 'Not selected'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Verification Steps

1. **Test Tab navigation:**
   ```
   1. Load /test-keyboard page
   2. Press Tab → Should focus Buy Market input (auto-focus)
   3. Press Tab again → Should focus Sell Market input
   4. Press Shift+Tab → Should return to Buy Market
   ```

2. **Test Arrow key navigation:**
   ```
   1. Focus Buy Market input
   2. Press Down Arrow → Dropdown opens, first region highlighted
   3. Press Down Arrow multiple times → Highlight moves down
   4. Press Up Arrow → Highlight moves up
   5. Press Enter → Selected region appears in input
   ```

3. **Test Escape key:**
   ```
   1. Open dropdown
   2. Press Escape → Dropdown closes
   3. Type "for" in input
   4. Press Escape → Input clears
   ```

4. **Test typing to filter:**
   ```
   1. Focus input
   2. Type "for" → Only "The Forge" visible
   3. Press Down → Highlights "The Forge"
   4. Press Enter → Selects "The Forge"
   ```

5. **Test focus indicators:**
   ```
   1. Use only keyboard to navigate
   2. All focused elements should show blue ring (2px)
   3. Click with mouse → No blue ring
   4. Tab again → Blue ring reappears
   ```

## Architecture Context

### Why Focus-Visible CSS

**Design Decision:**
- `:focus-visible` pseudo-class distinguishes keyboard vs mouse
- Keyboard users see focus indicators
- Mouse users don't see distracting outlines

**Browser Support:**
- Chrome/Edge: Native support
- Firefox: Native support
- Safari: Polyfill required (or use `:focus` fallback)

**Implementation:**
```css
*:focus:not(:focus-visible) { outline: none; }
*:focus-visible { outline: 2px solid #33B5E5; }
```

### Why Headless UI Handles Most Navigation

**Built-in Features:**
- Arrow key navigation (up/down)
- Enter to select
- Escape to close
- Tab to next element
- ARIA attributes for screen readers

**Custom Additions:**
- Auto-open on arrow down (when closed)
- Clear query on Escape
- Auto-focus support
- Visual focus indicators

### Accessibility Compliance

**WCAG 2.1 AA Requirements:**
- ✅ Keyboard accessible (all functions available via keyboard)
- ✅ Focus indicators visible (2px outline, high contrast)
- ✅ Logical tab order (left to right, top to bottom)
- ✅ ARIA labels on icon buttons
- ✅ Screen reader announcements (via Headless UI)

**Testing Tools:**
- Lighthouse accessibility audit
- axe DevTools browser extension
- Manual keyboard-only testing

## Dev Notes

### Prerequisites

- Story 3.2 completed (base RegionSelector exists)
- Headless UI installed
- Tailwind CSS configured

### No Additional Dependencies

- Headless UI handles keyboard interactions
- CSS for focus styles only

### Common Issues and Solutions

**Issue: Focus ring not visible on keyboard navigation**
- Solution: Check `:focus-visible` CSS is in globals.css
- Ensure no conflicting outline styles

**Issue: Arrow keys scroll page instead of navigating dropdown**
- Solution: Headless UI prevents default—check for conflicting event handlers

**Issue: Tab key doesn't move to next field**
- Solution: Don't use `e.preventDefault()` on Tab key
- Let browser handle tab navigation naturally

**Issue: Dropdown doesn't open on arrow down**
- Solution: Check `onKeyDown` handler on input
- Ensure `inputRef.current?.click()` is called

**Issue: Escape clears input but doesn't close dropdown**
- Solution: Headless UI closes dropdown automatically
- Only need to clear query state: `setQuery('')`

### Testing Across Browsers

**Chrome/Edge (Chromium):**
- Full :focus-visible support
- Arrow key navigation smooth

**Firefox:**
- Full :focus-visible support
- Slightly different scrollbar styles

**Safari:**
- Limited :focus-visible support (use polyfill)
- Test on macOS to verify

**Testing Commands:**
```bash
# Test in different browsers
pnpm dev

# Open in:
# Chrome: http://localhost:3000/test-keyboard
# Firefox: http://localhost:3000/test-keyboard
# Safari: http://localhost:3000/test-keyboard
```

### Keyboard Navigation Patterns

**Standard Web Conventions:**
- Tab/Shift+Tab: Navigate between elements
- Arrow keys: Navigate within element (dropdown)
- Enter: Activate/select
- Escape: Cancel/close
- Space: Activate buttons (not used here)

**EVE Market Scanner Specific:**
- Auto-focus buy market on page load
- Tab from buy → sell market
- Arrow down opens dropdown (no click required)

### Performance Expectations

**Keyboard Response Time:**
- Key press to action: <50ms
- Arrow navigation: Instant (no filtering)
- Dropdown open/close: <100ms animation

### Next Steps

After this story is complete:
1. **Story 3.4:** Add validation (prevent same region selection)
2. **Story 4.5:** Integrate with opportunity table
3. **Story 5.2:** Add more keyboard shortcuts (if needed)

### References

**Source Documents:**
- [PRD: Keyboard Navigation Requirement](../planning-artifacts/prd.md#accessibility-level)
- [UX Spec: Keyboard Interactions](../planning-artifacts/ux-design-specification.md)
- [Epic 3: Market Selection & Region Comparison](../planning-artifacts/epics.md#epic-3-market-selection--region-comparison)

**External Documentation:**
- Headless UI Keyboard Interactions: https://headlessui.com/react/combobox#keyboard-interactions
- MDN :focus-visible: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- WCAG Keyboard Guidelines: https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
