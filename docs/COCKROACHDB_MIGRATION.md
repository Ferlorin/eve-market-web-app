# CockroachDB Migration Guide

**Date:** 2026-02-16
**Migration From:** Neon PostgreSQL (500MB free tier)
**Migration To:** CockroachDB Serverless (10GB free tier)

---

## Why We Migrated

### Problem
- Neon free tier: **500MB storage limit**
- EVE market data: ~400MB baseline
- Deletions without VACUUM caused bloat >500MB
- Required manual VACUUM cron jobs to reclaim space

### Solution: CockroachDB
- **10GB free tier** (20x more storage)
- **Auto-compaction** (no VACUUM needed)
- **PostgreSQL-compatible** (minimal code changes)
- **Free forever** (after $400 trial credits expire)

---

## Changes Made

### Schema & Configuration
1. **Prisma Provider:** Changed from `postgresql` to `cockroachdb`
2. **Migrations:** Backed up to `migrations_postgresql_backup/`, now using `db push`
3. **Shadow Database:** Removed (not needed for `db push` workflow)

### Code Changes
1. **Removed VACUUM Cron:**
   - Deleted `/api/cron/vacuum` endpoint
   - Removed from `vercel.json` cron schedule
   - CockroachDB auto-compacts, no manual VACUUM needed

2. **Updated Database Stats:**
   - Changed free tier limit from 512MB → 10,240MB (10GB)
   - Updated usage calculations in `cleanup-old-data.ts`

3. **Minor Fixes:**
   - `test-db.ts`: "PostgreSQL version" → "Database version"
   - `test-fetch.ts`: Added `dotenv/config` import

### Environment Variables
**Production (Vercel):**
```env
DATABASE_URL=postgresql://user:pass@cluster.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
DIRECT_DATABASE_URL=postgresql://user:pass@cluster.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

**Local Development:**
- Continues to use Docker PostgreSQL for faster local dev
- Production uses CockroachDB Serverless

---

## Migration Commands

### One-Time Setup (Already Done)
```bash
# 1. Update Prisma schema provider to cockroachdb
# 2. Set DATABASE_URL to CockroachDB connection string
# 3. Push schema to CockroachDB
npx prisma db push

# 4. Generate Prisma client
npx prisma generate

# 5. Mark failed migration as resolved (if any)
npx prisma migrate resolve --rolled-back "20260215220958_init_cockroachdb"
```

### Ongoing Development
```bash
# After schema changes, use db push instead of migrations
npx prisma db push

# Regenerate client after schema changes
npx prisma generate
```

---

## Benefits Achieved

| Metric | Neon (Before) | CockroachDB (After) |
|--------|---------------|---------------------|
| **Storage Limit** | 500MB | **10GB** (20x more) |
| **VACUUM Required** | Yes (manual cron) | **No** (auto-compacts) |
| **Cost** | Free | **Free forever** |
| **Data Bloat Issues** | Yes | **None** |
| **Cron Jobs Needed** | 2 (cleanup + vacuum) | **1** (cleanup only) |

---

## Compatibility Notes

### PostgreSQL Features NOT Supported by CockroachDB
- `SERIAL` type (use `BigInt` with `@id` instead)
- Dropping primary keys without adding new one in same transaction
- `VACUUM` command (not needed, auto-compacts)
- Some PostgreSQL extensions

### Prisma Workflow Changes
- **Before (Neon):** Used `prisma migrate dev` for schema changes
- **After (CockroachDB):** Use `prisma db push` (simpler, works better with CockroachDB)

---

## Deployment Checklist

When deploying to production:

- [ ] Update `DATABASE_URL` in Vercel environment variables
- [ ] Update `DIRECT_DATABASE_URL` in Vercel environment variables (same as DATABASE_URL)
- [ ] Remove VACUUM-related environment variables (if any)
- [ ] Redeploy application
- [ ] Verify `/api/health` endpoint shows healthy status
- [ ] Test market data fetch job
- [ ] Confirm cleanup cron job works (vacuum cron removed)

---

## Rollback Plan

If issues arise, rollback to Neon:

1. Revert `prisma/schema.prisma` provider to `postgresql`
2. Restore migrations from `migrations_postgresql_backup/`
3. Update `DATABASE_URL` back to Neon connection string
4. Re-add VACUUM cron job to `vercel.json`
5. Run `npx prisma generate` and redeploy

---

## Support

**CockroachDB Documentation:**
https://www.cockroachlabs.com/docs/

**Free Tier Limits:**
https://www.cockroachlabs.com/docs/cockroachcloud/serverless

**Prisma with CockroachDB:**
https://www.prisma.io/docs/orm/overview/databases/cockroachdb
