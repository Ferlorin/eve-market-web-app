import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    logger.warn({
      event: 'vacuum_cron_unauthorized',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  logger.info({ event: 'vacuum_started' });

  try {
    // VACUUM ANALYZE reclaims space and updates query planner statistics
    await prisma.$executeRawUnsafe('VACUUM ANALYZE market_orders');

    const duration = Date.now() - startTime;

    logger.info({
      event: 'vacuum_completed',
      durationMs: duration
    });

    return NextResponse.json({
      success: true,
      durationMs: duration,
      message: 'VACUUM ANALYZE completed on market_orders'
    });
  } catch (error) {
    const err = error as Error;
    const duration = Date.now() - startTime;

    logger.error({
      event: 'vacuum_failed',
      durationMs: duration,
      error: err.message,
      stack: err.stack
    });

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
