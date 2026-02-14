import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRegions } from '@/jobs/fetch-market-data';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes max (Vercel Hobby limit)

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    logger.warn({
      event: 'cron_unauthorized',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const startTime = Date.now();
  
  logger.info({
    event: 'cron_started',
    trigger: 'vercel-cron'
  });
  
  try {
    const result = await fetchAllRegions();
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'cron_completed',
      durationMs: duration,
      regionsProcessed: result.regionsProcessed,
      failed: result.failed
    });
    
    return NextResponse.json({
      success: true,
      regionsProcessed: result.regionsProcessed,
      failed: result.failed,
      durationMs: duration
    });
  } catch (error) {
    const err = error as Error;
    const duration = Date.now() - startTime;
    
    logger.error({
      event: 'cron_failed',
      durationMs: duration,
      error: err.message,
      stack: err.stack
    });
    
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        durationMs: duration
      },
      { status: 500 }
    );
  }
}
