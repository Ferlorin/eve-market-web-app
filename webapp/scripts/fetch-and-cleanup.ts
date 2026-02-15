import { fetchAllRegions } from '../src/jobs/fetch-market-data';
import { cleanupOldOrders, getDatabaseStats } from '../src/jobs/cleanup-old-data';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('Starting market data fetch...\n');
  
  // Support chunked processing via environment variables
  const chunkIndex = process.env.CHUNK_INDEX ? parseInt(process.env.CHUNK_INDEX, 10) : undefined;
  const totalChunks = process.env.TOTAL_CHUNKS ? parseInt(process.env.TOTAL_CHUNKS, 10) : undefined;
  
  // Support specific regions processing (for high-volume regions)
  const specificRegions = process.env.SPECIFIC_REGIONS 
    ? process.env.SPECIFIC_REGIONS.split(',').map(r => parseInt(r.trim(), 10))
    : undefined;

  try {
    const result = await fetchAllRegions(chunkIndex, totalChunks, specificRegions);
    console.log('\nFetch completed:', result);
  } catch (error) {
    console.error('\nFetch failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Only run cleanup on the last chunk or when not chunking or when processing specific regions
  const shouldRunCleanup = !chunkIndex || chunkIndex === (totalChunks || 1) - 1 || specificRegions;
  
  if (shouldRunCleanup) {
    console.log('\nRunning cleanup...');
    try {
      const cleanup = await cleanupOldOrders();
      console.log('Cleanup completed:', cleanup);

      const stats = await getDatabaseStats();
      console.log('Database stats:', stats);
    } catch (error) {
      console.error('Cleanup failed:', error);
      // Don't exit 1 — fetch succeeded, cleanup is secondary
    }
  }

  // Gracefully disconnect Prisma before exit
  await prisma.$disconnect();
  process.exit(0);
}

main();
