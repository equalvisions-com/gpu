import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { DigitalOceanPriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://www.digitalocean.com/pricing/gpu-droplets';

export class DigitalOceanScraper implements ProviderScraper {
  name = 'digitalocean';
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
        throw new Error(`Failed to fetch DigitalOcean pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "digitalocean",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`DigitalOcean scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): DigitalOceanPriceRow[] {
    const rows: DigitalOceanPriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Find all pricing cards that contain "On-Demand Price"
    const processedCards = new Set<string>();

    $('[class*="CardPricingCard"]').each((_, card) => {
      const $card = $(card);

      // Check if this card contains "On-Demand Price"
      if (!$card.text().includes('On-Demand Price')) {
        return;
      }

      // Create a unique identifier for this card to avoid duplicates
      const cardId = $card.find('h3').first().text().trim();
      if (processedCards.has(cardId)) {
        return;
      }
      processedCards.add(cardId);

      // Extract GPU name - look for h3 elements in the card that don't contain "On-Demand Price"
      const gpuNameElements = $card.find('h3').filter((_, el) => !$(el).text().includes('On-Demand Price'));
      let gpuName = gpuNameElements.first().text().trim();

      if (!gpuName) {
        console.warn('Could not extract GPU name from DigitalOcean pricing card');
        return;
      }

      // Clean up the GPU name: remove trademark symbols, ×count suffixes, and "generation"
      gpuName = gpuName.replace(/™/g, '').replace(/×\d+$/, '').replace(/\s+generation$/i, '').trim();

      // Extract specifications from the list items using the specific span structure
      const specs: { [key: string]: string } = {};

      // Target the specific span classes used in DigitalOcean's HTML
      $card.find('li').each((_, item) => {
        const $item = $(item);
        const $labelSpan = $item.find('span[class*="Miafh"], span[class*="gKVwPQ"]').first();
        const $valueSpan = $item.find('span[class*="jfxkfG"], span[class*="lpkpkz"]').last();

        if ($labelSpan.length && $valueSpan.length) {
          const label = $labelSpan.text().trim().toLowerCase();
          const value = $valueSpan.text().trim();
          specs[label] = value;
        }
      });

      // Extract key specifications
      const gpuCount = this.parseNumber(specs['gpus per droplet']) ||
                      (gpuName.includes('×8') ? 8 :
                       gpuName.includes('×4') ? 4 :
                       gpuName.includes('×2') ? 2 : 1);

      const gpuMemoryMatch = specs['gpu memory']?.match(/(\d+(?:,\d+)?)/);
      const vramGb = gpuMemoryMatch ? parseInt(gpuMemoryMatch[1].replace(',', '')) : 0;

      const dropletMemoryMatch = specs['droplet memory']?.match(/(\d+(?:,\d+)?)/);
      const systemRamGb = dropletMemoryMatch ? Math.round(parseFloat(dropletMemoryMatch[1].replace(',', ''))) : 0;

      const vcpus = this.parseNumber(specs['droplet vcpus']) || 0;

      // Build storage description
      const bootDisk = specs['boot disk'];
      const scratchDisk = specs['scratch disk'];
      const storageParts = [];
      if (bootDisk) storageParts.push(`Boot: ${bootDisk}`);
      if (scratchDisk) storageParts.push(`Scratch: ${scratchDisk}`);
      const storage = storageParts.join(', ') || 'Unknown';

      // Extract transfer allowance
      const transferMatch = specs['transfer']?.match(/(\d+(?:,\d+)?)/);
      const transferGb = transferMatch ? parseInt(transferMatch[1].replace(',', '')) : undefined;

      // Extract pricing from the header text that shows the strike-through pricing
      let priceHourUsd = 0;
      const priceText = $card.find('.gpu-droplets__StyledStrikeThrough-sc-93767cc8-0, [class*="strike"], span').first().text().trim();
      const priceMatch = priceText.match(/\$(\d+(?:\.\d+)?)/);
      if (priceMatch) {
        priceHourUsd = parseFloat(priceMatch[1]);
        // DigitalOcean shows per-GPU pricing for multi-GPU instances, but we want total instance price
        // Multiply by GPU count for instances with more than 1 GPU
        if (gpuCount > 1) {
          priceHourUsd *= gpuCount;
        }
      }

      // Skip if we don't have essential data
      if (!gpuName || priceHourUsd === 0) {
        console.warn(`Skipping DigitalOcean GPU ${gpuName}: missing data (price: ${priceHourUsd})`);
        return;
      }

      // Create instance ID from the slug in the card data or generate from name
      const cardData = $card.attr('data-card') || $card.find('[data-slug]').attr('data-slug');
      const instanceId = cardData || gpuName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      rows.push({
        provider: 'digitalocean',
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: instanceId,
        gpu_model: gpuName,
        gpu_count: gpuCount,
        vram_gb: vramGb,
        vcpus: vcpus,
        system_ram_gb: systemRamGb,
        storage: storage,
        transfer_gb: transferGb,
        price_unit: gpuCount === 1 ? 'gpu_hour' : 'instance_hour',
        price_hour_usd: priceHourUsd,
        raw_cost: `$${priceHourUsd.toFixed(2)}`,
        class: 'GPU',
      });

      console.log(`Added DigitalOcean ${gpuName}: $${priceHourUsd.toFixed(2)}/hr (${gpuCount} GPU${gpuCount > 1 ? 's' : ''})`);
    });

    return rows;
  }

  private parseNumber(text: string | undefined): number | undefined {
    if (!text) return undefined;
    const num = parseFloat(text.replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  }
}

// Export a singleton instance
export const digitaloceanScraper = new DigitalOceanScraper();
