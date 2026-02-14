import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Find the most recent lastFetchedAt timestamp
    const mostRecentFetch = await prisma.region.findFirst({
      where: {
        lastFetchedAt: {
          not: null,
        },
      },
      orderBy: {
        lastFetchedAt: 'desc',
      },
      select: {
        lastFetchedAt: true,
      },
    });

    const now = new Date();
    let dataAge = null;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let statusCode = 503;

    if (mostRecentFetch && mostRecentFetch.lastFetchedAt) {
      // Calculate data age in minutes
      dataAge = Math.floor(
        (now.getTime() - mostRecentFetch.lastFetchedAt.getTime()) / (1000 * 60)
      );

      // Determine health status
      if (dataAge < 45) {
        status = 'healthy';
        statusCode = 200;
      } else if (dataAge < 120) {
        status = 'degraded';
        statusCode = 200;
      } else {
        status = 'unhealthy';
        statusCode = 503;
      }
    }

    const response = {
      status,
      lastFetchTime: mostRecentFetch?.lastFetchedAt?.toISOString() || null,
      dataAge: dataAge !== null ? `${dataAge} minutes` : 'No data',
      timestamp: now.toISOString(),
    };

    logger.info({
      event: 'health_check',
      status,
      dataAge,
    });

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    logger.error({
      event: 'health_check_failed',
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Failed to check health',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
