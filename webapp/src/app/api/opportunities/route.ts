import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { locationService } from '@/lib/location-service';
import { z } from 'zod';

// Request validation schema
const QuerySchema = z.object({
  buyRegion: z.string().transform(Number),
  sellRegion: z.string().transform(Number),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const raw = {
      buyRegion: searchParams.get('buyRegion'),
      sellRegion: searchParams.get('sellRegion'),
    };

    const result = QuerySchema.safeParse(raw);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: result.error.issues },
        { status: 400 }
      );
    }

    const { buyRegion, sellRegion } = result.data;

    // Validate different regions
    if (buyRegion === sellRegion) {
      return NextResponse.json(
        { error: 'Buy and sell regions must be different' },
        { status: 400 }
      );
    }

    // Calculate opportunities
    const opportunities = await calculateOpportunities(buyRegion, sellRegion);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
      meta: {
        buyRegion,
        sellRegion,
        calculationTimeMs: duration,
      },
    });
  } catch (error) {
    console.error('Opportunities API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to calculate opportunities', message: (error as Error).message },
      { status: 500 }
    );
  }
}

interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  buyStation: string;
  sellStation: string;
  roi: number;
  volumeAvailable: number;
}

async function calculateOpportunities(
  buyRegionId: number,
  sellRegionId: number
): Promise<Opportunity[]> {
  // Fetch sell orders from buy region (where we buy items)
  const buyOrders = await prisma.marketOrder.findMany({
    where: {
      regionId: buyRegionId,
      isBuyOrder: false, // Sell orders (someone selling = we buy)
    },
    select: {
      typeId: true,
      price: true,
      volumeRemain: true,
      locationId: true,
    },
  });

  // Fetch buy orders from sell region (where we sell items)
  const sellOrders = await prisma.marketOrder.findMany({
    where: {
      regionId: sellRegionId,
      isBuyOrder: true, // Buy orders (someone buying = we sell)
    },
    select: {
      typeId: true,
      price: true,
      volumeRemain: true,
      locationId: true,
    },
  });

  // Group orders by typeId for efficient matching
  const buyPriceMap = new Map<number, { price: number; volume: number; location: bigint }>();
  const sellPriceMap = new Map<number, { price: number; volume: number; location: bigint }>();

  // Find lowest buy price for each item (best place to buy)
  buyOrders.forEach((order) => {
    const existing = buyPriceMap.get(order.typeId);
    const price = Number(order.price);
    if (!existing || price < existing.price) {
      buyPriceMap.set(order.typeId, {
        price,
        volume: order.volumeRemain,
        location: order.locationId,
      });
    }
  });

  // Find highest sell price for each item (best place to sell)
  sellOrders.forEach((order) => {
    const existing = sellPriceMap.get(order.typeId);
    const price = Number(order.price);
    if (!existing || price > existing.price) {
      sellPriceMap.set(order.typeId, {
        price,
        volume: order.volumeRemain,
        location: order.locationId,
      });
    }
  });

  // Calculate ROI for matching items
  const opportunities: Array<Omit<Opportunity, 'buyStation' | 'sellStation'> & {
    buyLocationId: bigint;
    sellLocationId: bigint;
  }> = [];

  buyPriceMap.forEach((buyData, typeId) => {
    const sellData = sellPriceMap.get(typeId);
    
    if (!sellData) return; // No market for this item in sell region

    const buyPrice = buyData.price;
    const sellPrice = sellData.price;
    const roi = ((sellPrice - buyPrice) / buyPrice) * 100;

    // Only include profitable opportunities
    if (roi > 0) {
      opportunities.push({
        typeId,
        itemName: `Item ${typeId}`, // Placeholder - Item names can be loaded separately
        buyPrice: Math.round(buyPrice * 100) / 100, // Round to 2 decimals
        sellPrice: Math.round(sellPrice * 100) / 100,
        buyLocationId: buyData.location,
        sellLocationId: sellData.location,
        roi: Math.round(roi * 100) / 100, // Round to 2 decimals
        volumeAvailable: Math.min(buyData.volume, sellData.volume),
      });
    }
  });

  // Sort by ROI descending (highest profit first)
  opportunities.sort((a, b) => b.roi - a.roi);

  // Limit to top 1000 to keep response under 2MB
  const topOpportunities = opportunities.slice(0, 1000);

  // Batch fetch location names for all unique locations
  const uniqueLocationIds = new Set<bigint>();
  topOpportunities.forEach((opp) => {
    uniqueLocationIds.add(opp.buyLocationId);
    uniqueLocationIds.add(opp.sellLocationId);
  });

  const locationNames = await locationService.getLocationNames(
    Array.from(uniqueLocationIds)
  );

  // Map location IDs to names
  const finalOpportunities: Opportunity[] = topOpportunities.map((opp) => ({
    typeId: opp.typeId,
    itemName: opp.itemName,
    buyPrice: opp.buyPrice,
    sellPrice: opp.sellPrice,
    buyStation: locationNames.get(opp.buyLocationId) || opp.buyLocationId.toString(),
    sellStation: locationNames.get(opp.sellLocationId) || opp.sellLocationId.toString(),
    roi: opp.roi,
    volumeAvailable: opp.volumeAvailable,
  }));

  return finalOpportunities;
}
