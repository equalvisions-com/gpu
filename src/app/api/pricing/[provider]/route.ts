import { NextRequest, NextResponse } from 'next/server';
import { pricingCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// GET /api/pricing/[provider] - Returns pricing snapshot for a specific provider
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;

    if (!provider) {
      return NextResponse.json({
        error: 'Provider parameter is required',
      }, { status: 400 });
    }

    const snapshot = await pricingCache.getPricingSnapshot(provider);

    if (!snapshot) {
      return NextResponse.json({
        error: `No pricing data found for provider: ${provider}`,
      }, { status: 404 });
    }

    // Set cache headers for Edge caching
    const response = NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

    return response;

  } catch (error) {
    const resolvedParams = await params;
    console.error(`Failed to fetch pricing data for provider ${resolvedParams.provider}:`, error);

    return NextResponse.json({
      error: 'Failed to fetch pricing data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
