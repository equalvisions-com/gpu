import { NextRequest, NextResponse } from 'next/server';
import { pricingCache } from '@/lib/redis';
export const dynamic = 'force-dynamic';
 

// GET /api/pricing - Returns all providers' latest pricing snapshots
export async function GET(request: NextRequest) {
  try {
    const snapshots = await pricingCache.getAllPricingSnapshots();

    // Set cache headers for Edge caching (longer TTL; low-cardinality endpoint)
    const response = NextResponse.json(snapshots, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    });

    return response;

  } catch (error) {
    console.error('Failed to fetch pricing data:', error);

    return NextResponse.json({
      error: 'Failed to fetch pricing data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
