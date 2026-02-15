-- Migration: Remove redundant auto-increment id column
-- Use orderId as primary key instead (saves space and eliminates SERIAL bloat)

BEGIN;

-- 1. Drop existing primary key
ALTER TABLE market_orders DROP CONSTRAINT market_orders_pkey;

-- 2. Drop the redundant id column
ALTER TABLE market_orders DROP COLUMN id;

-- 3. Make orderId the primary key
ALTER TABLE market_orders ADD PRIMARY KEY ("orderId");

-- Existing indexes remain:
-- - UNIQUE index on orderId (now primary key)
-- - Composite index on (regionId, typeId)

COMMIT;

-- Result:
-- - Saves 4 bytes per row (SERIAL column removed)
-- - Eliminates SERIAL sequence bloat
-- - One less index to maintain
-- - For 1M rows: saves ~4MB per fetch cycle
