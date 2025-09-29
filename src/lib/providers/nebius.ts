import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { NebiusPriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://nebius.com/prices';

const MONEY_RE = /\$([0-9.]+)/;

function parsePrice(text: string): number | undefined {
  const m = text.match(MONEY_RE);
  return m ? Number(m[1]) : undefined;
}

function cleanGpuModelName(item: string): string {
  // Remove asterisks
  let cleaned = item.replace(/\*/g, '');

  // Handle specific patterns for L40S GPUs
  cleaned = cleaned
    .replace(/NVIDIA L40S GPU with AMD/g, 'NVIDIA L40S AMD')
    .replace(/NVIDIA L40S GPU with Intel/g, 'NVIDIA L40S Intel');

  return cleaned.trim();
}

export class NebiusScraper implements ProviderScraper {
  name = 'nebius';
  url = PRICING_URL;
  scrapeIntervalMinutes = 10;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      // Fetch the pricing page with proper browser headers
      const response = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Nebius pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data from Next.js JSON
      const rows = this.parsePricingPage(html);

      return {
        provider: "nebius",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Nebius scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): NebiusPriceRow[] {
    const rows: NebiusPriceRow[] = [];
    const observedAt = new Date().toISOString();

    // Extract pricing data from Next.js JSON
    const nextDataMatch = html.match(/id="__NEXT_DATA__"[^>]*>([^<]*)</);
    if (!nextDataMatch) {
      console.warn('Could not find Next.js data');
      return rows;
    }

    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData.props?.pageProps;

      if (!pageProps) {
        console.warn('Could not find page props in Next.js data');
        return rows;
      }

      // Extract pricing tables from the Apollo state
      const apolloState = pageProps.__APOLLO_STATE__;
      const pagesKey = Object.keys(apolloState).find(key => key.startsWith('pages:'));

      if (!pagesKey) {
        console.warn('Could not find pages key in Apollo state');
        return rows;
      }

      const pageData = apolloState[pagesKey];
      if (!pageData.content) {
        console.warn('Could not find content in page data');
        return rows;
      }

      const content = typeof pageData.content === 'string' ? JSON.parse(pageData.content) : pageData.content;
      if (!content.blocks) {
        console.warn('Could not find blocks in content');
        return rows;
      }

      const blocks = content.blocks;

      for (const block of blocks) {
        if (block.type === 'highlight-table-block' && block.table?.content) {
          const tableContent = block.table.content;
          const title = block.title || '';

          if (title.includes('NVIDIA GPU Instances')) {
            // Parse GPU table
            const gpuRows = this.parseTableData(tableContent, 'GPU', observedAt);
            rows.push(...gpuRows);
          } else if (title.includes('CPU-only instances')) {
            // Parse CPU table
            const cpuRows = this.parseTableData(tableContent, 'CPU', observedAt);
            rows.push(...cpuRows);
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing Next.js data:', error);
    }

    return rows;
  }

  private parseTableData(tableContent: string[][], instanceClass: 'GPU' | 'CPU', observedAt: string): NebiusPriceRow[] {
    const rows: NebiusPriceRow[] = [];

    // Skip header row (first row)
    for (let i = 1; i < tableContent.length; i++) {
      const row = tableContent[i];
      if (row.length !== 4) continue; // Skip malformed rows

      const [item, vcpus, ramGb, priceText] = row;

      const priceRow: NebiusPriceRow = {
        provider: 'nebius',
        source_url: PRICING_URL,
        observed_at: observedAt,
        item: cleanGpuModelName(item),
        class: instanceClass,
        ...(instanceClass === 'GPU' && { gpu_count: 1 }),
        vcpus,
        ram_gb: ramGb,
        price_unit: instanceClass === 'GPU' ? 'gpu_hour' : 'hour',
        price_usd: parsePrice(priceText),
        raw_cost: priceText,
        type: 'Virtual Machine',
      };

      rows.push(priceRow);
    }

    return rows;
  }
}

// Export a singleton instance
export const nebiusScraper = new NebiusScraper();
