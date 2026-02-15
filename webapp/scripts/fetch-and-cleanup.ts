import { fetchAllRegions } from '../src/jobs/fetch-market-data';
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

  // Cleanup is handled per-region during fetch (delete-before-insert).
  // The redundant 7-day cleanup job has been removed to prevent storage bloat.

  // Gracefully disconnect Prisma before exit
  await prisma.$disconnect();
  process.exit(0);
}

main();
