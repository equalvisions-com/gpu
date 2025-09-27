import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { LambdaPriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://lambda.ai/pricing';

export class LambdaScraper implements ProviderScraper {
  name = 'lambda';
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
        throw new Error(`Failed to fetch Lambda pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "lambda",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Lambda scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): LambdaPriceRow[] {
    const rows: LambdaPriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Find the main pricing tabbed content section (should have 4 tabs: 8x, 4x, 2x, 1x)
    // Look for the section that contains "Choose your GPU configuration" text
    const $pricingSection = $('p:contains("Choose your GPU configuration")').closest('.comp-tabbed-content');

    if ($pricingSection.length === 0) {
      console.warn('Could not find Lambda pricing tabbed content section');
      return rows;
    }

    // Find all tab panels within this section
    $pricingSection.find('.comp-tabbed-content__tab-panel').each((_, panel) => {
      const $panel = $(panel);

      // Get the GPU count from the corresponding tab button within this section
      const tabIndex = $panel.attr('data-tab');
      const tabButton = $pricingSection.find(`.comp-tabbed-content__tab-btn[data-tab="${tabIndex}"]`);
      const gpuCountText = tabButton.text().trim();
      const gpuCount = parseInt(gpuCountText.replace('x', ''));

      if (isNaN(gpuCount)) {
        console.warn(`Could not parse GPU count from tab: ${gpuCountText}`);
        return;
      }

      // Find the table within this tab panel
      const $table = $panel.find('table');

      // Skip header row and process data rows
      $table.find('tbody tr').each((rowIndex, row) => {
        if (rowIndex === 0) return; // Skip header row

        const $cells = $(row).find('td');
        if ($cells.length < 6) return; // Skip malformed rows

        // Extract data from cells
        const gpuModelText = $cells.eq(0).text().trim();
        const vramText = $cells.eq(1).text().trim();
        const vcpusText = $cells.eq(2).text().trim();
        const ramText = $cells.eq(3).text().trim();
        const storageText = $cells.eq(4).text().trim();
        const priceText = $cells.eq(5).text().trim();

        // Parse GPU model (remove "On-demand Xx " prefix)
        const gpuModel = gpuModelText.replace(/^On-demand \dx\s/, '').trim();

        // Parse VRAM (remove "GB" and convert to number)
        const vramMatch = vramText.match(/(\d+)/);
        const vramGb = vramMatch ? parseInt(vramMatch[1]) : 0;

        // Parse vCPUs
        const vcpus = parseInt(vcpusText) || 0;

        // Parse RAM (handle both GiB and GB, convert to GB)
        let systemRamGb = 0;
        if (ramText.includes('GiB')) {
          const ramMatch = ramText.match(/(\d+(?:\.\d+)?)/);
          if (ramMatch) {
            systemRamGb = Math.round(parseFloat(ramMatch[1]) / 1024 * 100) / 100; // Convert GiB to GB
          }
        } else {
          const ramMatch = ramText.match(/(\d+(?:\.\d+)?)/);
          if (ramMatch) {
            systemRamGb = parseFloat(ramMatch[1]);
          }
        }

        // Parse price
        const priceMatch = priceText.match(/\$(\d+(?:\.\d+)?)/);
        const priceHourUsd = priceMatch ? parseFloat(priceMatch[1]) : 0;

        // Skip if we don't have essential data
        if (!gpuModel || vramGb === 0 || priceHourUsd === 0) {
          console.warn(`Skipping Lambda GPU ${gpuModel}: missing data (VRAM: ${vramGb}, Price: ${priceHourUsd})`);
          return;
        }

        // Create instance ID
        const instanceId = `${gpuCount}x-${gpuModel.toLowerCase().replace(/\s+/g, '-')}`;

        rows.push({
          provider: 'lambda',
          source_url: PRICING_URL,
          observed_at: observedAt,
          instance_id: instanceId,
          gpu_model: gpuModel,
          gpu_count: gpuCount,
          vram_gb: vramGb,
          vcpus: vcpus,
          system_ram_gb: systemRamGb,
          storage: storageText,
          price_unit: 'gpu_hour',
          price_hour_usd: priceHourUsd,
          raw_cost: priceText,
          class: 'GPU',
        });
      });
    });

    return rows;
  }
}

// Export a singleton instance
export const lambdaScraper = new LambdaScraper();
