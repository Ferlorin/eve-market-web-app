# EVE Market Web App - Three Architecture Variants

**Date:** 2026-02-20
**Architect:** Winston (BMAD Architect Agent)
**Project Owner:** Harry
**Status:** Design Complete - Implementation Pending

---

## Executive Summary

This document outlines three parallel architecture implementations for the EVE Market Web App to address database cost constraints while testing different data storage and caching strategies.

**Goal:** Remove dependency on Neon Postgres (hitting free tier limits) while maintaining performance and legal compliance with CCP's EVE Online ESI API terms.

**Approach:** Create three separate repositories to test different architectures in parallel:

1. **Main Repo** (Control) - Current Neon database implementation
2. **Static-Cache Repo** - Static JSON generation with Vercel CDN
3. **Vercel-Blob Repo** - Vercel Blob storage with dynamic serving

---

## Architecture Decision Drivers

### Constraints
- ✅ **Zero Cost** - Must stay on Vercel free tier
- ✅ **No Git Storage** - Public repo cannot store market data (CCP redistribution concerns)
- ✅ **No External Services** - Avoid services that require payment (Neon, Redis, Upstash)
- ✅ **ESI Compliance** - Respect CCP's cache headers and licensing terms
- ✅ **Long-Session UX** - Users leave page open all day, get notifications on fresh data

### Performance Requirements
- Response time: <200ms (current baseline)
- Data freshness: 30-minute updates (current GitHub Actions schedule)
- Notification latency: <60 seconds (polling interval)

### Current Usage (Vercel Free Tier)
- Edge Requests: 4.5K / 1M (0.45% used)
- Function Invocations: 1.4K / 1M (0.14% used)
- Fast Data Transfer: 68.94 MB / 100 GB (0.07% used)

**Headroom:** 99%+ available on all metrics

---

## Repository Structure

### Repo 1: `eve-market-web-app` (Main - Control)
**Status:** Existing
**Purpose:** Baseline comparison, current production implementation
**Storage:** Neon Postgres
**URL:** https://github.com/[user]/eve-market-web-app

### Repo 2: `eve-market-web-app-static-cache`
**Status:** To be created
**Purpose:** Test static JSON with zero git storage
**Storage:** Vercel deployment artifacts (ephemeral)
**URL:** https://github.com/[user]/eve-market-web-app-static-cache

### Repo 3: `eve-market-web-app-vercel-blob`
**Status:** To be created
**Purpose:** Test Vercel Blob storage layer
**Storage:** Vercel Blob (persistent)
**URL:** https://github.com/[user]/eve-market-web-app-vercel-blob

---

## Variant 1: Main Repo (Neon Database) - CONTROL

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────┐
│ GitHub Actions (Every 30 min)                            │
│                                                           │
│  1. Fetch ESI market data → JSON artifacts               │
│  2. Consolidate → Write to Neon DB                       │
│  3. VACUUM ANALYZE                                       │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Neon Postgres (Free Tier)                                │
│                                                           │
│  • market_orders table                                   │
│  • regions, item_types, locations                        │
│  • Connection pooling: 2-5 connections                   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Next.js API Routes (Vercel)                              │
│                                                           │
│  /api/opportunities?buy=X&sell=Y                         │
│  • Prisma queries                                        │
│  • In-memory cache (30 min TTL)                          │
│  • Returns top 1000 opportunities                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend (React + TanStack Query)                        │
│                                                           │
│  • Client-side cache (5 min stale time)                  │
│  • Polls /api/data-freshness every 60s                   │
│  • StaleDataBanner shows when data >45min old            │
└──────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Fetch:** GitHub Actions → ESI API (all regions)
2. **Transform:** Consolidate JSON artifacts → SQL inserts
3. **Store:** Neon Postgres (deduplicated via `ON CONFLICT`)
4. **Serve:** Prisma query → In-memory cache → API response
5. **Consume:** Frontend fetch → TanStack Query cache → UI

### Pros
- ✅ Battle-tested (current production)
- ✅ SQL query flexibility
- ✅ Efficient deduplication
- ✅ Familiar stack (Prisma + Postgres)

### Cons
- ❌ Neon free tier limits (hitting ceiling)
- ❌ Database connection overhead
- ❌ Vendor lock-in (migration cost if Neon changes)
- ❌ Ephemeral in-memory cache (lost on redeploy)

### Cost Analysis
- **Storage:** 500 MB / 3 GB Neon free tier
- **Connections:** 2-5 / unlimited (free tier)
- **Compute:** Serverless (free tier)
- **Risk:** Neon may enforce upgrade soon

### Retention Decision
**Keep as baseline for performance comparison.** Do not modify.

---

## Variant 2: Static-Cache Repo (Zero Git Storage)

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────┐
│ GitHub Actions (Every 30 min)                            │
│                                                           │
│  1. Fetch ESI market data → JSON artifacts               │
│  2. Generate static JSON files:                          │
│     public/data/10000002-10000043.json                   │
│     public/data/10000002-10000042.json                   │
│     ... (all popular region pairs)                       │
│  3. Deploy to Vercel (vercel deploy --prod)              │
│                                                           │
│  ⚠️ JSON files NEVER committed to git (.gitignore)       │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Vercel Deployment Artifact                               │
│                                                           │
│  • /public/data/*.json included in build                │
│  • Served as static files via Edge CDN                   │
│  • Cache-Control: public, max-age=1800                   │
│  • No database, no Blob storage                          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Vercel Edge Network (Global CDN)                         │
│                                                           │
│  • Edge caches JSON files                                │
│  • Response time: 20-50ms globally                       │
│  • 1M free edge requests/month                           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend (React)                                         │
│                                                           │
│  fetch('/data/10000002-10000043.json')                   │
│  • Pure static file fetch                                │
│  • TanStack Query cache (5 min)                          │
│  • FreshDataNotification polls for new timestamps        │
└──────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Fetch:** GitHub Actions → ESI API (all regions)
2. **Transform:** Consolidate → Generate static JSON per region pair
3. **Store:** Ephemeral (only in deployment artifact, NOT git)
4. **Deploy:** Vercel CLI uploads build with JSON files
5. **Serve:** Vercel Edge CDN serves static JSON
6. **Consume:** Frontend direct fetch → TanStack Query → UI

### File Structure
```
eve-market-web-app-static-cache/
├── .github/
│   └── workflows/
│       └── fetch-and-deploy.yml         # Modified: deploy instead of DB
├── webapp/
│   ├── public/
│   │   └── data/                        # Generated, NOT in git
│   │       ├── 10000002-10000043.json   # The Forge → Domain
│   │       ├── 10000002-10000042.json   # The Forge → Metropolis
│   │       └── ... (all region pairs)
│   ├── scripts/
│   │   ├── fetch-to-json.ts             # Same as main
│   │   └── generate-static-json.ts      # NEW: Create JSON files
│   └── src/
│       ├── lib/
│       │   └── queries/
│       │       └── opportunities.ts     # Modified: fetch from /data
│       └── components/
│           └── FreshDataNotification.tsx # NEW: Notify on updates
├── .gitignore                            # Blocks public/data/*.json
└── vercel.json                           # Edge caching config
```

### Implementation Details

#### `.gitignore` (Critical - No Git Storage)
```gitignore
# Market data - NEVER commit to git
public/data/*.json
market-data-artifacts/*.json

# Only code should be in repo
```

#### `scripts/generate-static-json.ts` (New Script)
```typescript
import fs from 'fs';
import path from 'path';

interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  buyStation: string;
  sellStation: string;
  roi: number;
  volumeAvailable: number;
  maxProfit: number;
}

interface RegionPairData {
  lastUpdated: string;
  buyRegion: number;
  sellRegion: number;
  buyRegionName: string;
  sellRegionName: string;
  opportunities: Opportunity[];
}

async function generateStaticJSON() {
  // Read consolidated market data from artifacts
  const artifactsDir = path.join(process.cwd(), 'market-data-artifacts');
  const outputDir = path.join(process.cwd(), 'public', 'data');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load all region JSON files
  const allOrders = loadAllOrders(artifactsDir);

  // Generate opportunities for popular region pairs
  const popularPairs = getPopularRegionPairs();

  for (const { buyRegion, sellRegion } of popularPairs) {
    const opportunities = calculateOpportunities(
      allOrders[buyRegion],
      allOrders[sellRegion],
      buyRegion,
      sellRegion
    );

    const output: RegionPairData = {
      lastUpdated: new Date().toISOString(),
      buyRegion,
      sellRegion,
      buyRegionName: getRegionName(buyRegion),
      sellRegionName: getRegionName(sellRegion),
      opportunities: opportunities.slice(0, 1000), // Top 1000
    };

    const filename = `${buyRegion}-${sellRegion}.json`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(output, null, 2)
    );

    console.log(`✅ Generated ${filename} (${opportunities.length} opportunities)`);
  }

  // Generate metadata file
  const metadata = {
    lastGenerated: new Date().toISOString(),
    regionPairs: popularPairs.length,
    version: '1.0.0',
  };

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`✅ Generated ${popularPairs.length} region pair files`);
}

// Helper functions (same logic as current opportunities API)
function calculateOpportunities(buyOrders, sellOrders, buyRegionId, sellRegionId) {
  // Same calculation logic as webapp/src/app/api/opportunities/route.ts
  // (omitted for brevity - copy from existing code)
}

function getPopularRegionPairs() {
  // Return array of {buyRegion, sellRegion} for popular trade routes
  // Example: The Forge ↔ Domain, Jita ↔ Amarr, etc.
  return [
    { buyRegion: 10000002, sellRegion: 10000043 }, // Forge → Domain
    { buyRegion: 10000043, sellRegion: 10000002 }, // Domain → Forge
    // ... add more popular pairs
  ];
}

generateStaticJSON().catch(console.error);
```

#### GitHub Actions Workflow (Modified)
```yaml
# .github/workflows/fetch-and-deploy.yml
name: Fetch and Deploy Static

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:

jobs:
  # ... (same fetch jobs as main repo)

  generate-and-deploy:
    needs: [fetch-high-volume-json, fetch-chunks-json]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: webapp
        run: npm ci --prefer-offline --no-audit

      - name: Download all JSON artifacts
        uses: actions/download-artifact@v4
        with:
          path: webapp/market-data-artifacts
          pattern: market-data-*
          merge-multiple: true

      - name: Generate static JSON files
        working-directory: webapp
        run: npx tsx scripts/generate-static-json.ts
        # Creates webapp/public/data/*.json (NOT committed)

      - name: Deploy to Vercel
        working-directory: webapp
        run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        # Vercel gets the JSON files in the build artifact
        # Files are served as static assets from Edge CDN
```

#### Frontend Changes (Modified `useOpportunities`)
```typescript
// webapp/src/lib/queries/opportunities.ts
import { useQuery } from '@tanstack/react-query';

interface OpportunitiesParams {
  buyRegion: number;
  sellRegion: number;
}

async function fetchOpportunities(params: OpportunitiesParams) {
  // Fetch from static JSON file instead of API
  const response = await fetch(`/data/${params.buyRegion}-${params.sellRegion}.json`);

  if (!response.ok) {
    throw new Error('Failed to fetch opportunities');
  }

  const data = await response.json();
  return {
    opportunities: data.opportunities,
    meta: {
      lastUpdated: data.lastUpdated,
      buyRegion: data.buyRegion,
      sellRegion: data.sellRegion,
    },
  };
}

export function useOpportunities(params: OpportunitiesParams | null) {
  return useQuery({
    queryKey: ['opportunities', params?.buyRegion, params?.sellRegion],
    queryFn: () => fetchOpportunities(params!),
    enabled: params !== null && params.buyRegion !== params.sellRegion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

#### Fresh Data Notification (New Component)
```typescript
// webapp/src/components/FreshDataNotification.tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/solid';

export function FreshDataNotification({
  currentDataTimestamp
}: {
  currentDataTimestamp: string | null
}) {
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Poll metadata for last generated timestamp
  const { data: metadata } = useQuery({
    queryKey: ['metadata'],
    queryFn: async () => {
      const res = await fetch('/data/metadata.json');
      return res.json();
    },
    refetchInterval: 60000, // 1 minute
  });

  // Reset dismissed when timestamp changes
  useEffect(() => {
    setDismissed(false);
  }, [metadata?.lastGenerated]);

  if (!currentDataTimestamp || !metadata || dismissed) {
    return null;
  }

  const hasNewData = new Date(metadata.lastGenerated) > new Date(currentDataTimestamp);

  if (!hasNewData) {
    return null;
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    setDismissed(true);
  };

  return (
    <div className="w-full px-4 py-3 bg-eve-blue/20 border-b-2 border-eve-blue">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ArrowPathIcon className="h-6 w-6 text-eve-blue animate-spin" />
          <div>
            <p className="text-sm font-medium text-eve-blue">
              Fresh market data available!
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              New opportunities calculated. Refresh to see latest data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-eve-blue text-white rounded-lg hover:bg-eve-blue/90"
          >
            Refresh Now
          </button>
          <button onClick={() => setDismissed(true)} className="p-1">
            <XMarkIcon className="h-5 w-5 text-eve-blue" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Pros
- ✅ **Zero database cost** - No Neon, no external services
- ✅ **Fastest response times** - 20-50ms from Edge CDN
- ✅ **Infinite scalability** - Static files can handle millions of requests
- ✅ **No git storage** - Complies with CCP redistribution concerns
- ✅ **Vercel free tier only** - 99% headroom available
- ✅ **Global edge caching** - Low latency worldwide

### Cons
- ❌ **Pre-generated pairs only** - Can't serve arbitrary region combinations
- ❌ **Larger deployment size** - All JSON files in every deploy
- ❌ **No dynamic filtering** - Frontend gets all 1000 opportunities
- ❌ **Stale data on deploy failures** - If GitHub Action fails, old data persists

### Cost Analysis
- **Storage:** 0 MB (no database, no blob)
- **Edge Requests:** 4.5K / 1M (0.45% used)
- **Data Transfer:** ~900 MB / 10 GB (9% used with 200KB JSON × 4.5K requests)
- **Total Cost:** $0.00 (free tier)

### ESI Compliance
- ✅ **Caching within limits** - 30min refresh matches typical ESI cache headers
- ✅ **No public redistribution** - JSON never in git, served through app
- ✅ **Attribution possible** - Frontend can display CCP copyright
- ⚠️ **Verify ESI cache headers** - Must check actual `Cache-Control` from API

### Performance Estimate
- **First request:** 20-50ms (Edge CDN)
- **Cached request:** 10-20ms (client-side)
- **Freshness check:** <100ms (metadata.json fetch)

---

## Variant 3: Vercel-Blob Repo

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────┐
│ GitHub Actions (Every 30 min)                            │
│                                                           │
│  1. Fetch ESI market data → JSON artifacts               │
│  2. Generate static JSON files (in memory)               │
│  3. Upload to Vercel Blob storage                        │
│     blob.put(`region-${buy}-${sell}.json`, data)         │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Vercel Blob Storage (Free Tier)                          │
│                                                           │
│  • 1 GB storage (free)                                   │
│  • 10,000 operations/month (free)                        │
│  • 10 GB data transfer/month (free)                      │
│  • Persistent storage (survives deploys)                 │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Next.js API Routes (Vercel)                              │
│                                                           │
│  /api/opportunities?buy=X&sell=Y                         │
│  • Fetch from Blob: get(`region-${buy}-${sell}.json`)   │
│  • Return JSON data                                      │
│  • Cache-Control header for edge caching                 │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Vercel Edge Network                                      │
│                                                           │
│  • Caches API responses (30 min)                         │
│  • Subsequent requests hit edge cache                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend (React)                                         │
│                                                           │
│  Same as current (no changes needed)                     │
│  /api/opportunities?buy=X&sell=Y                         │
└──────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Fetch:** GitHub Actions → ESI API (all regions)
2. **Transform:** Consolidate → Generate JSON per region pair
3. **Store:** Vercel Blob (persistent, survives deploys)
4. **Serve:** API route fetches from Blob → Edge cache → Response
5. **Consume:** Frontend (unchanged) → TanStack Query → UI

### File Structure
```
eve-market-web-app-vercel-blob/
├── .github/
│   └── workflows/
│       └── fetch-and-upload.yml          # Modified: upload to Blob
├── webapp/
│   ├── scripts/
│   │   ├── fetch-to-json.ts              # Same as main
│   │   └── upload-to-blob.ts             # NEW: Upload to Vercel Blob
│   └── src/
│       └── app/
│           └── api/
│               └── opportunities/
│                   └── route.ts           # Modified: fetch from Blob
└── vercel.json                            # Blob config + edge caching
```

### Implementation Details

#### `scripts/upload-to-blob.ts` (New Script)
```typescript
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

async function uploadToBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable required');
  }

  const artifactsDir = path.join(process.cwd(), 'market-data-artifacts');

  // Load all market data
  const allOrders = loadAllOrders(artifactsDir);

  // Generate and upload popular region pairs
  const popularPairs = getPopularRegionPairs();

  let uploadCount = 0;

  for (const { buyRegion, sellRegion } of popularPairs) {
    const opportunities = calculateOpportunities(
      allOrders[buyRegion],
      allOrders[sellRegion],
      buyRegion,
      sellRegion
    );

    const data = {
      lastUpdated: new Date().toISOString(),
      buyRegion,
      sellRegion,
      buyRegionName: getRegionName(buyRegion),
      sellRegionName: getRegionName(sellRegion),
      opportunities: opportunities.slice(0, 1000),
    };

    const blobKey = `market-data/region-${buyRegion}-${sellRegion}.json`;

    await put(blobKey, JSON.stringify(data), {
      access: 'public', // Required for API access
      addRandomSuffix: false, // Keep consistent keys
    });

    uploadCount++;
    console.log(`✅ Uploaded ${blobKey}`);
  }

  // Upload metadata
  const metadata = {
    lastUpdated: new Date().toISOString(),
    regionPairs: popularPairs.length,
    version: '1.0.0',
  };

  await put('market-data/metadata.json', JSON.stringify(metadata), {
    access: 'public',
    addRandomSuffix: false,
  });

  console.log(`✅ Uploaded ${uploadCount} region pairs to Vercel Blob`);
}

uploadToBlob().catch(console.error);
```

#### GitHub Actions Workflow (Modified)
```yaml
# .github/workflows/fetch-and-upload.yml
name: Fetch and Upload to Blob

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  # ... (same fetch jobs as main repo)

  upload-to-blob:
    needs: [fetch-high-volume-json, fetch-chunks-json]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: webapp
        run: npm ci --prefer-offline --no-audit

      - name: Download all JSON artifacts
        uses: actions/download-artifact@v4
        with:
          path: webapp/market-data-artifacts
          pattern: market-data-*
          merge-multiple: true

      - name: Upload to Vercel Blob
        working-directory: webapp
        run: npx tsx scripts/upload-to-blob.ts
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
```

#### API Route (Modified)
```typescript
// webapp/src/app/api/opportunities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { z } from 'zod';

const QuerySchema = z.object({
  buyRegion: z.string().transform(Number),
  sellRegion: z.string().transform(Number),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const result = QuerySchema.safeParse({
      buyRegion: searchParams.get('buyRegion'),
      sellRegion: searchParams.get('sellRegion'),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { buyRegion, sellRegion } = result.data;

    if (buyRegion === sellRegion) {
      return NextResponse.json(
        { error: 'Buy and sell regions must be different' },
        { status: 400 }
      );
    }

    // Fetch from Vercel Blob
    const blobKey = `market-data/region-${buyRegion}-${sellRegion}.json`;
    const blob = await get(blobKey);

    if (!blob) {
      return NextResponse.json(
        { error: 'Region pair not available' },
        { status: 404 }
      );
    }

    const data = await blob.json();
    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        count: data.opportunities.length,
        data: data.opportunities,
        meta: {
          buyRegion,
          sellRegion,
          lastUpdated: data.lastUpdated,
          calculationTimeMs: duration,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=1800', // 30 min edge cache
        },
      }
    );
  } catch (error) {
    console.error('Opportunities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
```

#### Data Freshness API (Modified)
```typescript
// webapp/src/app/api/data-freshness/route.ts
import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET() {
  try {
    const blob = await get('market-data/metadata.json');

    if (!blob) {
      return NextResponse.json(
        { error: 'No metadata found' },
        { status: 404 }
      );
    }

    const metadata = await blob.json();

    return NextResponse.json({
      lastFetchedAt: metadata.lastUpdated,
    });
  } catch (error) {
    console.error('Data freshness error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pros
- ✅ **Persistent storage** - Survives deploys (unlike static-cache)
- ✅ **Dynamic serving** - Can serve any region pair (if uploaded)
- ✅ **Familiar API pattern** - Frontend unchanged from current implementation
- ✅ **Edge caching** - API responses cached at edge for 30 min
- ✅ **No database** - Removes Neon dependency
- ✅ **No git storage** - Complies with CCP concerns

### Cons
- ❌ **Operation limits** - 10,000/month (tight with polling)
- ❌ **Additional service** - Harry wants to avoid external services
- ⚠️ **Pricing changes** - Vercel updated Blob pricing (concern raised)
- ❌ **API latency** - Slower than direct static files (fetch from Blob)

### Cost Analysis (Free Tier Limits)
- **Storage:** ~10 MB / 1 GB (1% used)
- **Simple Operations:**
  - Uploads: 48/day × 30 = 1,440/month
  - Downloads (API): 4,500 requests/month
  - Freshness checks: 4,500 × (60s polling) = ~4,500/month
  - **Total: ~10,400 operations / 10,000 free** ⚠️ **EXCEEDS LIMIT**
- **Data Transfer:** ~900 MB / 10 GB (9% used)

**Critical Issue:** Blob operations will exceed free tier with current traffic + polling pattern.

**Mitigation:**
- Reduce polling interval (60s → 120s): Cuts operations by 50%
- Cache metadata in-memory: Reduces Blob reads
- Use Edge Config for metadata: Free tier, faster

### Performance Estimate
- **First request:** 100-150ms (API → Blob fetch → Edge cache)
- **Cached request (edge):** 50-100ms
- **Client cached:** 10-20ms

---

## Comparison Matrix

| Criterion | Main (Neon) | Static-Cache | Vercel-Blob |
|-----------|-------------|--------------|-------------|
| **Database Cost** | Hitting limits ⚠️ | None ✅ | None ✅ |
| **Response Time** | 100-200ms | 20-50ms ✅ | 50-150ms |
| **Scalability** | Limited by Neon | Infinite ✅ | Limited by ops |
| **Git Storage** | None ✅ | None ✅ | None ✅ |
| **External Services** | Neon ❌ | None ✅ | Blob ⚠️ |
| **Persistent Cache** | Yes | No ❌ | Yes ✅ |
| **Dynamic Queries** | Yes ✅ | No ❌ | Yes ✅ |
| **Free Tier Risk** | High ❌ | None ✅ | Medium ⚠️ |
| **Implementation Complexity** | Existing ✅ | Medium | Medium |
| **ESI Compliance** | ✅ | ✅ | ✅ |
| **Fresh Data Notification** | Yes | Yes | Yes |

---

## Recommendation

### **Primary: Static-Cache Repo**

**Why:**
1. ✅ **Zero external dependencies** - Pure Vercel free tier
2. ✅ **Fastest performance** - Edge CDN static files
3. ✅ **Lowest risk** - No service limits to hit
4. ✅ **99% free tier headroom** - Can scale massively

**Trade-off:** Limited to pre-generated region pairs (acceptable for 80% use case)

### **Secondary: Vercel-Blob Repo**

**Why:**
1. ✅ **Persistent storage** - Survives deploy failures
2. ✅ **Dynamic serving** - Can add new region pairs easily
3. ⚠️ **Operation limits tight** - Need to optimize polling

**Trade-off:** May need to upgrade Blob tier if traffic grows

### **Baseline: Keep Main Repo**

Keep as control group for performance comparison. Do not modify.

---

## Implementation Roadmap

### Phase 1: Create Repos (Week 1)
1. ✅ Fork main repo → `eve-market-web-app-static-cache`
2. ✅ Fork main repo → `eve-market-web-app-vercel-blob`
3. ✅ Configure GitHub secrets for both repos
4. ✅ Update `.gitignore` in both repos

### Phase 2: Implement Static-Cache (Week 2)
1. ✅ Create `scripts/generate-static-json.ts`
2. ✅ Modify GitHub Actions workflow
3. ✅ Update frontend to fetch from `/data/*.json`
4. ✅ Add `FreshDataNotification` component
5. ✅ Test deployment
6. ✅ Verify Edge caching

### Phase 3: Implement Vercel-Blob (Week 3)
1. ✅ Create `scripts/upload-to-blob.ts`
2. ✅ Configure Vercel Blob in project settings
3. ✅ Modify GitHub Actions workflow
4. ✅ Update API routes to fetch from Blob
5. ✅ Test deployment
6. ✅ Monitor operation usage

### Phase 4: Testing & Comparison (Week 4)
1. ✅ Load test all three repos
2. ✅ Compare response times
3. ✅ Monitor costs/limits
4. ✅ Validate ESI compliance
5. ✅ Choose winner for production

---

## Next Steps

**Immediate Actions:**
1. **Create Static-Cache Repo** - Highest priority, lowest risk
2. **Create Vercel-Blob Repo** - Secondary option
3. **Test both with real traffic** - Parallel A/B testing
4. **Choose production architecture** - Based on results

**User Decision Required:**
- Which repo should I implement first?
- Do you want me to create the complete implementation scripts?
- Should I set up the repos or provide instructions?

---

**Status:** Architecture design complete. Ready for implementation approval.

**Architect:** Winston
**Next:** Await Harry's decision on implementation order.
