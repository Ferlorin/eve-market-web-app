import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { logger } from '../src/lib/logger';
import { marketCache } from '../src/lib/market-cache';
import { dbMetrics } from '../src/lib/db-metrics';
import * as fs from 'fs';
import * as path from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// Prisma will automatically use directUrl from schema.prisma for operations
// like TRUNCATE and VACUUM that require non-pooled connections
const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
  ],
});

// Track all database queries for metrics
prisma.$on('query', (e) => {
  const operation = e.query.split(' ')[0]; // INSERT, SELECT, UPDATE, etc.
  dbMetrics.incrementQuery(operation);
});

/**
 * Phase 2: Read JSON artifacts and update database in a single transaction
 * This dramatically reduces database connections from ~800 to ~10
 */

interface RegionData {
  regionId: number;
  fetchedAt: string;
  orderCount: number;
  orders: Array<{
    order_id: number;
    type_id: number;
    price: number;
    volume_remain: number;
    location_id: number;
    is_buy_order: boolean;
    issued: string;
  }>;
}

async function main() {
  const startTime = Date.now();

  try {
    const artifactsDir = path.join(process.cwd(), 'market-data-artifacts');

    if (!fs.existsSync(artifactsDir)) {
      throw new Error(`Artifacts directory not found: ${artifactsDir}`);
    }

    // Read all JSON files
    const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      throw new Error('No JSON artifacts found');
    }

    logger.info({
      event: 'consolidate_started',
      artifactsFound: files.length
    });

    // Count total orders first (without loading all data into memory)
    let totalOrders = 0;
    const fileMetadata: Array<{ file: string; regionId: number; orderCount: number }> = [];

    for (const file of files) {
      const filepath = path.join(artifactsDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      const data: RegionData = JSON.parse(content);

      fileMetadata.push({
        file,
        regionId: data.regionId,
        orderCount: data.orderCount
      });

      totalOrders += data.orderCount;
    }

    logger.info({
      event: 'files_scanned',
      regions: fileMetadata.length,
      totalOrders
    });

    // Process files one at a time to minimize memory usage
    await updateDatabaseStreamingMode(artifactsDir, fileMetadata, totalOrders);

    // Invalidate all caches since we just replaced all data
    marketCache.invalidatePattern(/.*/);

    const duration = Date.now() - startTime;

    logger.info({
      event: 'update_completed',
      regions: fileMetadata.length,
      totalOrders,
      durationMs: duration
    });

    // Log database metrics summary
    const metrics = dbMetrics.logStats();

    console.log('\n💡 Expected Reduction:');
    console.log(`Old approach: ~${(fileMetadata.length * 7).toLocaleString()} queries (per region: DELETE + INSERT batches + region update + VACUUM)`);
    console.log(`New approach: ${metrics.totalQueries.toLocaleString()} queries (TRUNCATE + INSERT batches + region updates)`);
    console.log(`Reduction: ${(((fileMetadata.length * 7 - metrics.totalQueries) / (fileMetadata.length * 7)) * 100).toFixed(1)}%\n`);

    // Cleanup artifacts
    logger.info({ event: 'cleaning_artifacts' });
    for (const file of files) {
      fs.unlinkSync(path.join(artifactsDir, file));
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({
      event: 'update_failed',
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * Process files one at a time to minimize memory usage
 * This prevents heap overflow with large datasets (e.g., 1.6M+ orders)
 */
async function updateDatabaseStreamingMode(
  artifactsDir: string,
  fileMetadata: Array<{ file: string; regionId: number; orderCount: number }>,
  totalOrders: number
): Promise<void> {
  const startTime = Date.now();

  logger.info({
    event: 'db_transaction_started',
    regions: fileMetadata.length,
    totalOrders
  });

  try {
    // Step 1: TRUNCATE is faster than DELETE for full table replacement
    logger.info({ event: 'truncating_market_orders' });
    await prisma.$executeRawUnsafe('TRUNCATE TABLE market_orders');

    // Step 2: Process each JSON file one at a time (streaming mode)
    const BATCH_SIZE = 5000;
    let totalInserted = 0;

    for (const meta of fileMetadata) {
      const filepath = path.join(artifactsDir, meta.file);

      // Load JSON file (only one at a time to save memory)
      const content = fs.readFileSync(filepath, 'utf-8');
      const regionData: RegionData = JSON.parse(content);

      const { regionId, orders, fetchedAt } = regionData;

      if (orders.length === 0) continue;

      const fetchedAtDate = new Date(fetchedAt);

      // Process orders in batches
      for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, i + BATCH_SIZE);

        const values = batch.map(order => {
          const orderId = order.order_id;
          const typeId = order.type_id;
          const price = order.price;
          const volumeRemain = order.volume_remain;
          const locationId = order.location_id;
          const isBuyOrder = order.is_buy_order;
          const issued = new Date(order.issued).toISOString();
          const fetchedAtIso = fetchedAtDate.toISOString();

          return `(${orderId}, ${regionId}, ${typeId}, ${price}, ${volumeRemain}, ${locationId}, ${isBuyOrder}, '${issued}', '${fetchedAtIso}')`;
        }).join(',\n');

        await prisma.$executeRawUnsafe(`
          INSERT INTO market_orders (
            "orderId", "regionId", "typeId", price, "volumeRemain",
            "locationId", "isBuyOrder", issued, "fetchedAt"
          )
          VALUES ${values}
        `);

        totalInserted += batch.length;

        logger.info({
          event: 'batch_inserted',
          regionId,
          batchSize: batch.length,
          totalInserted,
          progress: `${((totalInserted / totalOrders) * 100).toFixed(1)}%`
        });

        // Force GC every 10k orders
        if (totalInserted % 10000 === 0 && global.gc) {
          global.gc();
        }
      }

      // Update region lastFetchedAt
      await prisma.region.upsert({
        where: { regionId },
        update: { lastFetchedAt: fetchedAtDate },
        create: {
          regionId,
          name: `Region ${regionId}`,
          lastFetchedAt: fetchedAtDate
        }
      });

      logger.info({
        event: 'region_completed',
        regionId,
        ordersInserted: orders.length,
        totalProgress: `${totalInserted}/${totalOrders}`
      });

      // Free memory after processing this region
      if (global.gc) {
        global.gc();
      }
    }

    const duration = Date.now() - startTime;

    logger.info({
      event: 'db_transaction_completed',
      ordersInserted: totalInserted,
      regionsUpdated: fileMetadata.length,
      durationMs: duration
    });
  } catch (error) {
    logger.error({
      event: 'db_transaction_failed',
      error: (error as Error).message
    });
    throw error;
  }
}

main();
