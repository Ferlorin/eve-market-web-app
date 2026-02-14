import { esiClient, ESIError } from '@/lib/esi-client';
import { prisma } from '@/lib/db';
import pLimit from 'p-limit';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const limit = pLimit(1); // Process one region at a time to minimize memory usage

export async function fetchAllRegions() {
  const startTime = Date.now();
  logger.info({ event: 'fetch_started' });
  
  try {
    // Fetch list of all EVE regions
    const regionIds = await esiClient.getAllRegions();
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
        totalFailed: failed
      });
      
      // Force GC and pause between batches to allow memory cleanup
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to allow GC to complete
      if (i + BATCH_SIZE < regionIds.length) {
        await sleep(2000);
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'fetch_completed',
      total: regionIds.length,
      successful,
      failed,
      durationMs: duration
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
      let orders = await esiClient.getRegionOrders(regionId);
      
      // Use transaction to replace all orders for this region atomically
      // Increased timeout for large regions (50K+ orders can take 30+ seconds)
      const result = await prisma.$transaction(async (tx) => {
        // Delete all existing orders for this region
        const deleteResult = await tx.marketOrder.deleteMany({
          where: { regionId }
        });

        // Insert fresh orders from ESI in batches to prevent heap overflow
        const BATCH_SIZE = 500; // Smaller batches to reduce memory pressure
        let totalInserted = 0;

        if (orders.length > 0) {
          for (let i = 0; i < orders.length; i += BATCH_SIZE) {
            const batch = orders.slice(i, i + BATCH_SIZE);

            await tx.marketOrder.createMany({
              data: batch.map(order => ({
                orderId: BigInt(order.order_id),
                regionId: regionId,
                typeId: order.type_id,
                price: new Prisma.Decimal(order.price),
                volumeRemain: order.volume_remain,
                locationId: BigInt(order.location_id),
                isBuyOrder: order.is_buy_order,
                issued: new Date(order.issued),
                fetchedAt: new Date()
              }))
            });

            totalInserted += batch.length;
          }
        }

        return { deletedCount: deleteResult.count, insertedCount: totalInserted };
      }, {
        timeout: 120000, // 120 second timeout for batched inserts
        maxWait: 10000   // Wait up to 10s to acquire transaction lock
      });
      
      // Clear orders array to free memory immediately
      orders = [];
      
      // Update region timestamp outside transaction (doesn't need atomicity)
      await prisma.region.upsert({
        where: { regionId },
        update: { lastFetchedAt: new Date() },
        create: {
          regionId,
          name: `Region ${regionId}`, // Placeholder name
          lastFetchedAt: new Date()
        }
      });
      
      logger.info({
        event: 'region_fetched',
        regionId,
        ordersDeleted: result.deletedCount,
        ordersInserted: result.insertedCount,
        attempt: attempt + 1
      });
      
      return; // Success
    } catch (error) {
      lastError = error as Error;
      
      // Handle ESI 503 errors with exponential backoff
      if (error instanceof ESIError && error.statusCode === 503 && attempt < maxRetries - 1) {
        const delay = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s
        logger.warn({
          event: 'esi_503_retry',
          regionId,
          attempt: attempt + 1,
          delayMs: delay
        });
        await sleep(delay);
      } else if (attempt < maxRetries - 1) {
        // Non-503 errors: short delay before retry
        await sleep(1000);
      }
    }
  }
  
  // All retries failed
  if (lastError) {
    logger.error({
      event: 'region_fetch_failed',
      regionId,
      error: lastError.message,
      attempts: maxRetries
    });
  }
  
  // Don't throw - continue with other regions
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
