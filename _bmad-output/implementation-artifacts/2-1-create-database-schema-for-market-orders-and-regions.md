# Story 2.1: Create Database Schema for Market Orders and Regions

Status: ready-for-dev

## Story

As a developer,
I want to define Prisma schemas for storing EVE regions and market orders,
So that I can persist market data efficiently with proper indexing.

## Acceptance Criteria

**Given** Prisma is configured
**When** I define a `Region` model with fields: id (Int), regionId (Int unique), name (String), lastFetchedAt (DateTime nullable)
**And** I define a `MarketOrder` model with fields: id (Int), regionId (Int), typeId (Int), orderId (BigInt unique), price (Decimal), volumeRemain (Int), locationId (BigInt), isBuyOrder (Boolean), issued (DateTime), fetchedAt (DateTime)
**And** I add composite index @@index([regionId, typeId]) on MarketOrder for query optimization
**Then** running `pnpm prisma migrate dev --name init` creates the database tables successfully
**And** running `pnpm prisma generate` generates TypeScript types for both models
**And** I can query both tables using the Prisma client without errors

## Technical Requirements

###Prisma Schema Models

**Update: `prisma/schema.prisma`**

```prisma
// Generator and datasource already configured in Story 1.3
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// EVE Online Region Data
model Region {
  id             Int       @id @default(autoincrement())
  regionId       Int       @unique // ESI API region ID (e.g., 10000002 for The Forge)
  name           String    // Human-readable region name (e.g., "The Forge")
  lastFetchedAt  DateTime? // Timestamp of last successful market data fetch
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  @@map("regions")
}

// Market Order Data from ESI API
model MarketOrder {
  id            Int      @id @default(autoincrement())
  regionId      Int      // FK to region (not enforced - regions can be added dynamically)
  typeId        Int      // EVE item type ID
  orderId       BigInt   @unique // ESI API order ID (globally unique)
  price         Decimal  @db.Decimal(20, 2) // Order price (ISK)
  volumeRemain  Int      // Quantity still available
  locationId    BigInt   // Station/structure ID where order is placed
  isBuyOrder    Boolean  // true = buy order, false = sell order
  issued        DateTime // When the order was created
  fetchedAt     DateTime // When we fetched this data from ESI
  
  // Composite index for ROI query performance (NFR-P7: <500ms server-side)
  @@index([regionId, typeId])
  @@map("market_orders")
}
```

### Database Migration

```bash
# Create migration
pnpm prisma migrate dev --name init

# Expected output:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "eve_market" at "localhost:5432"
# 
# PostgreSQL database eve_market created at localhost:5432
# 
# Applying migration `20260214_init`
# 
# The following migration(s) have been created and applied from new schema changes:
# 
# migrations/
#   └─ 20260214_init/
#      └─ migration.sql
# 
# Your database is now in sync with your schema.
# 
# ✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client

# Generate TypeScript types
pnpm prisma generate
```

### TypeScript Type Generation

After migration, Prisma generates these TypeScript types:

```typescript
// Auto-generated in node_modules/@prisma/client
import type { Region, MarketOrder } from '@prisma/client';

// Example usage with full type safety
const region: Region = {
  id: 1,
  regionId: 10000002,
  name: 'The Forge',
  lastFetchedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const order: MarketOrder = {
  id: 1,
  regionId: 10000002,
  typeId: 34, // Tritanium
  orderId: BigInt(6182965480),
   price: new Prisma.Decimal(1250.50),
  volumeRemain: 500000,
  locationId: BigInt(60003760), // Jita 4-4
  isBuyOrder: false,
  issued: new Date('2026-02-14T09:00:00Z'),
  fetchedAt: new Date(),
};
```

### Database Seeding (Optional Test Data)

**Create: `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed initial region data (from ESI /universe/regions/)
  const regions = [
    { regionId: 10000002, name: 'The Forge' },
    { regionId: 10000043, name: 'Domain' },
    { regionId: 10000030, name: 'Heimatar' },
    { regionId: 10000032, name: 'Sinq Laison' },
    { regionId: 10000042, name: 'Metropolis' },
    // Add more regions as needed
  ];

  for (const region of regions) {
    await prisma.region.upsert({
      where: { regionId: region.regionId },
      update: {},
      create: region,
    });
  }

  console.log(`Seeded ${regions.length} regions`);
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
  }
}
```

**Run seeding:**
```bash
pnpm prisma db seed
```

## Architecture Context

### Database Design Rationale

**Normalized Schema:**
- Separate `Region` table allows tracking fetch timestamps per region
- `MarketOrder` table stores raw ESI data with minimal transformation
- No foreign key constraint on regionId (regions can be added dynamically from ESI API)

**Composite Index Strategy (NFR-P7):**
```sql
CREATE INDEX market_orders_regionId_typeId_idx 
ON market_orders (regionId, typeId);
```

**Why this index:**
- ROI queries join buy region orders + sell region orders by typeId
- Query: `WHERE regionId = ? AND typeId IN (...)`
- Index enables <500ms query on 10K+ items (meets NFR-P7)

**BigInt Usage:**
- ESI API order IDs and location IDs exceed JavaScript's `Number.MAX_SAFE_INTEGER`
- Prisma's `BigInt` maps to PostgreSQL `BIGINT` (64-bit integers)
- In code: `BigInt(6182965480)` notation required

**Decimal for Prices:**
- PostgreSQL `DECIMAL(20,2)` stores exact values (no floating-point errors)
- Prisma's `Decimal` type from `@prisma/client/runtime/library`
- Critical for financial calculations (ROI must be precise)

### Data Retention Strategy (NFR-R6)

**Free Tier Constraint: 0.5GB Neon PostgreSQL**

**Estimated Data Size:**
- 60 regions × 10,000 items × 100 orders = ~60M rows per day
- Each row: ~100 bytes = 6GB uncompressed per day
- **Problem:** Exceeds free tier in < 1 day!

**Solution: 7-Day Rolling Window (Story 2.5)**
- Delete orders where `fetchedAt < NOW() - INTERVAL '7 days'`
- Keeps ~420M rows × 100 bytes = ~42GB (too much!)
- **Adjustment needed:** Reduce retention or filter by volume/price

**Revised Strategy:**
- Keep only orders with `volumeRemain > 1000` (filter low-volume noise)
- Expected reduction: 90% of orders filtered
- Result: ~4.2GB for 7 days (still over limit)
- **Final approach:** 3-day retention + volume filter = ~1.8GB compressed (~0.4GB)

### Query Performance Optimization

**Critical Query (ROI Calculation):**
```sql
-- Find all profitable opportunities between two regions
SELECT 
  sell.typeId,
  sell.price AS sellPrice,
  sell.locationId AS sellStation,
  buy.price AS buyPrice,
  buy.locationId AS buyStation,
  buy.volumeRemain AS quantity,
  ((sell.price - buy.price) / buy.price * 100) AS roi
FROM market_orders sell
JOIN market_orders buy ON sell.typeId = buy.typeId
WHERE sell.regionId = ? 
  AND sell.isBuyOrder = true
  AND buy.regionId = ?
  AND buy.isBuyOrder = false
  AND sell.price > buy.price;
```

**Index Usage:**
1. Filter `market_orders` where `regionId = sellRegion` (uses index)
2. Filter `market_orders` where `regionId = buyRegion` (uses index)
3. Join on `typeId` (covered by composite index)
4. Result: <500ms for 10K+ items (meets NFR-P7)

## Dev Notes

### Prerequisites

- **Story 1.3:** Prisma configured and connected to Docker PostgreSQL ✅
- Docker PostgreSQL running: `docker-compose ps` shows "(healthy)" ✅

### Step-by-Step Implementation

```bash
# 1. Edit prisma/schema.prisma (add Region and MarketOrder models)

# 2. Create and apply migration
pnpm prisma migrate dev --name add_regions_and_orders

# 3. Generate TypeScript types
pnpm prisma generate

# 4. (Optional) Create seed file and run seeding
pnpm prisma db seed

# 5. Verify tables exist
docker-compose exec postgres psql -U postgres -d eve_market -c "\dt"
# Expected output:
#  Schema |      Name      | Type  |  Owner
#  -------+----------------+-------+----------
#  public | market_orders  | table | postgres
#  public | regions        | table | postgres

# 6. Test queries in Prisma Studio
pnpm prisma studio
# Opens http://localhost:5555 with database GUI
```

### Common Issues and Solutions

**Issue: "Prisma Client did not initialize yet"**
- **Solution:** Run `pnpm prisma generate` after schema changes

**Issue: Migration fails with "relation already exists"**
- **Solution:** Reset database: `pnpm prisma migrate reset` (loses all data)

**Issue: BigInt serialization error in API routes**
- **Solution:** Convert BigInt to string for JSON responses:
  ```typescript
  JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  ```

**Issue: Decimal operations not working**
- **Solution:** Import Decimal from Prisma:
  ```typescript
  import { Prisma } from '@prisma/client';
  const price = new Prisma.Decimal(1250.50);
  ```

### Verification Checklist

- [ ] `prisma/schema.prisma` contains Region and MarketOrder models
- [ ] `pnpm prisma migrate dev` creates migration successfully
- [ ] `pnpm prisma generate` completes without errors
- [ ] Docker PostgreSQL has `regions` and `market_orders` tables
- [ ] Composite index exists: `\d market_orders` shows index on (regionId, typeId)
- [ ] TypeScript types available: can import `Region`, `MarketOrder` from `@prisma/client`
- [ ] Prisma Studio displays both tables: `pnpm prisma studio`

### Next Steps

After this story is complete:
1. **Story 2.2:** Build ESI API client that fetches data
2. **Story 2.3:** Implement fetch logic that populates these tables
3. **Story 2.5:** Add cleanup job to maintain 7-day rolling window

### References

- [Architecture: Data Architecture](../planning-artifacts/architecture.md#data-architecture)
- [PRD: FR2 (Store market data for performance)](../planning-artifacts/prd.md#functional-requirements)
- [Epic 2: Story 2.1](../planning-artifacts/epics.md#story-21-create-database-schema-for-market-orders-and-regions)
- Prisma Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

## Tasks/Subtasks

### Task 1: Update Prisma Schema
- [x] 1.1: Add Region model to `prisma/schema.prisma`
- [x] 1.2: Add MarketOrder model with composite index
- [x] 1.3: Verify schema syntax is correct

### Task 2: Create Database Migration
- [x] 2.1: Run `npx prisma migrate dev --name add_regions_and_orders`
- [x] 2.2: Verify migration creates tables successfully
- [x] 2.3: Generate Prisma Client with `npx prisma generate`

### Task 3: Create Seed File (Optional)
- [x] 3.1: Create `prisma/seed.ts` with region data
- [x] 3.2: Add seed script to `prisma.config.ts`
- [x] 3.3: Run `npx prisma db seed` to populate initial data

### Task 4: Verify Database Schema
- [x] 4.1: Check tables exist in PostgreSQL
- [x] 4.2: Verify composite index on market_orders
- [x] 4.3: Test Prisma Client queries
- [x] 4.4: Open Prisma Studio and verify tables visible

### Task 5: Documentation
- [x] 5.1: Document completion in Dev Agent Record
- [x] 5.2: List all modified/created files
- [x] 5.3: Mark story as ready-for-review

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes

**Completed:** 2026-02-14

**Migration:**
- Migration name: `20260214201515_add_regions_and_orders`
- Created tables: `regions`, `market_orders`
- Composite index: `market_orders_regionId_typeId_idx` on (regionId, typeId)

**Seed Data:**
- Seeded 10 EVE regions (The Forge, Domain, Heimatar, etc.)
- Used Prisma adapter pattern with pg Pool for seed compatibility

**Build Status:**
- Build completed successfully
- All TypeScript types generated
- Prisma Client v7.4.0

**Status:** ready-for-review

### File List

**Modified:**
- `webapp/prisma/schema.prisma` - Added Region and MarketOrder models
- `webapp/prisma.config.ts` - Added seed command configuration

**Created:**
- `webapp/prisma/migrations/20260214201515_add_regions_and_orders/migration.sql` - Database migration
- `webapp/prisma/seed.ts` - Database seed file with initial regions
