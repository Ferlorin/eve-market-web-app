import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

/**
 * Health check for static-cache architecture
 * Checks metadata.json instead of database
 */
export async function GET() {
  try {
    const metadataPath = path.join(process.cwd(), 'public', 'data', 'metadata.json');

    // Check if metadata file exists
    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'No market data available',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Read metadata
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const lastGenerated = new Date(metadata.lastGenerated);
    const now = new Date();

    // Calculate data age in minutes
    const dataAge = Math.floor(
      (now.getTime() - lastGenerated.getTime()) / (1000 * 60)
    );

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let statusCode: number;

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

    const response = {
      status,
      lastFetchTime: lastGenerated.toISOString(),
      dataAge: `${dataAge} minutes`,
      regionPairs: metadata.regionPairs,
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
