/**
 * Generate Static JSON Files for Static-Cache Architecture
 *
 * Reads consolidated market data artifacts and generates pre-calculated
 * opportunity JSON files for popular region pairs. These files are served
 * as static assets from Vercel Edge CDN.
 *
 * CRITICAL: Files are written to public/data/ but NEVER committed to git.
 * See .gitignore for enforcement.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../src/lib/logger';

// High-volume EVE Online trade hubs
const HIGH_VOLUME_REGIONS = [
  { id: 10000002, name: 'The Forge' },       // Jita
  { id: 10000043, name: 'Domain' },          // Amarr
  { id: 10000042, name: 'Metropolis' },      // Hek/Rens
  { id: 10000032, name: 'Sinq Laison' },     // Dodixie
];

// Additional active trading regions
const ACTIVE_REGIONS = [
  { id: 10000030, name: 'Heimatar' },
  { id: 10000016, name: 'Lonetrek' },
  { id: 10000033, name: 'The Citadel' },
  { id: 10000037, name: 'Everyshore' },
  { id: 10000028, name: 'Molden Heath' },
  { id: 10000020, name: 'Tash-Murkon' },
];

// Combine all regions for pairing
const ALL_TRADING_REGIONS = [...HIGH_VOLUME_REGIONS, ...ACTIVE_REGIONS];

interface MarketOrder {
  order_id: number;
  type_id: number;
  price: number;
  volume_remain: number;
  location_id: number;
  is_buy_order: boolean;
  issued: string;
}

interface RegionData {
  regionId: number;
  fetchedAt: string;
  orderCount: number;
  orders: MarketOrder[];
}

interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  buyStation: string;
  sellStation: string;
  roi: number;
  volumeAvailable: number;
  maxProfit: number;
}

interface StaticOpportunityFile {
  lastUpdated: string;
  buyRegion: number;
  sellRegion: number;
  buyRegionName: string;
  sellRegionName: string;
  opportunities: Opportunity[];
}

/**
 * Load all region data from JSON artifacts
 */
function loadRegionData(artifactsDir: string): Map<number, RegionData> {
  const regionDataMap = new Map<number, RegionData>();

  if (!fs.existsSync(artifactsDir)) {
    throw new Error(`Artifacts directory not found: ${artifactsDir}`);
  }

  const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json'));

  logger.info({
    event: 'loading_artifacts',
    filesFound: files.length,
  });

  for (const file of files) {
    const filepath = path.join(artifactsDir, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const data: RegionData = JSON.parse(content);

    regionDataMap.set(data.regionId, data);

    logger.debug({
      event: 'artifact_loaded',
      regionId: data.regionId,
      orderCount: data.orderCount,
    });
  }

  return regionDataMap;
}

/**
 * Calculate opportunities between two regions
 * (Same logic as webapp/src/app/api/opportunities/route.ts)
 */
function calculateOpportunities(
  buyRegionData: RegionData,
  sellRegionData: RegionData
): Array<Omit<Opportunity, 'itemName' | 'buyStation' | 'sellStation'>> {
  const buyOrders = buyRegionData.orders.filter(o => !o.is_buy_order); // Sell orders in buy region
  const sellOrders = sellRegionData.orders.filter(o => o.is_buy_order); // Buy orders in sell region

  // Group by typeId
  const buyPriceMap = new Map<number, { price: number; volume: number; location: number }>();
  const sellPriceMap = new Map<number, { price: number; volume: number; location: number }>();

  // Find lowest buy price for each item
  buyOrders.forEach((order) => {
    const existing = buyPriceMap.get(order.type_id);
    const price = Number(order.price);
    if (!existing || price < existing.price) {
      buyPriceMap.set(order.type_id, {
        price,
        volume: order.volume_remain,
        location: Number(order.location_id),
      });
    }
  });

  // Find highest sell price for each item
  sellOrders.forEach((order) => {
    const existing = sellPriceMap.get(order.type_id);
    const price = Number(order.price);
    if (!existing || price > existing.price) {
      sellPriceMap.set(order.type_id, {
        price,
        volume: order.volume_remain,
        location: Number(order.location_id),
      });
    }
  });

  // Calculate ROI for matching items
  const opportunities: Array<Omit<Opportunity, 'itemName' | 'buyStation' | 'sellStation'> & {
    buyLocationId: number;
    sellLocationId: number;
  }> = [];

  buyPriceMap.forEach((buyData, typeId) => {
    const sellData = sellPriceMap.get(typeId);

    if (!sellData) return;

    const buyPrice = buyData.price;
    const sellPrice = sellData.price;
    const profitPerUnit = sellPrice - buyPrice;
    const roi = (profitPerUnit / buyPrice) * 100;
    const volumeAvailable = Math.min(buyData.volume, sellData.volume);
    const maxProfit = profitPerUnit * volumeAvailable;

    // Only include profitable opportunities
    if (roi > 0 && buyPrice > 0 && sellPrice > 0 && isFinite(roi)) {
      opportunities.push({
        typeId,
        buyPrice: Math.round(buyPrice * 100) / 100,
        sellPrice: Math.round(sellPrice * 100) / 100,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        buyLocationId: buyData.location,
        sellLocationId: sellData.location,
        roi: Math.round(roi * 100) / 100,
        volumeAvailable,
        maxProfit: Math.round(maxProfit * 100) / 100,
      });
    }
  });

  // Sort by ROI descending
  opportunities.sort((a, b) => b.roi - a.roi);

  return opportunities;
}

/**
 * Generate popular region pairs
 * Creates bidirectional pairs (A→B and B→A)
 */
function getPopularRegionPairs(): Array<{ buyRegion: number; sellRegion: number }> {
  const pairs: Array<{ buyRegion: number; sellRegion: number }> = [];

  // Generate pairs between all trading regions
  for (const buyRegion of ALL_TRADING_REGIONS) {
    for (const sellRegion of ALL_TRADING_REGIONS) {
      if (buyRegion.id !== sellRegion.id) {
        pairs.push({
          buyRegion: buyRegion.id,
          sellRegion: sellRegion.id,
        });
      }
    }
  }

  logger.info({
    event: 'region_pairs_generated',
    totalPairs: pairs.length,
    regions: ALL_TRADING_REGIONS.length,
  });

  return pairs;
}

/**
 * Get region name by ID
 */
function getRegionName(regionId: number): string {
  const region = ALL_TRADING_REGIONS.find(r => r.id === regionId);
  return region ? region.name : `Region ${regionId}`;
}

/**
 * Main execution
 */
async function generateStaticJSON() {
  const startTime = Date.now();

  logger.info({ event: 'generate_static_started' });

  // Paths
  const artifactsDir = path.join(process.cwd(), 'market-data-artifacts');
  const outputDir = path.join(process.cwd(), 'public', 'data');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.info({ event: 'output_dir_created', path: outputDir });
  }

  // Load all region data
  const regionDataMap = loadRegionData(artifactsDir);

  logger.info({
    event: 'regions_loaded',
    regionsAvailable: regionDataMap.size,
  });

  // Generate region pairs
  const pairs = getPopularRegionPairs();

  let generatedCount = 0;
  let skippedCount = 0;

  // Generate JSON for each pair
  for (const { buyRegion, sellRegion } of pairs) {
    const buyRegionData = regionDataMap.get(buyRegion);
    const sellRegionData = regionDataMap.get(sellRegion);

    if (!buyRegionData || !sellRegionData) {
      logger.warn({
        event: 'region_data_missing',
        buyRegion,
        sellRegion,
        buyDataExists: !!buyRegionData,
        sellDataExists: !!sellRegionData,
      });
      skippedCount++;
      continue;
    }

    // Calculate opportunities
    const opportunities = calculateOpportunities(buyRegionData, sellRegionData);

    // Take top 1000 (same as current API)
    const topOpportunities = opportunities.slice(0, 1000);

    // For now, use simplified opportunity data without item/location names
    // In production, you'd batch fetch these like the current API does
    const outputOpportunities: Opportunity[] = topOpportunities.map(opp => ({
      typeId: opp.typeId,
      itemName: `Item ${opp.typeId}`, // TODO: Fetch from item_types table or ESI
      buyPrice: opp.buyPrice,
      sellPrice: opp.sellPrice,
      profitPerUnit: opp.profitPerUnit,
      buyStation: `Station ${opp.buyLocationId}`, // TODO: Fetch from locations table or ESI
      sellStation: `Station ${opp.sellLocationId}`,
      roi: opp.roi,
      volumeAvailable: opp.volumeAvailable,
      maxProfit: opp.maxProfit,
    }));

    // Create output file
    const output: StaticOpportunityFile = {
      lastUpdated: new Date().toISOString(),
      buyRegion,
      sellRegion,
      buyRegionName: getRegionName(buyRegion),
      sellRegionName: getRegionName(sellRegion),
      opportunities: outputOpportunities,
    };

    const filename = `${buyRegion}-${sellRegion}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));

    generatedCount++;

    logger.info({
      event: 'static_file_generated',
      filename,
      opportunitiesCount: outputOpportunities.length,
      buyRegion: getRegionName(buyRegion),
      sellRegion: getRegionName(sellRegion),
    });
  }

  // Generate metadata file
  const metadata = {
    lastGenerated: new Date().toISOString(),
    regionPairs: generatedCount,
    regions: regionDataMap.size,
    skippedPairs: skippedCount,
    version: '1.0.0',
  };

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  const duration = Date.now() - startTime;

  logger.info({
    event: 'generate_static_completed',
    filesGenerated: generatedCount,
    filesSkipped: skippedCount,
    durationMs: duration,
    durationSeconds: Math.round(duration / 1000),
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ STATIC JSON GENERATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📊 Region pairs generated: ${generatedCount}`);
  console.log(`⏭️  Pairs skipped (missing data): ${skippedCount}`);
  console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
  console.log('='.repeat(70));
  console.log('\n⚠️  REMINDER: These files are NOT committed to git (.gitignore)');
  console.log('They are included in Vercel deployment and served as static assets.\n');
}

// Run the generator
generateStaticJSON().catch((error) => {
  console.error('Fatal error during static JSON generation:', error);
  process.exit(1);
});
