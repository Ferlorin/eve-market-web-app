# Story 3.1: Load EVE Region Names and Create Region Data Source

Status: ready-for-dev

## Story

As a developer,
I want to load all EVE region names and IDs at build time or server startup,
So that the region selectors have data to display.

## Acceptance Criteria

**Given** the database schema has a Region table
**When** I create `lib/regions.ts` with a function `getAllRegions(): Promise<Region[]>`
**Then** the function queries the Region table and returns all regions (id, regionId, name)
**And** I create an API route `/api/regions` that returns all regions as JSON
**And** calling GET `/api/regions` returns an array of region objects with regionId and name fields
**And** the response time is under 100ms
**And** the data includes all 60+ EVE regions

## Technical Requirements

### Seed Region Data

**File:** `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function seedRegions() {
  console.log('Fetching EVE regions from ESI...');
  
  // Fetch region IDs
  const regionsResponse = await axios.get(
    'https://esi.evetech.net/latest/universe/regions/'
  );
  const regionIds: number[] = regionsResponse.data;
  
  console.log(`Found ${regionIds.length} regions`);
  
  // Fetch region names
  for (const regionId of regionIds) {
    try {
      const response = await axios.get(
        `https://esi.evetech.net/latest/universe/regions/${regionId}/`
      );
      const regionData = response.data;
      
      await prisma.region.upsert({
        where: { regionId },
        update: { name: regionData.name },
        create: {
          regionId,
          name: regionData.name
        }
      });
      
      console.log(`  ✓ ${regionData.name} (${regionId})`);
    } catch (error) {
      console.error(`  ✗ Failed to fetch region ${regionId}:`, error.message);
    }
  }
  
  console.log('Region seeding complete!');
}

async function main() {
  await seedRegions();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add to `package.json`:**

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run seed:**

```bash
pnpm prisma db seed
# or manually:
pnpm run seed
```

### Region Library

**File:** `lib/regions.ts`

```typescript
import { db } from '@/lib/db';

export interface Region {
  id: number;
  regionId: number;
  name: string;
}

export async function getAllRegions(): Promise<Region[]> {
  const regions = await db.region.findMany({
    select: {
      id: true,
      regionId: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return regions;
}

export async function getRegionById(regionId: number): Promise<Region | null> {
  return await db.region.findUnique({
    where: { regionId },
    select: {
      id: true,
      regionId: true,
      name: true
    }
  });
}

export async function getRegionByName(name: string): Promise<Region | null> {
  return await db.region.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive' // Case-insensitive search
      }
    },
    select: {
      id: true,
      regionId: true,
      name: true
    }
  });
}
```

### API Route

**File:** `app/api/regions/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAllRegions } from '@/lib/regions';

export const dynamic = 'force-dynamic'; // Disable static optimization
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const regions = await getAllRegions();
    
    return NextResponse.json({
      success: true,
      count: regions.length,
      data: regions
    });
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load regions'
      },
      { status: 500 }
    );
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "count": 64,
  "data": [
    {
      "id": 1,
      "regionId": 10000001,
      "name": "Derelik"
    },
    {
      "id": 2,
      "regionId": 10000002,
      "name": "The Forge"
    }
    // ... 62 more regions
  ]
}
```

### Frontend Data Fetching Hook

**File:** `lib/queries/regions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import type { Region } from '@/lib/regions';

interface RegionsResponse {
  success: boolean;
  count: number;
  data: Region[];
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async (): Promise<Region[]> => {
      const response = await fetch('/api/regions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      
      const json: RegionsResponse = await response.json();
      return json.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour (regions rarely change)
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
  });
}
```

**Usage in Component:**

```typescript
import { useRegions } from '@/lib/queries/regions';

function RegionSelector() {
  const { data: regions, isLoading, error } = useRegions();
  
  if (isLoading) return <div>Loading regions...</div>;
  if (error) return <div>Failed to load regions</div>;
  
  return (
    <select>
      {regions?.map(region => (
        <option key={region.regionId} value={region.regionId}>
          {region.name}
        </option>
      ))}
    </select>
  );
}
```

### Verification Steps

1. **Seed database:**
   ```bash
   pnpm run seed
   ```

2. **Verify in database:**
   ```bash
   pnpm prisma studio
   # Check Region table has 60+ entries
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/regions
   # Should return JSON with all regions
   ```

4. **Test query performance:**
   ```bash
   # Measure response time
   time curl http://localhost:3000/api/regions
   # Should be < 100ms
   ```

5. **Test frontend hook:**
   ```typescript
   // In a test component
   const { data } = useRegions();
   console.log(`Loaded ${data?.length} regions`);
   ```

## Architecture Context

### Why Seed Script

**Design Decision:**
- Seed database once with region data (rarely changes)
- No need to fetch from ESI on every request
- Faster than API calls (no external dependency)

**Alternative Considered:**
- Fetch from ESI on every request: Too slow, adds latency
- Hard-code region list: Breaks if CCP adds new regions

**Verdict:** Seed script provides best balance (fast + stays up-to-date)

### Why API Route with Caching

**Server-Side Caching:**
- `revalidate = 3600` = 1 hour cache
- Next.js serves cached response (no DB query)
- Perfect for data that changes rarely

**Benefits:**
- First request: ~20ms (database query)
- Subsequent requests: <5ms (cached)
- Reduces database load

### Why TanStack Query

**Client-Side State Management:**
- Handles loading/error states automatically
- De-duplicates requests (multiple components = 1 API call)
- Long stale time (1 hour) = minimal re-fetching
- Perfect for reference data like regions

### Data Access Pattern

**Layered Architecture:**
1. Database → `lib/regions.ts` (business logic)
2. API Route → `app/api/regions/route.ts` (HTTP interface)
3. React Hook → `lib/queries/regions.ts` (frontend integration)

**Benefits:**
- Separation of concerns
- Easy to test each layer independently
- Can swap database without changing API

## Dev Notes

### Prerequisites

- Story 2.1 completed (Region table exists)
- Prisma client configured
- TanStack Query installed: `pnpm add @tanstack/react-query`

### Dependencies to Install

```bash
# If not already installed
pnpm add @tanstack/react-query
pnpm add -D tsx  # For running seed script
```

### Common Issues and Solutions

**Issue: Seed script fails with "Cannot find module '@prisma/client'"**
- Solution: Run `pnpm prisma generate` first

**Issue: Empty regions returned from API**
- Solution: Run seed script: `pnpm run seed`

**Issue: 503 errors when seeding (ESI down)**
- Solution: Retry after a few minutes, or seed a subset first

**Issue: /api/regions returns 500 error**
- Solution: Check database connection (DATABASE_URL in .env)

**Issue: useRegions() returns undefined**
- Solution: Wrap app in QueryClientProvider:
  ```typescript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  
  const queryClient = new QueryClient();
  
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
  ```

### Expected Region List

**Major EVE Regions (Sample):**
- The Forge (Jita hub) - regionId: 10000002
- Domain (Amarr hub) - regionId: 10000043
- Sinq Laison (Dodixie hub) - regionId: 10000032
- Heimatar (Rens hub) - regionId: 10000030
- Metropolis - regionId: 10000042
- The Citadel - regionId: 10000033
- Essence - regionId: 10000064

**Total Count:** 64 public regions (as of 2026)

### Testing Region Names

**Test fuzzy search (for Story 3.2):**

```typescript
// Test data
const testCases = [
  { input: 'for', expected: 'The Forge' },
  { input: 'hei', expected: 'Heimatar' },
  { input: 'dom', expected: 'Domain' },
  { input: 'cit', expected: 'The Citadel' }
];
```

### Performance Expectations

**API Response Times:**
- First request (cold): ~20-50ms (database query)
- Cached requests: <5ms (Next.js cache)
- Frontend render: <100ms (includes network + parsing)

**Database Query:**
- 64 regions × ~100 bytes = ~6.4KB response
- Negligible database load
- No indexes needed (small table)

### Next Steps

After this story is complete:
1. **Story 3.2:** Build autocomplete region selector component
2. **Story 3.3:** Add keyboard navigation to selectors
3. **Story 3.4:** Implement validation (prevent same region selection)

### References

**Source Documents:**
- [Architecture: Data Fetching with TanStack Query](../planning-artifacts/architecture.md#data-fetching-tanstack-query)
- [PRD: Market Comparison Interface](../planning-artifacts/prd.md#core-functionality)
- [Epic 3: Market Selection & Region Comparison](../planning-artifacts/epics.md#epic-3-market-selection--region-comparison)

**External Documentation:**
- ESI Universe Endpoints: https://esi.evetech.net/ui/#/Universe
- TanStack Query: https://tanstack.com/query/latest/docs/react/overview
- Prisma Seeding: https://www.prisma.io/docs/guides/database/seed-database

## Tasks/Subtasks

### Task 1: Update Seed Script with Real Region Names
- [x] 1.1: Update `prisma/seed.ts` to fetch regions from ESI
- [x] 1.2: Fetch region names using ESI `/universe/regions/{id}/` endpoint
- [x] 1.3: Upsert regions into database
- [x] 1.4: Run seed script and verify 60+ regions loaded

### Task 2: Create Region Library
- [x] 2.1: Create `lib/regions.ts` with getAllRegions() function
- [x] 2.2: Add getRegionById() helper
- [x] 2.3: Add getRegionByName() helper with case-insensitive search

### Task 3: Create API Route
- [x] 3.1: Create `app/api/regions/route.ts`
- [x] 3.2: Implement GET handler with caching (1 hour revalidate)
- [x] 3.3: Return JSON with success, count, and data fields

### Task 4: Install TanStack Query and Create Hook
- [x] 4.1: Install @tanstack/react-query
- [x] 4.2: Create `lib/queries/regions.ts` with useRegions() hook
- [x] 4.3: Configure staleTime and gcTime

### Task 5: Testing and Verification
- [x] 5.1: Seed loaded all 113 regions successfully
- [x] 5.2: API route created and compiled
- [x] 5.3: Build successful with new /api/regions route
- [x] 5.4: All components created and typed

### Task 6: Documentation
- [x] 6.1: Document completion in Dev Agent Record
- [x] 6.2: List all created files
- [x] 6.3: Mark story as ready-for-review

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes

**Completed:** 2026-02-14

**Features Implemented:**
- Updated seed script to fetch all regions from ESI API
- Loaded 113 regions (all EVE Online regions including wormholes)
- Created region library with getAllRegions(), getRegionById(), getRegionByName()
- Case-insensitive search support for region names
- API route at `/api/regions` with 1-hour caching
- TanStack Query hook for client-side data fetching
- Proper TypeScript types throughout

**Seed Results:**
- ✅ 113/113 regions loaded successfully
- Includes all K-space, wormholes, and special regions
- Rate-limited ESI requests (10ms delay between calls)

**Performance:**
- Seed time: ~1.5 minutes (113 regions)
- API caching: 1 hour revalidation
- Client-side staleTime: 1 hour

**Build Status:** Successful

**Status:** ready-for-review

### File List

**Modified:**
- `webapp/prisma/seed.ts` - Updated to fetch all regions from ESI with names

**Created:**
- `webapp/src/lib/regions.ts` - Region library with query functions
- `webapp/src/app/api/regions/route.ts` - Regions API endpoint
- `webapp/src/lib/queries/regions.ts` - TanStack Query hook for frontend
