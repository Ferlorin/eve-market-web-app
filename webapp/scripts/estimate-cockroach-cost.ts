import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Estimate CockroachDB Request Units (RUs) based on current workload
 *
 * CockroachDB RU pricing (approximate):
 * - Read: 1 RU per KB read
 * - Write: 1 RU per row written
 * - CPU: varies by operation complexity
 *
 * Serverless pricing: ~$1 per 10M RUs
 */

async function estimateCockroachCost() {
  console.log('📊 Analyzing workload for CockroachDB cost estimation...\n');

  try {
    // 1. Get query statistics
    const queryStats = await prisma.$queryRawUnsafe<Array<{
      query: string;
      calls: bigint;
      total_exec_time: number;
      mean_exec_time: number;
      rows: bigint;
      shared_blks_read: bigint;
      shared_blks_hit: bigint;
    }>>(`
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        shared_blks_read,
        shared_blks_hit
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT 50
    `);

    console.log(`📈 Top 50 queries by execution time:\n`);

    let totalReads = BigInt(0);
    let totalWrites = BigInt(0);
    let totalRows = BigInt(0);

    queryStats.forEach((stat, idx) => {
      const queryType = stat.query.trim().split(' ')[0].toUpperCase();
      const isWrite = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(queryType);

      totalRows += stat.rows;

      if (isWrite) {
        totalWrites += stat.rows;
      } else {
        totalReads += stat.rows;
      }

      if (idx < 10) {
        console.log(`${idx + 1}. ${queryType}: ${stat.calls} calls, ${stat.rows} rows, ${stat.mean_exec_time.toFixed(2)}ms avg`);
      }
    });

    console.log(`\n📊 Workload Summary:`);
    console.log(`Total rows read: ${totalReads.toLocaleString()}`);
    console.log(`Total rows written: ${totalWrites.toLocaleString()}`);
    console.log(`Total operations: ${totalRows.toLocaleString()}`);

    // 2. Get table sizes
    const tableSizes = await prisma.$queryRawUnsafe<Array<{
      table_name: string;
      row_count: bigint;
      total_size: string;
      table_size_bytes: bigint;
    }>>(`
      SELECT
        schemaname || '.' || tablename AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS table_size_bytes
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    console.log(`\n💾 Table Sizes:`);
    tableSizes.forEach(table => {
      console.log(`  ${table.table_name}: ${table.row_count.toLocaleString()} rows, ${table.total_size}`);
    });

    const totalSizeBytes = tableSizes.reduce((sum, t) => sum + Number(t.table_size_bytes), 0);
    const totalSizeGB = totalSizeBytes / (1024 ** 3);

    // 3. Estimate RUs
    console.log(`\n💰 CockroachDB Cost Estimation:`);
    console.log(`─────────────────────────────────────────`);

    // Rough RU estimation:
    // - 1 RU per 1KB read (assume 8KB blocks, so shared_blks_read * 8)
    // - 1 RU per row written
    // - Add 20% overhead for CPU/network

    const totalBlocks = queryStats.reduce((sum, s) => sum + Number(s.shared_blks_read), 0);
    const estimatedReadKB = totalBlocks * 8; // 8KB per block
    const readRUs = estimatedReadKB; // ~1 RU per KB

    const writeRUs = Number(totalWrites);

    const totalRUs = Math.ceil((readRUs + writeRUs) * 1.2); // 20% overhead

    console.log(`Estimated Read RUs: ${readRUs.toLocaleString()}`);
    console.log(`Estimated Write RUs: ${writeRUs.toLocaleString()}`);
    console.log(`Total RUs (with 20% overhead): ${totalRUs.toLocaleString()}`);

    // CockroachDB Serverless pricing: ~$1 per 10M RUs
    const costPer10MRUs = 1.0;
    const estimatedCost = (totalRUs / 10_000_000) * costPer10MRUs;

    console.log(`\n💵 Cost Estimate (CockroachDB Serverless):`);
    console.log(`  ~$${estimatedCost.toFixed(4)} for this period`);
    console.log(`  Storage: ${totalSizeGB.toFixed(2)} GB (~$${(totalSizeGB * 1.0).toFixed(2)}/month)`);

    // 4. Monthly projection (based on current stats duration)
    const statsAge = await prisma.$queryRawUnsafe<Array<{ stats_reset: Date }>>(`
      SELECT stats_reset FROM pg_stat_statements_info
    `);

    if (statsAge.length > 0) {
      const hoursTracked = (Date.now() - statsAge[0].stats_reset.getTime()) / (1000 * 60 * 60);
      const monthlyMultiplier = (30 * 24) / hoursTracked;

      console.log(`\n📅 Monthly Projection:`);
      console.log(`  Stats tracked for: ${hoursTracked.toFixed(1)} hours`);
      console.log(`  Monthly RUs: ~${(totalRUs * monthlyMultiplier).toLocaleString()}`);
      console.log(`  Monthly cost (compute): ~$${(estimatedCost * monthlyMultiplier).toFixed(2)}`);
      console.log(`  Monthly cost (storage): ~$${(totalSizeGB * 1.0).toFixed(2)}`);
      console.log(`  Total monthly estimate: ~$${((estimatedCost * monthlyMultiplier) + (totalSizeGB * 1.0)).toFixed(2)}`);
    }

    console.log(`\n⚠️  Note: This is a rough estimate. Actual RUs may vary based on:`);
    console.log(`  - Query complexity`);
    console.log(`  - Network egress`);
    console.log(`  - Index usage`);
    console.log(`  - Transaction complexity`);

    console.log(`\n🔗 For accurate pricing, use CockroachDB's calculator:`);
    console.log(`  https://www.cockroachlabs.com/pricing/`);

  } catch (error) {
    if ((error as any).message?.includes('pg_stat_statements')) {
      console.error('\n❌ pg_stat_statements extension not found.');
      console.error('Run this first:');
      console.error('  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;\n');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

estimateCockroachCost();
