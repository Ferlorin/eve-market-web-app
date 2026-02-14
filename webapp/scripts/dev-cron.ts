import cron from 'node-cron';
import { fetchAllRegions } from '../src/jobs/fetch-market-data';

console.log('🕐 Starting local cron scheduler...');
console.log('📅 Job will run every 30 minutes');
console.log('⌨️  Press Ctrl+C to stop\n');

// Run immediately on startup
console.log('🚀 Running initial fetch...');
fetchAllRegions()
  .then((result) => {
    console.log(`✅ Initial fetch completed: ${result.regionsProcessed} regions processed`);
  })
  .catch((err) => {
    console.error('❌ Initial fetch failed:', err);
  });

// Schedule job every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log(`\n[${new Date().toISOString()}] ⏰ Running scheduled fetch...`);
  
  try {
    const result = await fetchAllRegions();
    console.log(`✅ Scheduled fetch completed: ${result.regionsProcessed} regions processed`);
  } catch (error) {
    console.error('❌ Scheduled fetch failed:', error);
  }
});

console.log('⏳ Waiting for next scheduled run (30 minutes)...\n');
