# Story 4.1: Create API Endpoint for ROI Opportunity Calculations

Status: ready-for-dev

## Story

As a developer,
I want to build an API endpoint that calculates ROI opportunities between two selected regions,
So that traders can see profitable trades.

## Acceptance Criteria

**Given** market data exists in the database for multiple regions
**When** I create `/api/opportunities` that accepts query params `buyRegion` and `sellRegion` (both region IDs)
**Then** the endpoint validates that buyRegion !== sellRegion (return 400 if same)
**And** the endpoint queries MarketOrder table for buy orders in buyRegion (isBuyOrder = false, selling orders)
**And** the endpoint queries MarketOrder table for sell orders in sellRegion (isBuyOrder = true, buying orders)
**And** the endpoint calculates ROI for each matching typeId: ROI = ((sellPrice - buyPrice) / buyPrice) * 100
**And** the endpoint returns only profitable opportunities (ROI > 0)
**And** the response includes: itemName (from typeId lookup), buyPrice, sellPrice, buyStation (locationId), sellStation (locationId), ROI%, volumeAvailable
**And** the response payload is under 2MB (use pagination or limit if needed)
**And** the calculation completes in under 500ms for typical datasets
**And** testing with real data (Jita → Amarr) returns valid profitable opportunities

## Technical Requirements

### API Route Implementation

**File:** `app/api/opportunities/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Request validation schema
const QuerySchema = z.object({
  buyRegion: z.string().transform(Number),
  sellRegion: z.string().transform(Number),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const raw = {
      buyRegion: searchParams.get('buyRegion'),
      sellRegion: searchParams.get('sellRegion'),
    };

    const result = QuerySchema.safeParse(raw);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: result.error.errors },
        { status: 400 }
      );
    }

    const { buyRegion, sellRegion } = result.data;

    // Validate different regions
    if (buyRegion === sellRegion) {
      return NextResponse.json(
        { error: 'Buy and sell regions must be different' },
        { status: 400 }
      );
    }

    // Calculate opportunities
    const opportunities = await calculateOpportunities(buyRegion, sellRegion);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
      meta: {
        buyRegion,
        sellRegion,
        calculationTimeMs: duration,
      },
    });
  } catch (error) {
    console.error('Opportunities API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to calculate opportunities', message: error.message },
      { status: 500 }
    );
  }
}

interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  buyStation: number;
  sellStation: number;
  roi: number;
  volumeAvailable: number;
}

async function calculateOpportunities(
  buyRegionId: number,
  sellRegionId: number
): Promise<Opportunity[]> {
  // Fetch sell orders from buy region (where we buy items)
  const buyOrders = await db.marketOrder.findMany({
    where: {
      regionId: buyRegionId,
      isBuyOrder: false, // Sell orders (someone selling = we buy)
    },
    select: {
      typeId: true,
      price: true,
      volumeRemain: true,
      locationId: true,
    },
  });

  // Fetch buy orders from sell region (where we sell items)
  const sellOrders = await db.marketOrder.findMany({
    where: {
      regionId: sellRegionId,
      isBuyOrder: true, // Buy orders (someone buying = we sell)
    },
    select: {
      typeId: true,
      price: true,
      volumeRemain: true,
      locationId: true,
    },
  });

  // Group orders by typeId for efficient matching
  const buyPriceMap = new Map<number, { price: number; volume: number; location: number }>();
  const sellPriceMap = new Map<number, { price: number; volume: number; location: number }>();

  // Find lowest buy price for each item (best place to buy)
  buyOrders.forEach((order) => {
    const existing = buyPriceMap.get(order.typeId);
    if (!existing || order.price < existing.price) {
      buyPriceMap.set(order.typeId, {
        price: order.price,
        volume: order.volumeRemain,
        location: order.locationId,
      });
    }
  });

  // Find highest sell price for each item (best place to sell)
  sellOrders.forEach((order) => {
    const existing = sellPriceMap.get(order.typeId);
    if (!existing || order.price > existing.price) {
      sellPriceMap.set(order.typeId, {
        price: order.price,
        volume: order.volumeRemain,
        location: order.locationId,
      });
    }
  });

  // Calculate ROI for matching items
  const opportunities: Opportunity[] = [];

  buyPriceMap.forEach((buyData, typeId) => {
    const sellData = sellPriceMap.get(typeId);
    
    if (!sellData) return; // No market for this item in sell region

    const buyPrice = buyData.price;
    const sellPrice = sellData.price;
    const roi = ((sellPrice - buyPrice) / buyPrice) * 100;

    // Only include profitable opportunities
    if (roi > 0) {
      opportunities.push({
        typeId,
        itemName: `Item ${typeId}`, // Placeholder - Item names loaded separately
        buyPrice,
        sellPrice,
        buyStation: buyData.location,
        sellStation: sellData.location,
        roi,
        volumeAvailable: Math.min(buyData.volume, sellData.volume),
      });
    }
  });

  // Sort by ROI descending (highest profit first)
  opportunities.sort((a, b) => b.roi - a.roi);

  return opportunities;
}
```

### Item Name Resolution (Optional Enhancement)

**For MVP, can use typeId. For better UX, add item names:**

**File:** `lib/items.ts`

```typescript
import { db } from '@/lib/db';

// Cache for item names (in-memory, persists across requests)
const itemNameCache = new Map<number, string>();

export async function getItemName(typeId: number): Promise<string> {
  // Check cache first
  if (itemNameCache.has(typeId)) {
    return itemNameCache.get(typeId)!;
  }

  // Fetch from database (assumes Item table seeded)
  const item = await db.item.findUnique({
    where: { typeId },
    select: { name: true },
  });

  const name = item?.name ?? `Unknown Item ${typeId}`;
  itemNameCache.set(typeId, name);
  
  return name;
}

export async function getItemNames(typeIds: number[]): Promise<Map<number, string>> {
  const missingIds = typeIds.filter(id => !itemNameCache.has(id));

  if (missingIds.length > 0) {
    const items = await db.item.findMany({
      where: { typeId: { in: missingIds } },
      select: { typeId: true, name: true },
    });

    items.forEach(item => {
      itemNameCache.set(item.typeId, item.name);
    });
  }

  const result = new Map<number, string>();
  typeIds.forEach(id => {
    result.set(id, itemNameCache.get(id) ?? `Unknown Item ${id}`);
  });

  return result;
}
```

**Use in calculateOpportunities:**

```typescript
// After building opportunities array
const typeIds = opportunities.map(opp => opp.typeId);
const itemNames = await getItemNames(typeIds);

opportunities.forEach(opp => {
  opp.itemName = itemNames.get(opp.typeId) ?? `Item ${opp.typeId}`;
});
```

### Verification Steps

1. **Test API with curl:**
   ```bash
   # Test Jita (10000002) to Amarr (10000043)
   curl "http://localhost:3000/api/opportunities?buyRegion=10000002&sellRegion=10000043"
   ```

2. **Verify response structure:**
   ```json
   {
     "success": true,
     "count": 1234,
     "data": [
       {
         "typeId": 34,
         "itemName": "Tritanium",
         "buyPrice": 5.50,
         "sellPrice": 6.20,
         "buyStation": 60003760,
         "sellStation": 60008494,
         "roi": 12.73,
         "volumeAvailable": 1000000
       }
     ],
     "meta": {
       "buyRegion": 10000002,
       "sellRegion": 10000043,
       "calculationTimeMs": 234
     }
   }
   ```

3. **Test validation:**
   ```bash
   # Same region (should return 400)
   curl "http://localhost:3000/api/opportunities?buyRegion=10000002&sellRegion=10000002"
   
   # Missing params (should return 400)
   curl "http://localhost:3000/api/opportunities?buyRegion=10000002"
   ```

4. **Test performance:**
   ```bash
   time curl "http://localhost:3000/api/opportunities?buyRegion=10000002&sellRegion=10000043"
   # Should complete in < 500ms
   ```

## Architecture Context

### Why In-Memory ROI Calculation

**Design Decision:**
- Calculate ROI on-the-fly (no pre-computed cache)
- Simplifies architecture (no cache invalidation)
- Fast enough with proper database indexes

**When to Cache:**
- If calculation exceeds 500ms consistently
- If same region pairs requested frequently
- Future: Add Redis/database cache (Story 2.5 concept)

**Verdict:** Start without cache, add if needed

### Why Map-Based Aggregation

**Performance Optimization:**
- Group orders by typeId using Map (O(n) lookup)
- Avoids nested loops (O(n²) → O(n))
- Essential for datasets with 10,000+ orders

**Algorithm:**
1. Build buy price map: O(n) where n = buy orders
2. Build sell price map: O(m) where m = sell orders
3. Calculate ROI: O(min(n, m)) matching items
4. Total: O(n + m) - linear time complexity

### Database Query Strategy

**Why Two Queries:**
- One for buy region sell orders
- One for sell region buy orders
- PostgreSQL handles these efficiently with indexes

**Index Requirements:**
- Composite index on (regionId, isBuyOrder, typeId)
- Created in Story 2.1 schema

### Response Payload Size

**2MB Limit Strategy:**
- Typical opportunity: ~150 bytes JSON
- 2MB / 150 bytes = ~13,000 opportunities max
- Most region pairs: 1,000-5,000 opportunities
- If exceeding: Add pagination or top-N limit

**Future Enhancement:**
- Add `?limit=1000` query param
- Return top 1000 opportunities by ROI

## Dev Notes

### Prerequisites

- Story 2.1 completed (MarketOrder table with data)
- Story 2.3 completed (market data populated)
- Database indexes exist on (regionId, isBuyOrder, typeId)

### No Additional Dependencies

- Uses Prisma client
- Uses Zod (already installed for ESI validation)

### Common Issues and Solutions

**Issue: Query takes > 500ms**
- Solution: Check database indexes exist: `pnpm prisma migrate dev`
- Use EXPLAIN ANALYZE to debug: `EXPLAIN ANALYZE SELECT ...`

**Issue: "Cannot find module '@/lib/db'"**
- Solution: Ensure lib/db.ts exports PrismaClient instance
- Run `pnpm prisma generate`

**Issue: Response payload exceeds 2MB**
- Solution: Add limit to opportunities array: `opportunities.slice(0, 1000)`
- Or implement pagination with skip/take params

**Issue: Item names show as "Unknown Item X"**
- Solution: Seed item names from ESI API
- Or accept typeId for MVP, add names later

**Issue: Negative ROI values appearing**
- Solution: Filter `roi > 0` before returning
- Check buy/sell price order correct (sell > buy for profit)

### Testing with Different Region Pairs

**High-traffic routes (many opportunities):**
- The Forge (10000002) → Domain (10000043) - Jita to Amarr
- The Forge (10000002) → Sinq Laison (10000032) - Jita to Dodixie

**Low-traffic routes (fewer opportunities):**
- Derelik (10000001) → Khanid (10000049)
- Tash-Murkon (10000020) → Kador (10000052)

**Test response times vary by route complexity.**

### Performance Expectations

**Typical Dataset:**
- Buy region: 10,000 orders
- Sell region: 8,000 orders
- Matching items: 2,000
- Profitable opportunities: 500

**Query Performance:**
- Database queries: ~100ms each (indexed)
- ROI calculation: ~50ms (Map operations)
- JSON serialization: ~20ms
- Total: ~200-300ms (well under 500ms target)

### Next Steps

After this story is complete:
1. **Story 4.2:** Build opportunity table component with virtual scrolling
2. **Story 4.3:** Add client-side column sorting
3. **Story 4.5:** Integrate table with region selectors

### References

**Source Documents:**
- [Architecture: Data Architecture](../planning-artifacts/architecture.md#data-architecture)
- [Architecture: Caching Strategy](../planning-artifacts/architecture.md#caching-strategy-database-query-cache)
- [PRD: Performance Targets](../planning-artifacts/prd.md#performance-targets)
- [Epic 4: Trading Opportunity Analysis & Display](../planning-artifacts/epics.md#epic-4-trading-opportunity-analysis--display)

**External Documentation:**
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Prisma Queries: https://www.prisma.io/docs/concepts/components/prisma-client/crud
- Zod Validation: https://zod.dev/

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
