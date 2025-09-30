import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { HyperstackPriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://www.hyperstack.cloud/gpu-pricing';

const MONEY_RE = /\$([\d.]+)/;

function parseMoney(text?: string | null): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/\u00a0/g, ' ').trim();
  const m = cleaned.match(MONEY_RE);
  return m ? Number(m[1]) : undefined;
}

function parseIntSafe(text?: string | null): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/\u00a0/g, ' ').trim();
  const m = cleaned.match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class HyperstackScraper implements ProviderScraper {
  name = 'hyperstack';
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    // Fetch page
    const resp = await fetch(this.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch Hyperstack pricing page: ${resp.status}`);
    }

    const html = await resp.text();
    const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

    const rows = this.parsePricingPage(html);

    return {
      provider: 'hyperstack',
      rows,
      observedAt: new Date().toISOString(),
      sourceHash,
    };
  }

  private parsePricingPage(html: string): HyperstackPriceRow[] {
    const $ = cheerio.load(html);
    const observedAt = new Date().toISOString();
    const rows: HyperstackPriceRow[] = [];

    // Find the card with h3 containing "On-Demand GPU" (e.g., "On-Demand GPU Pricing")
    const cards = $('.page-price_card');
    const onDemandGpuCard = cards.filter((_, el) => {
      const title = $(el).find('.page-price_card_top_content h3').text().replace(/\u00a0/g, ' ').trim();
      return /on-?demand\s+gpu/i.test(title);
    }).first();

    if (!onDemandGpuCard || onDemandGpuCard.length === 0) {
      return rows;
    }

    const rowItems = onDemandGpuCard.find('.page-price_card_main.five_column .page-price_card_row .page-price_card_row_item');
    rowItems.each((_, rowEl) => {
      try {
        const model = $(rowEl).find('.page-price_card_row_item_col1').text().replace(/\u00a0/g, ' ').trim();
        const vramText = $(rowEl).find('.page-price_card_row_item_col2').text();
        const vcpusText = $(rowEl).find('.page-price_card_row_item_col3').text();
        const ramText = $(rowEl).find('.page-price_card_row_item_col4').text();
        const priceText = $(rowEl).find('.page-price_card_row_item_col5').text().replace(/\u00a0/g, ' ').trim();

        if (!model) return; // skip malformed rows

        const row: HyperstackPriceRow = {
          provider: 'hyperstack',
          source_url: PRICING_URL,
          observed_at: observedAt,
          instance_id: slugify(model),
          gpu_model: model,
          gpu_count: 1, // Hyperstack pricing is per-GPU
          vram_gb: parseIntSafe(vramText),
          vcpus: parseIntSafe(vcpusText),
          system_ram_gb: parseIntSafe(ramText),
          price_unit: 'gpu_hour',
          price_hour_usd: parseMoney(priceText),
          raw_cost: priceText,
          class: 'GPU',
          network: 'Unknown',
          type: 'Virtual Machine',
        };

        rows.push(row);
      } catch (e) {
        // ignore row-level parse errors
      }
    });

    return rows;
  }
}

export const hyperstackScraper = new HyperstackScraper();


