import { prisma } from './db';
import { marketCache } from './market-cache';
import { MarketOrder } from '@prisma/client';

export async function getRegionOrders(regionId: number): Promise<MarketOrder[]> {
  const cacheKey = `region:${regionId}:orders`;

  const cached = marketCache.get<MarketOrder[]>(cacheKey);
  if (cached) {
    return cached;
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
    return cached;
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
    return cached;
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
