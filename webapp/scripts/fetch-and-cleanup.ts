import { fetchAllRegions } from '../src/jobs/fetch-market-data';
import { cleanupOldOrders, getDatabaseStats } from '../src/jobs/cleanup-old-data';

async function main() {
  console.log('Starting market data fetch...\n');

  try {
    const result = await fetchAllRegions();
    console.log('\nFetch completed:', result);
  } catch (error) {
    console.error('\nFetch failed:', error);
    process.exit(1);
  }

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

  process.exit(0);
}

main();
