import { NextRequest, NextResponse } from 'next/server';
import { pricingCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// GET /api/pricing/[provider]/[instanceId] - Returns pricing data for a specific instance
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string; instanceId: string }> }) {
  try {
    const { provider, instanceId } = await params;

    if (!provider || !instanceId) {
      return NextResponse.json({
        error: 'Both provider and instanceId parameters are required',
      }, { status: 400 });
    }

    const instanceData = await pricingCache.getInstancePricing(provider, instanceId);

    if (!instanceData) {
      return NextResponse.json({
        error: `No pricing data found for instance ${instanceId} from provider ${provider}`,
      }, { status: 404 });
    }

    // Set cache headers for Edge caching
    const response = NextResponse.json(instanceData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

    return response;

  } catch (error) {
    const resolvedParams = await params;
    console.error(`Failed to fetch pricing data for ${resolvedParams.provider}/${resolvedParams.instanceId}:`, error);

    return NextResponse.json({
      error: 'Failed to fetch pricing data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
