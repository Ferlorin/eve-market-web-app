import { esiClient, ESIError } from '../src/lib/esi-client';
import { logger } from '../src/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 1: Fetch market data from ESI and save to JSON files
 * NO DATABASE OPERATIONS - just fetch and save to disk
 */

// Special handling for high-volume regions
const HIGH_VOLUME_REGIONS = [
  10000002, // The Forge (444k orders)
  10000043, // Domain (196k orders)
  10000042, // Metropolis (127k orders)
  10000032, // Sinq Laison (124k orders)
];

async function main() {
  const startTime = Date.now();

  // Support chunked processing via environment variables
  const chunkIndex = process.env.CHUNK_INDEX ? parseInt(process.env.CHUNK_INDEX, 10) : undefined;
  const totalChunks = process.env.TOTAL_CHUNKS ? parseInt(process.env.TOTAL_CHUNKS, 10) : undefined;
  const specificRegions = process.env.SPECIFIC_REGIONS
    ? process.env.SPECIFIC_REGIONS.split(',').map(r => parseInt(r.trim(), 10))
    : undefined;

  // Support page-range splitting for large regions (e.g. The Forge)
  const pageStart = process.env.PAGE_START ? parseInt(process.env.PAGE_START, 10) : 1;
  const pageEnd = process.env.PAGE_END ? parseInt(process.env.PAGE_END, 10) : Infinity;
  const partIndex = process.env.PART_INDEX ? parseInt(process.env.PART_INDEX, 10) : undefined;

  // Create artifacts directory
  const artifactsDir = path.join(process.cwd(), 'market-data-artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  try {
    // Fetch list of all EVE regions
    const allRegionIds = await esiClient.getAllRegions();

    let regionIds: number[];

    if (specificRegions && specificRegions.length > 0) {
      regionIds = specificRegions;
      logger.info({
        event: 'specific_regions_mode',
        regions: specificRegions,
        totalRegions: specificRegions.length
      });
    } else {
      // Filter out high-volume regions from normal chunks
      regionIds = allRegionIds.filter(id => !HIGH_VOLUME_REGIONS.includes(id));

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
    }

    logger.info({ event: 'fetch_started', regionsToFetch: regionIds.length });

    let successful = 0;
    let failed = 0;

    // Process regions sequentially to avoid memory issues
    for (const regionId of regionIds) {
      try {
        await fetchRegionToJson(regionId, artifactsDir, 3, pageStart, pageEnd, partIndex);
        successful++;
      } catch (error) {
        logger.error({
          event: 'region_fetch_failed',
          regionId,
          error: (error as Error).message
        });
        failed++;
      }

      // Force GC between regions
      if (global.gc) {
        global.gc();
      }
    }

    const duration = Date.now() - startTime;

    logger.info({
      event: 'fetch_completed',
      total: regionIds.length,
      successful,
      failed,
      durationMs: duration,
      artifactsDir
    });

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error({
      event: 'fetch_failed',
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }
}

async function fetchRegionToJson(
  regionId: number,
  artifactsDir: string,
  maxRetries = 3,
  pageStart = 1,
  pageEnd = Infinity,
  partIndex?: number
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const allOrders: Array<{
        order_id: number;
        type_id: number;
        price: number;
        volume_remain: number;
        location_id: number;
        is_buy_order: boolean;
        issued: string;
      }> = [];

      let page = pageStart;
      let hasMorePages = true;

      while (hasMorePages) {
        let orders: Awaited<ReturnType<typeof esiClient.getRegionOrdersPage>>['orders'];
        let totalPages: number;

        try {
          const result = await esiClient.getRegionOrdersPage(regionId, page);
          orders = result.orders;
          totalPages = result.totalPages;
        } catch (error) {
          // 404 means page is beyond total pages - this range has no data, exit gracefully
          if (error instanceof ESIError && error.statusCode === 404) {
            logger.warn({
              event: 'page_range_empty',
              regionId,
              page,
              pageStart,
              message: 'Page beyond totalPages - range exhausted, stopping',
            });
            break;
          }
          throw error; // Re-throw all other errors
        }

        if (orders.length > 0) {
          allOrders.push(...orders);
        }

        hasMorePages = page < totalPages && page < pageEnd;
        page++;
      }

      // Save to JSON file - use part suffix if splitting a region
      const filename = partIndex !== undefined
        ? `region-${regionId}-part${partIndex}.json`
        : `region-${regionId}.json`;
      const filepath = path.join(artifactsDir, filename);

      const data = {
        regionId,
        fetchedAt: new Date().toISOString(),
        orderCount: allOrders.length,
        orders: allOrders
      };

      fs.writeFileSync(filepath, JSON.stringify(data));

      logger.info({
        event: 'region_saved',
        regionId,
        ordersCount: allOrders.length,
        pages: page - 1,
        filename,
        fileSizeMB: (fs.statSync(filepath).size / 1024 / 1024).toFixed(2)
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

  throw lastError || new Error(`Failed to fetch region ${regionId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
