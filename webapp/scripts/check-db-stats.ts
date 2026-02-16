import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDatabaseStats() {
  console.log('📊 Database Statistics\n');

  try {
    // Row counts
    const marketOrders = await prisma.marketOrder.count();
    const regions = await prisma.region.count();
    const itemTypes = await prisma.itemType.count();
    const locations = await prisma.location.count();

    const totalRows = marketOrders + regions + itemTypes + locations;

    console.log('Row Counts:');
    console.log(`  market_orders: ${marketOrders.toLocaleString()}`);
    console.log(`  regions: ${regions.toLocaleString()}`);
    console.log(`  item_types: ${itemTypes.toLocaleString()}`);
    console.log(`  locations: ${locations.toLocaleString()}`);
    console.log(`  TOTAL: ${totalRows.toLocaleString()}\n`);

    // Table sizes
    const sizes = await prisma.$queryRawUnsafe<Array<{
      table_name: string;
      row_count: bigint;
      total_size: string;
      table_size: string;
      indexes_size: string;
    }>>(`
      SELECT
        schemaname || '.' || tablename AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    console.log('Table Sizes:');
    sizes.forEach(s => {
      console.log(`  ${s.table_name}:`);
      console.log(`    Rows: ${Number(s.row_count).toLocaleString()}`);
      console.log(`    Total: ${s.total_size}`);
      console.log(`    Table: ${s.table_size}`);
      console.log(`    Indexes: ${s.indexes_size}`);
    });

    // Database size
    const dbSize = await prisma.$queryRawUnsafe<Array<{
      database: string;
      size: string;
    }>>(`
      SELECT
        current_database() AS database,
        pg_size_pretty(pg_database_size(current_database())) AS size
    `);

    console.log(`\nTotal Database Size: ${dbSize[0].size}\n`);

    // Capacity analysis for Heroku Mini (10M rows, 20 GB)
    const rowCapacity = (totalRows / 10_000_000) * 100;
    console.log('📈 Heroku Postgres Mini Capacity:');
    console.log(`  Rows: ${totalRows.toLocaleString()} / 10M (${rowCapacity.toFixed(1)}%)`);
    console.log(`  Status: ${rowCapacity < 80 ? '✅ OK' : '⚠️  Approaching limit'}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStats();
