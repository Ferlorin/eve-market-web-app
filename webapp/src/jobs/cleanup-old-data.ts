import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const RETENTION_DAYS = 7;

export async function cleanupOldOrders() {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  logger.info({
    event: 'cleanup_started',
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: RETENTION_DAYS
  });
  
  try {
    // Delete old market orders
    const result = await prisma.marketOrder.deleteMany({
      where: {
        fetchedAt: {
          lt: cutoffDate
        }
      }
    });
    
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'cleanup_completed',
      recordsDeleted: result.count,
      durationMs: duration
    });
    
    return {
      recordsDeleted: result.count,
      duration
    };
  } catch (error) {
    const err = error as Error;
    logger.error({
      event: 'cleanup_failed',
      error: err.message,
      stack: err.stack
    });
    throw error;
  }
}

// Optional: Get database statistics
export async function getDatabaseStats() {
  try {
    const orderCount = await prisma.marketOrder.count();
    const regionCount = await prisma.region.count();
    
    // Estimate size (rough calculation)
    // MarketOrder: ~200 bytes per row
    // Region: ~100 bytes per row
    
    const estimatedSizeMB = (
      (orderCount * 200) +
      (regionCount * 100)
    ) / (1024 * 1024);
    
    const freeTierLimitMB = 10 * 1024; // CockroachDB free tier: 10GB

    return {
      orderCount,
      regionCount,
      estimatedSizeMB,
      freeTierLimitMB,
      usagePercent: (estimatedSizeMB / freeTierLimitMB) * 100
    };
  } catch (error) {
    const err = error as Error;
    logger.error({
      event: 'stats_failed',
      error: err.message
    });
    throw error;
  }
}
