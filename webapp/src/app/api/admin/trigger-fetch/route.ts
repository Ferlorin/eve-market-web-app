import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRegions } from '@/jobs/fetch-market-data';
import { logger } from '@/lib/logger';

export const maxDuration = 600; // 10 minutes max

export async function POST(request: NextRequest) {
  // Verify admin token
  const authHeader = request.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken) {
    logger.error({
      event: 'admin_trigger_misconfigured',
      message: 'ADMIN_TOKEN environment variable not set',
    });
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }
  
  if (!authHeader || authHeader !== expectedToken) {
    logger.warn({
      event: 'admin_trigger_unauthorized',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  logger.info({
    event: 'admin_trigger_manual_fetch',
    triggeredBy: 'admin',
  });
  
  // Start the fetch job asynchronously
  // Don't await - respond immediately with 202 Accepted
  fetchAllRegions()
    .then((result) => {
      logger.info({
        event: 'admin_triggered_fetch_completed',
        regionsProcessed: result.regionsProcessed,
        failed: result.failed,
        durationMs: result.duration,
      });
    })
    .catch((error) => {
      logger.error({
        event: 'admin_triggered_fetch_failed',
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    });
  
  return NextResponse.json(
    {
      message: 'Fetch job triggered successfully',
      status: 'running',
    },
    { status: 202 }
  );
}
