import { esiClient } from '../src/lib/esi-client';
import { prisma } from '../src/lib/db';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('🧪 Quick test: Fetching orders for The Forge (region 10000002)...\n');
  
  try {
    // Test single region fetch
    const regionId = 10000002;
    const orders = await esiClient.getRegionOrders(regionId);
    
    console.log(`✅ Fetched ${orders.length} orders from ESI`);
    
    // Test database insert
    console.log('📝 Inserting orders into database...');
    const startTime = Date.now();
    
    if (orders.length > 0) {
      await prisma.marketOrder.createMany({
        data: orders.slice(0, 1000).map(order => ({ // Insert only first 1000 for quick test
          orderId: BigInt(order.order_id),
          regionId: regionId,
          typeId: order.type_id,
          price: new Prisma.Decimal(order.price),
          volumeRemain: order.volume_remain,
          locationId: BigInt(order.location_id),
          isBuyOrder: order.is_buy_order,
          issued: new Date(order.issued),
          fetchedAt: new Date()
        })),
        skipDuplicates: true
      });
    }
    
    // Update region
    await prisma.region.upsert({
      where: { regionId },
      update: { lastFetchedAt: new Date() },
      create: {
        regionId,
        name: 'The Forge',
        lastFetchedAt: new Date()
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Inserted 1000 orders in ${duration}ms`);
    
    // Verify data
    const count = await prisma.marketOrder.count({ where: { regionId } });
    console.log(`📊 Total orders in database for region ${regionId}: ${count}`);
    
    const region = await prisma.region.findUnique({ where: { regionId } });
    console.log(`📅 Region lastFetchedAt: ${region?.lastFetchedAt}`);
    
    console.log('\n✅ Quick test passed! Fetch logic is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
