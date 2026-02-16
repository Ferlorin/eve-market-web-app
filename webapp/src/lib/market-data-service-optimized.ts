import { prisma } from './db';
import { marketCache } from './market-cache';
import { logger } from './logger';

/**
 * Optimized version of getRegionOrdersByBuyType
 * Uses database aggregation to reduce data transfer from 444k → 15k rows
 * Reduces RTUs by ~97%
 */

interface AggregatedOrder {
  typeId: number;
  bestPrice: number;
  totalVolume: number;
  bestLocationId: bigint;
}

export async function getRegionBestOrdersByType(
  regionId: number,
  isBuyOrder: boolean
): Promise<AggregatedOrder[]> {
  const cacheKey = `region:${regionId}:isBuy:${isBuyOrder}:aggregated`;

  const cached = marketCache.get<AggregatedOrder[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Use database aggregation instead of pulling all rows
  // For sell orders (isBuyOrder=false): MIN(price) = cheapest place to buy
  // For buy orders (isBuyOrder=true): MAX(price) = best place to sell
  const priceAgg = isBuyOrder ? 'MAX' : 'MIN';

  const result = await prisma.$queryRawUnsafe<AggregatedOrder[]>(`
    SELECT
      "typeId",
      ${priceAgg}(price::numeric) as "bestPrice",
      SUM("volumeRemain") as "totalVolume",
      (array_agg("locationId" ORDER BY price ${isBuyOrder ? 'DESC' : 'ASC'}))[1] as "bestLocationId"
    FROM market_orders
    WHERE "regionId" = ${regionId} AND "isBuyOrder" = ${isBuyOrder}
    GROUP BY "typeId"
  `);

  // Cache for 30 minutes
  const fetchedAt = new Date();
  marketCache.set(cacheKey, result, fetchedAt);

  logger.info({
    event: 'aggregated_orders_fetched',
    regionId,
    isBuyOrder,
    uniqueTypes: result.length,
    optimization: `Reduced from ~400k rows to ${result.length} rows`
  });

  return result;
}

/**
 * Calculate opportunities using aggregated data
 * This is MUCH faster and uses way fewer RTUs
 */
export async function calculateOpportunitiesOptimized(
  buyRegionId: number,
  sellRegionId: number
) {
  // Fetch aggregated data (15k rows each instead of 444k)
  const [buyOrders, sellOrders] = await Promise.all([
    getRegionBestOrdersByType(buyRegionId, false), // Best prices to buy at
    getRegionBestOrdersByType(sellRegionId, true),  // Best prices to sell at
  ]);

  const opportunities = [];

  // Create maps for O(1) lookup
  const buyMap = new Map(buyOrders.map(o => [o.typeId, o]));
  const sellMap = new Map(sellOrders.map(o => [o.typeId, o]));

  // Find matching opportunities
  for (const buyOrder of buyOrders) {
    const sellOrder = sellMap.get(buyOrder.typeId);
    if (!sellOrder) continue;

    const buyPrice = Number(buyOrder.bestPrice);
    const sellPrice = Number(sellOrder.bestPrice);
    const profitPerUnit = sellPrice - buyPrice;
    const roi = (profitPerUnit / buyPrice) * 100;

    // Only profitable trades
    if (roi > 0 && isFinite(roi)) {
      const volumeAvailable = Math.min(
        Number(buyOrder.totalVolume),
        Number(sellOrder.totalVolume)
      );

      opportunities.push({
        typeId: buyOrder.typeId,
        buyPrice: Math.round(buyPrice * 100) / 100,
        sellPrice: Math.round(sellPrice * 100) / 100,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        buyLocationId: buyOrder.bestLocationId,
        sellLocationId: sellOrder.bestLocationId,
        roi: Math.round(roi * 100) / 100,
        volumeAvailable,
        maxProfit: Math.round(profitPerUnit * volumeAvailable * 100) / 100,
      });
    }
  }

  // Sort by ROI descending
  opportunities.sort((a, b) => b.roi - a.roi);

  return opportunities.slice(0, 1000); // Top 1000
}
