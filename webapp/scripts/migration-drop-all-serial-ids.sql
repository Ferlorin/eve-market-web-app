-- Migration: Remove all redundant SERIAL id columns
-- Use ESI-provided IDs as primary keys across all tables
--
-- Benefits:
-- - Eliminates SERIAL sequence bloat
-- - Saves 4 bytes per row across all tables
-- - IDs match ESI documentation
-- - Simpler, more semantic schema

BEGIN;

-- ============================================================
-- 1. MarketOrder: orderId -> Primary Key
-- ============================================================

-- Drop existing primary key
ALTER TABLE market_orders DROP CONSTRAINT market_orders_pkey;

-- Drop unique constraint on orderId (will become PK)
ALTER TABLE market_orders DROP CONSTRAINT market_orders_orderId_key;

-- Drop the redundant SERIAL id column
ALTER TABLE market_orders DROP COLUMN id;

-- Make orderId the primary key
ALTER TABLE market_orders ADD PRIMARY KEY ("orderId");

-- Existing composite index remains: (regionId, typeId)

-- ============================================================
-- 2. Location: locationId -> Primary Key
-- ============================================================

ALTER TABLE locations DROP CONSTRAINT locations_pkey;
ALTER TABLE locations DROP CONSTRAINT locations_locationId_key;
ALTER TABLE locations DROP COLUMN id;
ALTER TABLE locations ADD PRIMARY KEY ("locationId");

-- ============================================================
-- 3. ItemType: typeId -> Primary Key
-- ============================================================

ALTER TABLE item_types DROP CONSTRAINT item_types_pkey;
ALTER TABLE item_types DROP CONSTRAINT item_types_typeId_key;
ALTER TABLE item_types DROP COLUMN id;
ALTER TABLE item_types ADD PRIMARY KEY ("typeId");

-- ============================================================
-- 4. Region: regionId -> Primary Key
-- ============================================================

ALTER TABLE regions DROP CONSTRAINT regions_pkey;
ALTER TABLE regions DROP CONSTRAINT regions_regionId_key;
ALTER TABLE regions DROP COLUMN id;
ALTER TABLE regions ADD PRIMARY KEY ("regionId");

COMMIT;

-- ============================================================
-- Verification Queries (Run After Migration)
-- ============================================================

-- Check new primary keys
-- \d market_orders
-- \d locations
-- \d item_types
-- \d regions

-- Verify no SERIAL columns remain
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'integer'
  AND column_default LIKE 'nextval%';
-- Should return 0 rows

-- Check table sizes
SELECT
  schemaname || '.' || tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
