# Storage Optimization Plan

## Problem Diagnosed
Database exceeded 500MB due to DELETE+INSERT pattern causing:
1. **SERIAL sequence bloat** - auto-increment `id` columns grow endlessly even when rows are deleted
2. **Index fragmentation** - indexes rebuild on every fetch
3. **Dead tuples** - MVCC doesn't immediately reclaim space
4. **Redundant columns** - Every table has both SERIAL `id` AND unique ESI identifier

## Immediate Fix Applied ✅
- Changed `deleteMany` to raw `DELETE` in fetch-market-data.ts
- Better performance, less bloat

---

## Complete Migration Strategy

### **Option A: Comprehensive Fix** (Recommended)

Remove ALL redundant SERIAL `id` columns from all tables:
- ✅ **MarketOrder**: Use `orderId` as primary key (saves ~4MB per 1M rows)
- ✅ **Location**: Use `locationId` as primary key
- ✅ **ItemType**: Use `typeId` as primary key
- ✅ **Region**: Use `regionId` as primary key

**Total Benefits:**
- Eliminates ALL SERIAL bloat permanently
- Saves 4 bytes per row across all tables (~5MB total)
- IDs match ESI documentation (better debugging)
- Simpler schema (one column fewer per table)
- More semantic code

**Migration:** `scripts/migration-drop-all-serial-ids.sql`

---

## Execution Steps

### Step 1: Reclaim Space NOW
```bash
export DATABASE_URL="your-neon-connection-string"
npx tsx scripts/vacuum-database.ts
```

### Step 2: Deploy DELETE Fix
```bash
git add webapp/src/jobs/fetch-market-data.ts
git commit -m "fix: optimize market data deletion to reduce database bloat"
git push
```

### Step 3: Run Prisma Migration (Low-Traffic Period)
```bash
cd webapp

# Apply migration to production database
npx prisma migrate deploy

# This will apply: 20260215210925_remove_serial_ids
# - Drops all SERIAL id columns
# - Makes ESI IDs the primary keys
# - Takes ~2 min, locks tables during migration
```

### Step 4: Verify
```bash
npx tsx scripts/check-db-size.ts
```

---

## Expected Results

**After VACUUM (Step 1):**
- Database: ~300-350MB (30-40% reduction)

**After Migration (Step 3):**
- Database: ~280-320MB (additional ~5-10% savings)
- **No more SERIAL bloat ever**
- Stable storage footprint

**Long-term:**
- Stay under 400MB (80% of 500MB limit)
- Predictable growth pattern
- No sequence bloat accumulation

---

## Alternative: Partial Fix

If you want to minimize risk, just migrate MarketOrder first (largest table):
```sql
-- File: scripts/migration-remove-id-column.sql
-- Only removes id from market_orders table
```

Then migrate other tables later when comfortable.

---

## Monitoring

Check database size regularly:
```bash
export DATABASE_URL="your-neon-connection-string"
npx tsx scripts/check-db-size.ts
```

**Targets:**
- Current: <400MB (safe zone)
- Growth: ~50MB per month (stable)
- Alert: >450MB (investigate)
