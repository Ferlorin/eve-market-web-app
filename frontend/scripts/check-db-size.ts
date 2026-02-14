import { getDatabaseStats } from '../src/jobs/cleanup-old-data';

async function main() {
  console.log('📊 Database Size Report\n');
  console.log('=' .repeat(50));
  
  try {
    const stats = await getDatabaseStats();
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Market Orders: ${stats.orderCount.toLocaleString()}`);
    console.log(`   Regions:       ${stats.regionCount}`);
    console.log(`\n💾 Storage:`);
    console.log(`   Estimated Size: ${stats.estimatedSizeMB.toFixed(2)} MB`);
    console.log(`   Free Tier Limit: ${stats.freeTierLimitMB} MB`);
    console.log(`   Usage: ${stats.usagePercent.toFixed(1)}%`);
    
    // Visual progress bar
    const barLength = 40;
    const filledLength = Math.round((stats.usagePercent / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`\n   [${bar}] ${stats.usagePercent.toFixed(1)}%`);
    
    // Health indicator
    console.log(`\n🚦 Status:`);
    if (stats.usagePercent < 20) {
      console.log('   ✅ Healthy - Plenty of space available');
    } else if (stats.usagePercent < 60) {
      console.log('   ✅ Normal - Database size within expected range');
    } else if (stats.usagePercent < 85) {
      console.log('   ⚠️  Warning - Consider reviewing retention policy');
    } else {
      console.log('   🚨 Critical - Immediate cleanup recommended!');
    }
    
    console.log('\n' + '='.repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to get database stats:', error);
    process.exit(1);
  }
}

main();
