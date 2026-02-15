import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'eve_market',
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function analyzeRegionSizes() {
  console.log('📊 Analyzing region order counts...\n');
  
  try {
    // Get order count per region
    const regionCounts = await prisma.marketOrder.groupBy({
      by: ['regionId'],
      _count: {
        regionId: true
      },
      orderBy: {
        _count: {
          regionId: 'desc'
        }
      }
    });

    // Get region names
    const regions = await prisma.region.findMany({
      select: {
        regionId: true,
        name: true
      }
    });

    const regionMap = new Map(regions.map(r => [r.regionId, r.name]));

    console.log('Top 20 regions by order count:\n');
    console.log('Rank | Region ID  | Orders    | Name');
    console.log('-----|------------|-----------|------------------------------');
    
    regionCounts.slice(0, 20).forEach((region, index) => {
      const name = regionMap.get(region.regionId) || 'Unknown';
      const orders = region._count.regionId.toLocaleString().padStart(9);
      console.log(`${(index + 1).toString().padStart(4)} | ${region.regionId.toString().padStart(10)} | ${orders} | ${name}`);
    });

    // Calculate statistics
    const totalOrders = regionCounts.reduce((sum, r) => sum + r._count.regionId, 0);
    const avgOrders = totalOrders / regionCounts.length;
    const top10Total = regionCounts.slice(0, 10).reduce((sum, r) => sum + r._count.regionId, 0);
    const top10Percent = (top10Total / totalOrders * 100).toFixed(1);

    console.log('\n📈 Statistics:');
    console.log(`Total orders: ${totalOrders.toLocaleString()}`);
    console.log(`Average orders per region: ${Math.round(avgOrders).toLocaleString()}`);
    console.log(`Top 10 regions contain: ${top10Percent}% of all orders`);
    
    // Identify high-volume regions (>100k orders)
    await pool.end();
    const highVolume = regionCounts.filter(r => r._count.regionId > 100000);
    
    if (highVolume.length > 0) {
      console.log(`\n🔥 High-volume regions (>100k orders):`);
      highVolume.forEach(region => {
        const name = regionMap.get(region.regionId) || 'Unknown';
        console.log(`   ${region.regionId} (${name}): ${region._count.regionId.toLocaleString()} orders`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRegionSizes();
