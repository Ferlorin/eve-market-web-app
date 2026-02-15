import { prisma } from '../src/lib/db';

async function vacuumDatabase() {
  console.log('🧹 Running VACUUM ANALYZE to reclaim space...\n');

  try {
    // VACUUM ANALYZE market_orders table
    await prisma.$executeRawUnsafe(`VACUUM ANALYZE market_orders`);
    console.log('✅ market_orders table vacuumed');

    // Get updated stats
    const result = await prisma.$queryRawUnsafe<Array<{
      table_name: string;
      total_size: string;
      table_size: string;
      indexes_size: string;
      row_count: bigint;
    }>>(`
      SELECT
        schemaname || '.' || tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
        (SELECT COUNT(*) FROM market_orders) AS row_count
      FROM pg_tables
      WHERE tablename = 'market_orders'
    `);

    console.log('\n📊 Database Size After VACUUM:');
    console.log('Table:', result[0].table_name);
    console.log('Total Size:', result[0].total_size);
    console.log('Table Size:', result[0].table_size);
    console.log('Indexes Size:', result[0].indexes_size);
    console.log('Row Count:', result[0].row_count.toString());

  } catch (error) {
    console.error('❌ VACUUM failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

vacuumDatabase();
