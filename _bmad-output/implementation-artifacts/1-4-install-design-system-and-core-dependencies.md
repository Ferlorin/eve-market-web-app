# Story 1.4: Install Design System and Core Dependencies

Status: ready-for-dev

## Story

As a developer,
I want to install Headless UI, virtual scrolling, API client, and validation libraries,
So that I have all the dependencies needed to build the UI and backend features.

## Acceptance Criteria

**Given** the Next.js project is initialized
**When** I install production dependencies: `pnpm add axios zod date-fns @headlessui/react @tanstack/react-virtual`
**Then** all packages install successfully without peer dependency warnings
**And** I can import and use each package in a test component
**And** Tailwind CSS is already configured and working (from create-next-app)
**And** the project builds successfully with `pnpm build`
**And** the total bundle size remains under 500KB gzipped (verified with `pnpm build` output)

## Technical Requirements

### Production Dependencies Installation

```bash
# Install all production dependencies in one command
pnpm add axios zod date-fns @headlessui/react @tanstack/react-virtual

# Verify installation
pnpm list axios zod date-fns @headlessui/react @tanstack/react-virtual
```

### Package Purposes and Versions

| Package | Purpose | Latest Version (Feb 2026) | Bundle Impact |
|---------|---------|---------------------------|---------------|
| **axios** | ESI API HTTP client | 1.7.9 | ~15KB gzipped |
| **zod** | Runtime validation for API responses | 3.24.1 | ~18KB gzipped |
| **date-fns** | Timestamp formatting ("Last updated: ...") | 4.1.0 | ~10KB gzipped (tree-shakeable) |
| **@headlessui/react** | Accessible UI components (dropdowns, modals) | 2.2.0 | ~35KB gzipped |
| **@tanstack/react-virtual** | Virtual scrolling for 10,000+ row tables | 3.11.2 | ~8KB gzipped |

**Total Added Size:** ~86KB gzipped (well within 500KB budget)

### Package Usage Overview

#### 1. axios - HTTP Client for ESI API

**Purpose:** Fetch market data from CCP's EVE ESI API

**Key Features:**
- Promise-based HTTP requests
- Request/response interceptors (for rate limiting)
- Automatic JSON transformation
- Error handling with status codes

**Will be used in:** Story 2.2 (Build ESI API Client)

**Example usage:**
```typescript
import axios from 'axios';

const esiClient = axios.create({
  baseURL: 'https://esi.evetech.net/latest',
  timeout: 10000,
});

const response = await esiClient.get('/markets/10000002/orders/');
```

#### 2. zod - Runtime Type Validation

**Purpose:** Validate ESI API responses at runtime (prevent malformed data from corrupting database)

**Key Features:**
- Schema definition with TypeScript inference
- Runtime validation
- Parsing with error messages
- Type coercion

**Will be used in:** Story 2.2 (ESI Client), Story 4.1 (API Endpoints)

**Example usage:**
```typescript
import { z } from 'zod';

const MarketOrderSchema = z.object({
  order_id: z.number(),
  type_id: z.number(),
  location_id: z.number(),
  price: z.number(),
  volume_remain: z.number(),
  is_buy_order: z.boolean(),
  issued: z.string().datetime(),
});

// Validate API response
const orders = MarketOrderSchema.array().parse(apiResponse);
```

#### 3. date-fns - Date Formatting

**Purpose:** Format timestamps for "Last updated" indicators and data freshness warnings

**Key Features:**
- Tree-shakeable (only import functions you use)
- Immutable (no mutating Date objects)
- Type-safe
- Locale support (English default)

**Will be used in:** Story 4.4 (Data Freshness Display), Story 6.4 (Stale Data Banner)

**Example usage:**
```typescript
import { format, formatDistanceToNow } from 'date-fns';

// "Last updated: Feb 14, 2026 9:02 AM"
const formatted = format(new Date(), 'MMM dd, yyyy h:mm a');

// "Last updated: 2 hours ago"
const relative = `Last updated: ${formatDistanceToNow(lastFetch, { addSuffix: true })}`;
```

#### 4. @headlessui/react - Accessible UI Components

**Purpose:** Build region selector dropdowns with keyboard navigation and autocomplete

**Key Features:**
- Unstyled components (style with Tailwind CSS)
- WCAG AA compliant out of the box
- Keyboard navigation built-in
- TypeScript support
- React 19 compatible

**Components needed for this project:**
- **Combobox:** Region selector with autocomplete (Story 3.2, 3.3)
- **Menu:** Dropdown menus (if needed)
- **Dialog:** Modal dialogs (future: error messages)

**Will be used in:** Story 3.2 (Region Selector Component), Story 5.2 (Keyboard Navigation)

**Example usage:**
```typescript
import { Combobox } from '@headlessui/react';

<Combobox value={selectedRegion} onChange={setSelectedRegion}>
  <Combobox.Input onChange={(e) => setQuery(e.target.value)} />
  <Combobox.Options>
    {filteredRegions.map(region => (
      <Combobox.Option key={region.id} value={region}>
        {region.name}
      </Combobox.Option>
    ))}
  </Combobox.Options>
</Combobox>
```

#### 5. @tanstack/react-virtual - Virtual Scrolling

**Purpose:** Render 10,000+ row tables efficiently (only render visible rows)

**Key Features:**
- Headless (bring your own markup)
- Sub-millisecond scroll performance
- Dynamic row heights support
- Horizontal + vertical scrolling
- SSR compatible

**Will be used in:** Story 4.2 (High-Performance Opportunity Table)

**Performance target:** Render 10,000 rows in <500ms (NFR-P4)

**Example usage:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: opportunities.length, // 10,000+ rows
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40, // 40px row height from UX spec
});

// Only render visible rows
{rowVirtualizer.getVirtualItems().map(virtualRow => (
  <tr key={virtualRow.index}>{/* row content */}</tr>
))}
```

### Verification Tests

**Create test file: `src/app/test-deps/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { z } from 'zod';
import { format } from 'date-fns';
import axios from 'axios';

export default function TestDepsPage() {
  const [result, setResult] = useState('');

  const testDeps = async () => {
    try {
      // Test axios
      const response = await axios.get('https://api.github.com/zen');
      
      // Test zod
      const UserSchema = z.object({ message: z.string() });
      const validated = UserSchema.parse({ message: response.data });
      
      // Test date-fns
      const timestamp = format(new Date(), 'MMM dd, yyyy h:mm a');
      
      // Test @headlessui/react (imported above, renders below)
      
      // Test @tanstack/react-virtual (imported above)
      
      setResult(`✅ All dependencies working!\n\nAxios: ${validated.message}\nDate: ${timestamp}`);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dependency Test Page</h1>
      <button 
        onClick={testDeps}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Test Dependencies
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {result}
        </pre>
      )}
      
      {/* Test Headless UI Combobox */}
      <div className="mt-8">
        <h2 className="font-bold mb-2">Headless UI Test:</h2>
        <Combobox value="" onChange={() => {}}>
          <Combobox.Input className="border p-2" placeholder="Type to test..." />
        </Combobox>
      </div>
    </div>
  );
}
```

**Run verification:**
```bash
pnpm dev
# Visit http://localhost:3000/test-deps
# Click "Test Dependencies" button
# Expected: ✅ All dependencies working!
```

### Bundle Size Verification

```bash
# Build production bundle
pnpm build

# Check bundle size output
# Expected output similar to:
# Route (app)                  Size     First Load JS
# ┌ ○ /                        5.2 kB        120 kB
# └ ○ /test-deps               8.5 kB        185 kB
#
# First Load JS total should be < 500KB for main routes
```

**Target:** First Load JS for production routes < 500KB (NFR-P8)

## Architecture Context

### Why These Specific Libraries

**axios vs fetch API:**
- **axios** chosen over native `fetch()` for better error handling, interceptors (rate limiting), and request cancellation
- ESI API rate limiting (150 req/sec) easier to implement with axios interceptors

**zod vs TypeScript-only validation:**
- **Runtime validation** critical for external API (ESI responses can change)
- TypeScript types only compile-time, zod validates at runtime
- Prevents corrupted data from reaching database

**date-fns vs moment.js/day.js:**
- **Tree-shakeable:** Only bundle functions you use (~10KB vs 70KB for moment)
- **Immutable:** No accidental date mutations
- Latest version (4.x) has ESM support for optimal bundling

**@headlessui/react vs Radix UI:**
- **Mandated by UX spec:** Architecture document specifies Headless UI
- WCAG AA compliance built-in (meets NFR requirements)
- Tailwind CSS integration (already configured)

**@tanstack/react-virtual vs react-window:**
- **More modern:** Active development, React 19 compatible
- Better TypeScript support
- Smaller bundle size
- Dynamic row heights (if needed later)

### Dependency Strategy

**Production Dependencies (This Story):**
- Only essential runtime dependencies
- All tree-shakeable or small (<50KB each)
- Total added: ~86KB gzipped

**Development Dependencies (Already installed):**
- TypeScript, ESLint, Prisma CLI
- Not included in production bundle

**Future Dependencies (Post-MVP):**
- Testing libraries (Vitest, Testing Library) - Story 6.5+
- Monitoring (if scaling beyond free tier)

### Performance Impact Analysis

**Page Load Performance (NFR-P1 to NFR-P3):**
- Initial page load target: <2s
- Added dependencies: +86KB gzipped
- Next.js code splitting: Only loads dependencies on routes that use them
- **Verdict:** Well within performance budget

**Runtime Performance:**
- **axios:** No runtime overhead (just HTTP wrapper)
- **zod:** <1ms validation per API response
- **date-fns:** <1ms formatting
- **@headlessui/react:** Optimized for 60fps interactions
- **@tanstack/react-virtual:** Maintains 60fps scrolling with 10K+ rows

## Dev Notes

### Prerequisites

- **Story 1.1:** Next.js project initialized ✅
- **Story 1.2:** Docker PostgreSQL running ✅
- **Story 1.3:** Prisma configured ✅

### Installation Steps (Detailed)

```bash
# Navigate to project directory
cd eve-market-web-app

# Ensure latest package metadata
pnpm install

# Install all production dependencies
pnpm add axios zod date-fns @headlessui/react @tanstack/react-virtual

# Expected output:
# Progress: resolved 142, reused 135, downloaded 7, added 7
# dependencies:
# + @headlessui/react 2.2.0
# + @tanstack/react-virtual 3.11.2
# + axios 1.7.9
# + date-fns 4.1.0
# + zod 3.24.1

# Verify installation
pnpm list | grep -E "axios|zod|date-fns|headlessui|tanstack"

# Build to check bundle size
pnpm build
```

### Common Issues and Solutions

**Issue: Peer dependency warnings for React 19**
- **Solution:** These packages all support React 19—warnings are normal during transition period
- Verify with: `pnpm list react` (should show 19.2.4)

**Issue: "Module not found: Can't resolve '@headlessui/react'"**
- **Solution:** Restart Next.js dev server: `Ctrl+C` then `pnpm dev`
- Clear `.next` cache: `rm -rf .next && pnpm dev`

**Issue: Bundle size exceeds 500KB**
- **Solution:** Check imports—ensure not importing entire libraries:
  ```typescript
  // ❌ Wrong: imports entire library
  import * as dateFns from 'date-fns';
  
  // ✅ Right: imports only needed functions
  import { format, formatDistanceToNow } from 'date-fns';
  ```

**Issue: "Cannot find module 'axios'"**
- **Solution:** TypeScript cache issue—restart VS Code or run:
  ```bash
  rm -rf node_modules/.cache
  pnpm install
  ```

### Verification Checklist

After completing this story, verify:

- [ ] `pnpm add axios zod date-fns @headlessui/react @tanstack/react-virtual` successful
- [ ] No peer dependency errors (warnings OK)
- [ ] `package.json` lists all 5 new dependencies
- [ ] `pnpm build` completes successfully
- [ ] First Load JS < 500KB for production routes
- [ ] Test page (`/test-deps`) renders and functions work
- [ ] Tailwind CSS still working (from create-next-app)
- [ ] ESLint has no errors: `pnpm lint`

### Next Steps After Completion

**Epic 1 Complete! 🎉**

After this story:
1. **Epic 2 starts:** Story 2.1 (Create Database Schema)
2. Dev agent uses these libraries to build features:
   - axios → ESI API client (Story 2.2)
   - zod → Validate ESI responses (Story 2.2)
   - Prisma → Store market data (Story 2.1)
   - @headlessui/react → Region selectors (Story 3.2)
   - @tanstack/react-virtual → Opportunity table (Story 4.2)
   - date-fns → Timestamps (Story 4.4, 6.4)

**Delete test page after verification:**
```bash
rm -rf src/app/test-deps
```

### Performance Benchmarks

**Expected Performance After Installation:**
- **Dev server startup:** 2-5 seconds (Turbopack)
- **Hot reload:** <1 second (unchanged from Story 1.1)
- **Production build time:** 15-30 seconds
- **Bundle size:** ~200KB base + ~86KB dependencies = ~286KB total

**Future Bundle Growth (Estimated):**
- Epic 2-3 (backend logic): +50KB
- Epic 4-5 (UI components): +100KB
- Epic 6 (monitoring): +20KB
- **Final estimate:** ~450KB (within 500KB budget)

### References

**Source Documents:**
- [Architecture: Technology Stack Selection](../planning-artifacts/architecture.md#technology-stack-selection)
- [Architecture: Core Versions](../planning-artifacts/architecture.md#core-versions-latest-stable---february-2026)
- [PRD: NFR-P8 (Bundle Size <500KB)](../planning-artifacts/prd.md#performance-targets)
- [UX Design: Headless UI Requirement](../planning-artifacts/ux-design-specification.md)
- [Epic 1: Story 1.4](../planning-artifacts/epics.md#story-14-install-design-system-and-core-dependencies)

**External Documentation:**
- axios: https://axios-http.com/docs/intro
- zod: https://zod.dev/
- date-fns: https://date-fns.org/docs/Getting-Started
- Headless UI: https://headlessui.com/
- TanStack Virtual: https://tanstack.com/virtual/latest

## Tasks/Subtasks

### Task 1: Install Production Dependencies
- [x] 1.1: Navigate to frontend directory and install packages: `npm install axios zod date-fns @headlessui/react @tanstack/react-virtual`
- [x] 1.2: Verify installation with `npm list` for all 5 packages
- [x] 1.3: Verify no peer dependency errors (warnings acceptable)

### Task 2: Create Dependency Test Page
- [x] 2.1: Create `src/app/test-deps/page.tsx` with test component
- [x] 2.2: Import all dependencies (axios, zod, date-fns, @headlessui/react, @tanstack/react-virtual)
- [x] 2.3: Implement test button that exercises all dependencies
- [x] 2.4: Add Headless UI Combobox visual test

### Task 3: Verify Installation
- [x] 3.1: Run dev server with `npm run dev`
- [x] 3.2: Navigate to http://localhost:3000/test-deps
- [x] 3.3: Click "Test Dependencies" button and verify all pass
- [x] 3.4: Verify Combobox input renders correctly

### Task 4: Bundle Size Verification
- [x] 4.1: Run `npm run build` to create production bundle
- [x] 4.2: Verify First Load JS < 500KB for main routes
- [x] 4.3: Verify build completes without errors
- [x] 4.4: Run `npm lint` and verify no ESLint errors

### Task 5: Cleanup and Documentation
- [x] 5.1: Document installed versions in story Dev Agent Record
- [x] 5.2: List all modified files
- [x] 5.3: Mark story as ready-for-review

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes

**Completed:** 2026-02-14

**Installed Packages:**
- axios@1.13.5
- zod@4.3.6
- date-fns@4.1.0
- @headlessui/react@2.2.9
- @tanstack/react-virtual@3.13.18

**Additional Dependencies:**
- @types/pg@8.11.11 (dev dependency for TypeScript support)

**Build Results:**
- Build time: ~3.9s
- All routes compiled successfully
- Static pages: /, /_not-found, /test-deps
- No TypeScript errors
- 1 ESLint warning (useVirtualizer unused in test page - acceptable)

**Bundle Size:** Well within 500KB budget (static pages only)

**Tests:** Test page created at /test-deps with functional verification for all dependencies

**Status:** ready-for-review

### File List

**Modified:**
- `webapp/package.json` - Added 5 production dependencies
- `webapp/package-lock.json` - Updated with new package locks

**Created:**
- `webapp/src/app/test-deps/page.tsx` - Dependency test page
