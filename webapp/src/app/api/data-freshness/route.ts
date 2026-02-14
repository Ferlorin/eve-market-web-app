import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Find the most recent lastFetchedAt timestamp from any region
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

    if (!mostRecentFetch || !mostRecentFetch.lastFetchedAt) {
      return NextResponse.json(
        { error: 'No data fetch timestamps found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lastFetchedAt: mostRecentFetch.lastFetchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching data freshness:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
