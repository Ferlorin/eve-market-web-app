# Story 1.3: Set Up Prisma ORM and Database Connection

Status: ready-for-dev

## Story

As a developer,
I want to configure Prisma with a connection to Neon PostgreSQL (or local Docker PostgreSQL),
So that I can define database schemas and generate type-safe database clients.

## Acceptance Criteria

**Given** the Next.js project and Docker PostgreSQL are running
**When** I install Prisma (`pnpm add -D prisma @prisma/client`)
**Then** running `pnpm prisma init` creates a `prisma/schema.prisma` file and `.env` file
**And** I configure the DATABASE_URL in `.env` (postgresql://postgres:postgres@localhost:5432/eve_market for local dev)
**And** the schema.prisma file is configured with `provider = "postgresql"`
**And** running `pnpm prisma generate` succeeds without errors
**And** I can create a `lib/db.ts` file that exports a PrismaClient singleton

## Technical Requirements

### Installation

```bash
# Install Prisma CLI (dev dependency) and client library
pnpm add -D prisma
pnpm add @prisma/client

# Initialize Prisma (creates prisma/schema.prisma and .env)
pnpm prisma init
```

### Prisma Schema Configuration

**File: `prisma/schema.prisma`**

```prisma
// Prisma schema for EVE Market Web App
// This is the foundation - actual models added in Story 2.1

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Models will be added in Story 2.1:
// - Region (EVE region data)
// - MarketOrder (market order data from ESI API)
```

### Environment Configuration

**File: `.env` (root of project)**

```bash
# Database connection string for Prisma
# Local development (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eve_market?schema=public"

# Production (Neon PostgreSQL - configured in Vercel dashboard)
# Vercel auto-injects DATABASE_URL from Neon integration
```

**Update `.gitignore`:**
```
# Prisma
.env
prisma/migrations/
```

**Note:** `.env.local` (from Story 1.2) is for Next.js. `.env` is for Prisma CLI. Both can coexist.

### PrismaClient Singleton

**File: `src/lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Prevents exhausting database connections during hot reload in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

**Why Singleton Pattern:**
- **Hot Reload Protection:** Next.js dev mode re-imports modules, creating multiple PrismaClient instances
- **Connection Pooling:** Single client reuses connections efficiently
- **Development Logging:** Query logs enabled in dev mode for debugging

### Prisma Commands Reference

```bash
# Generate Prisma Client (run after schema changes)
pnpm prisma generate

# Create migration (after adding models in Story 2.1)
pnpm prisma migrate dev --name init

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Format schema file
pnpm prisma format

# Validate schema syntax
pnpm prisma validate

# Reset database (wipes all data)
pnpm prisma migrate reset
```

### Connection Testing

**Create test file: `src/lib/test-db.ts`**

```typescript
import { prisma } from './db';

async function testConnection() {
  try {
    // Test connection by querying database metadata
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Query PostgreSQL version
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 PostgreSQL version:', result);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

**Run test:**
```bash
pnpm tsx src/lib/test-db.ts
# Expected output:
# ✅ Database connection successful
# 📊 PostgreSQL version: PostgreSQL 16.x ...
```

## Architecture Context

### Why Prisma ORM

**Architecture Decision:** Prisma chosen over raw SQL, TypeORM, or Drizzle

**Benefits for This Project:**
- **Type Safety:** Generated TypeScript types from schema (prevents runtime errors)
- **Auto-complete:** Full IDE support for queries (e.g., `prisma.marketOrder.findMany()`)
- **Migration Management:** Version-controlled schema changes
- **Neon Compatibility:** First-class support for Neon's connection pooling
- **Developer Experience:** Prisma Studio GUI for debugging database state

**Comparison to Alternatives:**
| Feature | Prisma | TypeORM | Drizzle | Raw SQL |
|---------|--------|---------|---------|---------|
| Type Safety | ✅ Excellent | ⚠️ Good | ✅ Excellent | ❌ None |
| Learning Curve | ✅ Low | ⚠️ Medium | ⚠️ Medium | ✅ Low |
| Performance | ✅ Good | ⚠️ Medium | ✅ Excellent | ✅ Excellent |
| Migrations | ✅ Built-in | ✅ Built-in | ⚠️ Manual | ❌ Manual |
| Neon Support | ✅ Native | ⚠️ Generic | ✅ Native | ✅ Native |

**For This Project:** Prisma's type safety + low learning curve outweighs Drizzle's performance edge at this scale.

### Database Connection Strategy

**Development Environment:**
- Prisma connects to Docker PostgreSQL at `localhost:5432`
- Direct connection (no pooling needed for single developer)
- Query logging enabled for debugging

**Production Environment (Neon):**
- Vercel injects `DATABASE_URL` from Neon integration
- Neon handles connection pooling (serverless-friendly)
- Automatic SSL encryption
- Connection URL format: `postgresql://user:pass@ep-xyz.neon.tech/dbname?sslmode=require`

**Connection Pooling:**
- Local dev: No pooling (direct connection via Docker)
- Production: Neon's built-in pooler (handles serverless function concurrency)
- If scaling issues: Add Prisma Accelerate ($25/month, not needed for MVP)

### Data Migration Strategy

**Migration Workflow (Story 2.1+):**
1. Define models in `prisma/schema.prisma`
2. Run `pnpm prisma migrate dev --name add_regions`
3. Prisma generates SQL and applies to database
4. Git commit both schema and migration files
5. CI/CD applies migrations to production on deploy

**Reversible Migrations (NFR-M6):**
- Prisma migrations are forward-only (no automatic rollback)
- Manual rollback: Restore database backup or write reverse migration
- For MVP: Accept risk, add proper backup strategy if scaling

### TypeScript Integration

**Generated Types (after `prisma generate`):**
```typescript
import { MarketOrder, Region } from '@prisma/client';

// Full type safety in application code
const order: MarketOrder = {
  id: 1,
  regionId: 10000002,
  typeId: 34,
  orderId: BigInt(123456789),
  price: new Decimal(1250.50),
  volumeRemain: 500,
  locationId: BigInt(60003760),
  isBuyOrder: false,
  issued: new Date(),
  fetchedAt: new Date(),
};

// Auto-complete works in queries
const orders = await prisma.marketOrder.findMany({
  where: { regionId: 10000002, typeId: 34 },
  orderBy: { price: 'asc' },
  take: 100,
});
```

## Dev Notes

### Prerequisites

- **Story 1.1:** Next.js project initialized ✅
- **Story 1.2:** Docker PostgreSQL running (`docker-compose ps` shows "healthy") ✅
- **Node.js 20.9+** with pnpm installed

### Installation Steps (Detailed)

```bash
# 1. Install Prisma packages
pnpm add -D prisma
pnpm add @prisma/client

# 2. Initialize Prisma
pnpm prisma init
# Output: Created prisma/schema.prisma and .env

# 3. Update .env with Docker PostgreSQL URL
# (Already done if following Story 1.2)

# 4. Generate Prisma Client
pnpm prisma generate
# Output: Generated Prisma Client to node_modules/@prisma/client

# 5. Create db.ts singleton
# (See code above)

# 6. Test connection
pnpm tsx src/lib/test-db.ts
```

### Common Issues and Solutions

**Issue: "Environment variable not found: DATABASE_URL"**
- **Solution:** Ensure `.env` file exists in project root with `DATABASE_URL` set
- **Check:** `cat .env` should show the connection string

**Issue: "Can't reach database server at localhost:5432"**
- **Solution:** Start Docker PostgreSQL: `docker-compose up -d`
- **Verify:** `docker-compose ps` should show "Up (healthy)"

**Issue: "Error: P1001: Can't connect to database"**
- **Solution:** Check connection string format:
  ```
  postgresql://USER:PASSWORD@HOST:PORT/DATABASE
  postgresql://postgres:postgres@localhost:5432/eve_market
  ```

**Issue: "PrismaClient is unable to be run in the browser"**
- **Solution:** Never import `prisma` in client components (use API routes or server components)

**Issue: Multiple PrismaClient instances warning in dev**
- **Solution:** Use singleton pattern from `lib/db.ts` (see code above)

### Verification Checklist

After completing this story, verify:

- [ ] `pnpm add -D prisma` and `pnpm add @prisma/client` successful
- [ ] `prisma/schema.prisma` exists with PostgreSQL provider
- [ ] `.env` file contains valid `DATABASE_URL`
- [ ] `pnpm prisma generate` completes without errors
- [ ] `src/lib/db.ts` exports PrismaClient singleton
- [ ] Test connection script runs successfully
- [ ] `node_modules/@prisma/client` directory exists (generated code)

### Next Steps After Completion

After this story is complete:
1. **Story 1.4:** Install Headless UI, TanStack Virtual, axios, zod, date-fns
2. **Story 2.1:** Define database schema (Region, MarketOrder models)
3. **Story 2.2:** Build ESI API client that uses Prisma to store data

**Don't create database tables yet**—that's Story 2.1. This story just sets up Prisma infrastructure.

### Performance Notes

**Prisma Query Performance:**
- **Simple queries:** 10-50ms (local dev)
- **Complex joins:** 50-200ms (depends on indexes)
- **Connection overhead:** ~5ms (reused via singleton)

**Bundle Size Impact:**
- Prisma Client: ~500KB (not included in frontend bundle)
- Only imported in API routes and server components (backend only)

**Database Indexes (Story 2.1):**
- Add composite index on `(region_id, type_id)` for ROI queries
- Meets NFR-P7 requirement: ROI calculations <500ms server-side

### References

**Source Documents:**
- [Architecture: Data Architecture](../planning-artifacts/architecture.md#data-architecture)
- [Architecture: Database Selection (Neon)](../planning-artifacts/architecture.md#database-postgresql-via-neon-free-tier)
- [PRD: Database Requirements](../planning-artifacts/prd.md#functional-requirements)
- [Epic 1: Story 1.3](../planning-artifacts/epics.md#story-13-set-up-prisma-orm-and-database-connection)

**External Documentation:**
- Prisma Docs: https://www.prisma.io/docs
- Prisma with Next.js: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Neon + Prisma: https://neon.tech/docs/guides/prisma

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
