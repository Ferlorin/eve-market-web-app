import { esiClient } from '../esi-client';

async function testESIClient() {
  console.log('Testing ESI Client...\n');
  
  try {
    // Test 1: Fetch region list
    console.log('Test 1: Fetching all regions...');
    const regions = await esiClient.getAllRegions();
    console.log(`✅ Found ${regions.length} regions`);
    console.log(`Sample regions: ${regions.slice(0, 5).join(', ')}\n`);
    
    // Test 2: Fetch orders for The Forge (10000002)
    console.log('Test 2: Fetching orders for The Forge (regionId: 10000002)...');
    const startTime = Date.now();
    const orders = await esiClient.getRegionOrders(10000002);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Fetched ${orders.length} orders in ${duration}ms`);
    console.log(`Sample order:`, {
      order_id: orders[0].order_id,
      type_id: orders[0].type_id,
      price: orders[0].price,
      volume: orders[0].volume_remain,
      is_buy: orders[0].is_buy_order,
    });
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testESIClient();
