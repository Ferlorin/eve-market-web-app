import { NextResponse } from 'next/server';
import { getAllRegions } from '@/lib/regions';

export const dynamic = 'force-dynamic'; // Disable static optimization
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const regions = await getAllRegions();
    
    return NextResponse.json({
      success: true,
      count: regions.length,
      data: regions
    });
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load regions'
      },
      { status: 500 }
    );
  }
}
