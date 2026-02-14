import { fetchAllRegions } from '../src/jobs/fetch-market-data';

async function main() {
  console.log('🚀 Starting manual market data fetch test...\n');
  
  try {
    const result = await fetchAllRegions();
    console.log('\n✅ Fetch completed successfully:', result);
    console.log(`   - Regions processed: ${result.regionsProcessed}`);
    console.log(`   - Failed: ${result.failed}`);
    console.log(`   - Duration: ${(result.duration / 1000).toFixed(2)}s`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fetch failed:', error);
    process.exit(1);
  }
}

main();
