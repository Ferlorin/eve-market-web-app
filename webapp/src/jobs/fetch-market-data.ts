import { esiClient, ESIError } from '@/lib/esi-client';
import { prisma } from '@/lib/db';
import pLimit from 'p-limit';
import { logger } from '@/lib/logger';
import { marketCache } from '@/lib/market-cache';

const limit = pLimit(1); // Process one region at a time to minimize memory usage

// Special handling for high-volume regions (>100k orders)
// These regions are processed in dedicated parallel jobs to avoid bottlenecks
const HIGH_VOLUME_REGIONS = [
  10000002, // The Forge (444k orders, ~47s)
  10000043, // Domain (196k orders, ~21s)
  10000042, // Metropolis (127k orders, ~13s)
  10000032, // Sinq Laison (124k orders, ~13s)
];

export async function fetchAllRegions(chunkIndex?: number, totalChunks?: number, specificRegions?: number[]) {
  const startTime = Date.now();
  logger.info({ event: 'fetch_started', chunkIndex, totalChunks, specificRegions });
  
  try {
    // Fetch list of all EVE regions
    const allRegionIds = await esiClient.getAllRegions();
    
    // Handle specific regions mode (for dedicated high-volume region processing)
    if (specificRegions && specificRegions.length > 0) {
      logger.info({
        event: 'specific_regions_mode',
        regions: specificRegions,
        totalRegions: specificRegions.length
      });
      
      const regionIds = specificRegions;
      
      // Process the specific regions with retries
      let successful = 0;
      let failed = 0;
      
      const promises = regionIds.map(regionId => 
        limit(() => fetchRegionWithRetry(regionId))
      );
      
      const results = await Promise.allSettled(promises);
      
      successful = results.filter(r => r.status === 'fulfilled').length;
      failed = results.length - successful;
      
      const duration = Date.now() - startTime;
      
      logger.info({
        event: 'fetch_completed',
        total: regionIds.length,
        successful,
        failed,
        durationMs: duration,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      });
      
      return { regionsProcessed: successful, failed, duration };
    }
    
    // Filter to only process this chunk if chunking is enabled
    // Exclude high-volume regions from normal chunks (they get dedicated jobs)
    let regionIds = allRegionIds.filter(id => !HIGH_VOLUME_REGIONS.includes(id));
    
    if (chunkIndex !== undefined && totalChunks !== undefined && totalChunks > 1) {
      const chunkSize = Math.ceil(regionIds.length / totalChunks);
      const startIdx = chunkIndex * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, regionIds.length);
      regionIds = regionIds.slice(startIdx, endIdx);
      
      logger.info({
        event: 'chunk_info',
        chunkIndex,
        totalChunks,
        totalRegions: allRegionIds.length,
        excludedHighVolumeRegions: HIGH_VOLUME_REGIONS, 
        chunkRegions: regionIds.length,
        regionRange: `${startIdx}-${endIdx - 1}`
      });
    }
    
    logger.info({ event: 'regions_loaded', count: regionIds.length });
    
    // Process regions in sequential batches to prevent memory overflow
    const BATCH_SIZE = 5;
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < regionIds.length; i += BATCH_SIZE) {
      const batch = regionIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(regionIds.length / BATCH_SIZE);
      
      logger.info({
        event: 'batch_started',
        batch: batchNum,
        totalBatches,
        regions: batch
      });
      
      // Process batch with concurrency limit
      const promises = batch.map(regionId => 
        limit(() => fetchRegionWithRetry(regionId))
      );
      
      const results = await Promise.allSettled(promises);
      
      // Count results for this batch
      const batchSuccessful = results.filter(r => r.status === 'fulfilled').length;
      const batchFailed = results.length - batchSuccessful;
      successful += batchSuccessful;
      failed += batchFailed;
      
      logger.info({
        event: 'batch_completed',
        batch: batchNum,
        totalBatches,
        batchSuccessful,
        batchFailed,
        totalSuccessful: successful,
        totalFailed: failed,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      });
      
      // Force GC and pause between batches to allow memory cleanup
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to allow GC to complete
      if (i + BATCH_SIZE < regionIds.length) {
        await sleep(500);
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'fetch_completed',
      total: regionIds.length,
      successful,
      failed,
      durationMs: duration,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
    
    return { regionsProcessed: successful, failed, duration };
  } catch (error) {
    const err = error as Error;
    logger.error({
      event: 'fetch_failed',
      error: err.message,
      stack: err.stack,
    });
    throw error;
  }
}

async function fetchRegionWithRetry(regionId: number, maxRetries = 3): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Delete existing orders for this region first
      const deleteResult = await prisma.marketOrder.deleteMany({
        where: { regionId }
      });

      // Stream pages directly to DB — never accumulate all orders in memory
      let totalInserted = 0;
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { orders, totalPages } = await esiClient.getRegionOrdersPage(regionId, page);

        if (orders.length > 0) {
          // Use PostgreSQL COPY for 10x faster bulk insert
          await bulkInsertOrders(orders, regionId);
          totalInserted += orders.length;
        }

        hasMorePages = page < totalPages;
        page++;
        
        // Force GC every 5 pages to prevent accumulation
        if (page % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      // Update region timestamp
      await prisma.region.upsert({
        where: { regionId },
        update: { lastFetchedAt: new Date() },
        create: {
          regionId,
          name: `Region ${regionId}`,
          lastFetchedAt: new Date()
        }
      });

      // Invalidate cache AFTER new data is inserted so users get
      // stale cached data during the fetch window rather than empty results
      marketCache.invalidatePattern(new RegExp(`^region:${regionId}:`));

      logger.info({
        event: 'region_fetched',
        regionId,
        ordersDeleted: deleteResult.count,
        ordersInserted: totalInserted,
        pages: page - 1,
        attempt: attempt + 1,
        cacheInvalidated: true,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      });
      
      return; // Success
    } catch (error) {
      lastError = error as Error;

      if (error instanceof ESIError && error.statusCode === 503 && attempt < maxRetries - 1) {
        const delay = 5000 * Math.pow(2, attempt);
        logger.warn({
          event: 'esi_503_retry',
          regionId,
          attempt: attempt + 1,
          delayMs: delay
        });
        await sleep(delay);
      } else if (attempt < maxRetries - 1) {
        await sleep(1000);
      }
    }
  }

  if (lastError) {
    logger.error({
      event: 'region_fetch_failed',
      regionId,
      error: lastError.message,
      attempts: maxRetries
    });
  }
}

/**
 * Bulk insert orders using raw SQL for 5-10x faster performance
 * Processes in batches to avoid query size limits
 */
async function bulkInsertOrders(
  orders: Array<{
    order_id: number;
    type_id: number;
    price: number;
    volume_remain: number;
    location_id: number;
    is_buy_order: boolean;
    issued: string;
  }>,
  regionId: number
): Promise<void> {
  if (orders.length === 0) return;

  const BATCH_SIZE = 1000; // Insert 1000 rows at a time
  const now = new Date();

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    
    // Build VALUES clause for batch insert
    const values = batch.map(order => {
      const orderId = order.order_id;
      const typeId = order.type_id;
      const price = order.price;
      const volumeRemain = order.volume_remain;
      const locationId = order.location_id;
      const isBuyOrder = order.is_buy_order;
      const issued = new Date(order.issued).toISOString();
      const fetchedAt = now.toISOString();
      
      return `(${orderId}, ${regionId}, ${typeId}, ${price}, ${volumeRemain}, ${locationId}, ${isBuyOrder}, '${issued}', '${fetchedAt}')`;
    }).join(',\n');

    // Execute bulk insert with ON CONFLICT to skip duplicates
    await prisma.$executeRawUnsafe(`
      INSERT INTO market_orders (
        "orderId", "regionId", "typeId", price, "volumeRemain",
        "locationId", "isBuyOrder", issued, "fetchedAt"
      )
      VALUES ${values}
      ON CONFLICT ("orderId") DO NOTHING
    `);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
