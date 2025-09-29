import { NextRequest, NextResponse } from 'next/server';
import { coreweaveScraper, nebiusScraper, hyperstackScraper, runpodScraper, lambdaScraper, digitaloceanScraper, oracleScraper, crusoeScraper } from '@/lib/providers';
import { pricingCache } from '@/lib/redis';
import type { ProviderScraper } from '@/lib/providers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30 seconds for scraping

const scrapers: Record<string, ProviderScraper> = {
  coreweave: coreweaveScraper,
  nebius: nebiusScraper,
  hyperstack: hyperstackScraper,
  runpod: runpodScraper,
  lambda: lambdaScraper,
  digitalocean: digitaloceanScraper,
  oracle: oracleScraper,
  crusoe: crusoeScraper,
};

export async function POST(request: NextRequest) {
  try {
    // Note: add auth if you expose this publicly

    // Get provider from query parameter, default to coreweave
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'coreweave';
    const force = searchParams.get('force') === '1';

    const scraper = scrapers[provider];
    if (!scraper) {
      return NextResponse.json({
        success: false,
        error: `Unknown provider: ${provider}. Available providers: ${Object.keys(scrapers).join(', ')}`,
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Run the scraper
    console.log(`Starting ${provider} scraping job...`);
    const result = await scraper.scrape();

    // Store the results in Redis (only if content changed)
    const wasUpdated = await pricingCache.storePricingData(result, force);

    const duration = Date.now() - startTime;

    console.log(`${provider} scraping completed in ${duration}ms. Updated: ${wasUpdated}`);

    return NextResponse.json({
      success: true,
      provider: result.provider,
      rowsScraped: result.rows.length,
      wasUpdated,
      force,
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
// Periodic maintenance endpoint (e.g., cron ping)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get('days') ?? '30');
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const removed = await pricingCache.trimOldRows(cutoff);
    // Note: orphan row cleanup can be added if storage growth becomes a concern
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
