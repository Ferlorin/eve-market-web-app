import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';

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

async function seedRegions() {
  console.log('🌍 Fetching EVE regions from ESI API...\n');
  
  try {
    // Fetch region IDs
    const regionsResponse = await axios.get(
      'https://esi.evetech.net/latest/universe/regions/',
      { timeout: 10000 }
    );
    const regionIds: number[] = regionsResponse.data;
    
    console.log(`📊 Found ${regionIds.length} regions\n`);
    
    // Fetch region names (with rate limiting)
    let processed = 0;
    for (const regionId of regionIds) {
      try {
        const response = await axios.get(
          `https://esi.evetech.net/latest/universe/regions/${regionId}/`,
          { timeout: 10000 }
        );
        const regionData = response.data;
        
        await prisma.region.upsert({
          where: { regionId },
          update: { name: regionData.name },
          create: {
            regionId,
            name: regionData.name
          }
        });
        
        processed++;
        console.log(`  ✓ [${processed}/${regionIds.length}] ${regionData.name} (${regionId})`);
        
        // Rate limiting: Wait 10ms between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error: any) {
        console.error(`  ✗ Failed to fetch region ${regionId}:`, error.message);
      }
    }
    
    console.log(`\n✅ Region seeding complete! ${processed}/${regionIds.length} regions loaded.`);
  } catch (error: any) {
    console.error('❌ Failed to fetch region list:', error.message);
    throw error;
  }
}

async function main() {
  await seedRegions();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });


