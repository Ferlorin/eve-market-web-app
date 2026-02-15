import { prisma } from './db';
import { marketCache } from './market-cache';
import { logger } from './logger';
import { MarketOrder } from '@prisma/client';

// Lightweight freshness cache: stores region lastFetchedAt with a 60s TTL.
// This avoids querying the regions table on every single request while still
// detecting new data within ~60 seconds of a fetch job completing.
const freshnessCache = new Map<number, { lastFetchedAt: Date; checkedAt: number }>();
const FRESHNESS_CHECK_TTL_MS = 60 * 1000; // 60 seconds

async function getRegionLatestFetchedAt(regionId: number): Promise<Date | null> {
  const cached = freshnessCache.get(regionId);
  if (cached && Date.now() - cached.checkedAt < FRESHNESS_CHECK_TTL_MS) {
    return cached.lastFetchedAt;
  }

  // Query the actual latest fetchedAt from market_orders for this region.
  // Uses the composite index on (regionId, typeId) so this is fast.
  const result = await prisma.marketOrder.findFirst({
    where: { regionId },
    orderBy: { fetchedAt: 'desc' },
    select: { fetchedAt: true },
  });

  if (result?.fetchedAt) {
    freshnessCache.set(regionId, {
      lastFetchedAt: result.fetchedAt,
      checkedAt: Date.now(),
    });
    return result.fetchedAt;
  }

  return null;
}

function isCacheStale(cacheKey: string, regionId: number, lastFetchedAt: Date | null): boolean {
  if (!lastFetchedAt) return false;

  const entry = marketCache.getEntry(cacheKey);
  if (!entry) return false;

  if (lastFetchedAt.getTime() > entry.fetchedAt.getTime()) {
    logger.info({
      event: 'cache_stale_detected',
      cacheKey,
      regionId,
      cachedFetchedAt: entry.fetchedAt.toISOString(),
      regionLastFetchedAt: lastFetchedAt.toISOString(),
    });
    marketCache.invalidatePattern(new RegExp(`^region:${regionId}:`));
    // Also clear the freshness cache so subsequent calls for this region refetch
    freshnessCache.delete(regionId);
    return true;
  }

  return false;
}

export async function getRegionOrders(regionId: number): Promise<MarketOrder[]> {
  const cacheKey = `region:${regionId}:orders`;

  const cached = marketCache.get<MarketOrder[]>(cacheKey);
  if (cached) {
    const lastFetched = await getRegionLatestFetchedAt(regionId);
    if (!isCacheStale(cacheKey, regionId, lastFetched)) {
      return cached;
    }
  }

  const orders = await prisma.marketOrder.findMany({
    where: { regionId },
    orderBy: { fetchedAt: 'desc' },
  });

  if (orders.length === 0) {
    return [];
  }

  const fetchedAt = orders[0].fetchedAt;
  marketCache.set(cacheKey, orders, fetchedAt);

  return orders;
}

export async function getOrdersByType(regionId: number, typeId: number): Promise<MarketOrder[]> {
  const cacheKey = `region:${regionId}:type:${typeId}:orders`;

  const cached = marketCache.get<MarketOrder[]>(cacheKey);
  if (cached) {
    const lastFetched = await getRegionLatestFetchedAt(regionId);
    if (!isCacheStale(cacheKey, regionId, lastFetched)) {
      return cached;
    }
  }

  const orders = await prisma.marketOrder.findMany({
    where: { regionId, typeId },
    orderBy: { fetchedAt: 'desc' },
  });

  if (orders.length === 0) {
    return [];
  }

  const fetchedAt = orders[0].fetchedAt;
  marketCache.set(cacheKey, orders, fetchedAt);

  return orders;
}

export async function getRegionOrdersByBuyType(
  regionId: number,
  isBuyOrder: boolean,
): Promise<Pick<MarketOrder, 'typeId' | 'price' | 'volumeRemain' | 'locationId'>[]> {
  const cacheKey = `region:${regionId}:isBuy:${isBuyOrder}:orders`;

  const cached = marketCache.get<Pick<MarketOrder, 'typeId' | 'price' | 'volumeRemain' | 'locationId'>[]>(cacheKey);
  if (cached) {
    const lastFetched = await getRegionLatestFetchedAt(regionId);
    if (!isCacheStale(cacheKey, regionId, lastFetched)) {
      return cached;
    }
  }

  const orders = await prisma.marketOrder.findMany({
    where: { regionId, isBuyOrder },
    select: {
      typeId: true,
      price: true,
      volumeRemain: true,
      locationId: true,
      fetchedAt: true,
    },
  });

  if (orders.length === 0) {
    return [];
  }

  const fetchedAt = orders[0].fetchedAt;
  const result = orders.map(({ fetchedAt: _, ...rest }) => rest);
  marketCache.set(cacheKey, result, fetchedAt);

  return result;
}
