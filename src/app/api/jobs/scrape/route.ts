import { NextRequest, NextResponse } from 'next/server';
import { coreweaveScraper } from '@/lib/providers';
import { pricingCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30 seconds for scraping

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const startTime = Date.now();

    // Run the CoreWeave scraper
    console.log('Starting CoreWeave scraping job...');
    const result = await coreweaveScraper.scrape();

    // Store the results in Redis (only if content changed)
    const wasUpdated = await pricingCache.storePricingData(result);

    const duration = Date.now() - startTime;

    console.log(`CoreWeave scraping completed in ${duration}ms. Updated: ${wasUpdated}`);

    return NextResponse.json({
      success: true,
      provider: result.provider,
      rowsScraped: result.rows.length,
      wasUpdated,
      duration,
      observedAt: result.observedAt,
      sourceHash: result.sourceHash,
    });

  } catch (error) {
    console.error('Scraping job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}

// GET /api/jobs/scrape - Get cache stats
export async function GET() {
  try {
    const stats = await pricingCache.getCacheStats();

    return NextResponse.json({
      status: 'operational',
      providers: stats.providers,
      totalInstances: stats.totalInstances,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cache stats failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
