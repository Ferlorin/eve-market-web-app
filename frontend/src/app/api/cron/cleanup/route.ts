import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldOrders, getDatabaseStats } from '@/jobs/cleanup-old-data';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    logger.warn({
      event: 'cleanup_cron_unauthorized',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  logger.info({
    event: 'cleanup_cron_started',
    trigger: 'vercel-cron'
  });
  
  try {
    // Run cleanup
    const cleanupResult = await cleanupOldOrders();
    
    // Get database stats
    const stats = await getDatabaseStats();
    
    logger.info({
      event: 'cleanup_cron_completed',
      ordersDeleted: cleanupResult.recordsDeleted,
      durationMs: cleanupResult.duration,
      dbSizeMB: stats.estimatedSizeMB,
      usagePercent: stats.usagePercent
    });
    
    return NextResponse.json({
      success: true,
      ordersDeleted: cleanupResult.recordsDeleted,
      durationMs: cleanupResult.duration,
      databaseStats: stats
    });
  } catch (error) {
    const err = error as Error;
    logger.error({
      event: 'cleanup_cron_failed',
      error: err.message,
      stack: err.stack
    });
    
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
