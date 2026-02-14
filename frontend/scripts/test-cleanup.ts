import { cleanupOldOrders, getDatabaseStats } from '../src/jobs/cleanup-old-data';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🧹 Testing cleanup job...\n');
  
  try {
    // Show current stats
    console.log('📊 Current database statistics:');
    const beforeStats = await getDatabaseStats();
    console.log(`   - Total orders: ${beforeStats.orderCount.toLocaleString()}`);
    console.log(`   - Regions: ${beforeStats.regionCount}`);
    console.log(`   - Estimated size: ${beforeStats.estimatedSizeMB.toFixed(2)} MB`);
    console.log(`   - Usage: ${beforeStats.usagePercent.toFixed(1)}% of 512 MB\n`);
    
    // Count old orders
    const oldCount = await prisma.marketOrder.count({
      where: {
        fetchedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(`🗑️  Orders older than 7 days: ${oldCount.toLocaleString()}\n`);
    
    if (oldCount === 0) {
      console.log('✅ No old orders to clean up. Database is up to date!');
      process.exit(0);
    }
    
    // Run cleanup
    console.log('🚀 Running cleanup...\n');
    const result = await cleanupOldOrders();
    
    console.log(`✅ Cleanup completed:`);
    console.log(`   - Deleted: ${result.recordsDeleted.toLocaleString()} orders`);
    console.log(`   - Duration: ${result.duration}ms\n`);
    
    // Show final stats
    console.log('📊 Final database statistics:');
    const afterStats = await getDatabaseStats();
    console.log(`   - Total orders: ${afterStats.orderCount.toLocaleString()}`);
    console.log(`   - Estimated size: ${afterStats.estimatedSizeMB.toFixed(2)} MB`);
    console.log(`   - Usage: ${afterStats.usagePercent.toFixed(1)}% of 512 MB\n`);
    
    const sizeSaved = beforeStats.estimatedSizeMB - afterStats.estimatedSizeMB;
    console.log(`💾 Space saved: ${sizeSaved.toFixed(2)} MB\n`);
    
    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
