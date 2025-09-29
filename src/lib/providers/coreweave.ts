import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { PriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://www.coreweave.com/pricing';

const MONEY_RE = /\$([\d,]+(?:\.\d+)?)/;

function toMoney(s?: string | null): number | undefined {
  const m = (s || "").match(MONEY_RE);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}

function toInt(s?: string | null): number | undefined {
  if (!s || s.trim() === '') return undefined;
  const parsed = parseInt(s.trim(), 10);
  return isNaN(parsed) ? undefined : parsed;
}

function toFloat(s?: string | null): number | undefined {
  if (!s || s.trim() === '') return undefined;
  const parsed = parseFloat(s.trim());
  return isNaN(parsed) ? undefined : parsed;
}

export class CoreWeaveScraper implements ProviderScraper {
  name = 'coreweave';
  url = PRICING_URL;
  scrapeIntervalMinutes = 10;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      // Fetch the pricing page with proper browser headers to avoid 403 blocks
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
        throw new Error(`Failed to fetch CoreWeave pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "coreweave",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`CoreWeave scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): PriceRow[] {
    const $ = cheerio.load(html);
    const rows: PriceRow[] = [];
    const observedAt = new Date().toISOString();

    // Parse GPU instances
    const gpuRows = this.parseGPUInstances($, observedAt);
    rows.push(...gpuRows);

    // Parse CPU instances
    const cpuRows = this.parseCPUInstances($, observedAt);
    rows.push(...cpuRows);

    return rows;
  }

  private parseGPUInstances($: cheerio.CheerioAPI, observedAt: string): PriceRow[] {
    const rows: PriceRow[] = [];

    // GPU table rows - look for any row that contains gpu pricing
    const gpuRows = $('div.table-row.w-dyn-item').filter((_, el) => {
      const classes = $(el).attr('class') || '';
      return classes.includes('gpu') && !classes.includes('cpu');
    });

    gpuRows.each((_, rowElem) => {
      try {
        const $row = $(rowElem);

        // Instance ID from data-product attribute
        const link = $row.find('.table-v2-cell--name [data-product]');
        const instanceId = link.attr('data-product');

        // GPU model name
        let modelName = $row.find('.table-v2-cell--name .table-model-name').first().text().trim();

        // Clean up GPU model name: remove "Server Edition" suffix
        modelName = modelName.replace(/\s+Server Edition$/i, '').trim();

        // Price extraction
        const priceText = $row.find('.table-meta-value').first().text().trim();
        const price = priceText && priceText.startsWith('$') ? toMoney(priceText) : undefined;

        // Parse specs
        let gpuCount: number | undefined;
        let vramGb: number | undefined;
        let vcpus: number | undefined;
        let ramGb: number | undefined;
        let storageTb: number | undefined;

        try {
          const specs: Record<string, string> = {};
          $row.find('.table-cell-column-right .table-meta-text-right').each((_, kvElem) => {
            const $kv = $(kvElem);
            const value = $kv.find('.table-meta-value').text().trim();
            const labelDiv = $kv.find('div').last();
            if (labelDiv.length) {
              const label = labelDiv.text().trim();
              specs[label] = value;
            }
          });

          gpuCount = toInt(specs['GPU Count']);
          vramGb = toFloat(specs['VRAM']);
          vcpus = toInt(specs['vCPUs']);
          ramGb = toInt(specs['System RAM']);
          storageTb = toFloat(specs['Local Storage (TB)']);
        } catch (specError) {
          // Continue without specs if parsing fails
        }

        // Determine network type
        const text = `${modelName} ${instanceId || ''}`.toLowerCase();
        const network: 'InfiniBand' | 'Ethernet' | 'Unknown' =
          text.includes('ib') || text.includes('infiniband') ? 'InfiniBand' :
          text.includes('ethernet') ? 'Ethernet' : 'Unknown';

        // Skip storing CoreWeave GPU rows that don't include a GPU Count
        if (gpuCount === undefined || gpuCount === null) {
          return; // skip this row
        }

        const priceRow: PriceRow = {
          provider: 'coreweave',
          source_url: PRICING_URL,
          observed_at: observedAt,
          instance_id: instanceId,
          gpu_model: modelName,
          gpu_count: gpuCount,
          vram_gb: vramGb,
          vcpus: vcpus,
          system_ram_gb: ramGb,
          local_storage_tb: storageTb,
          price_unit: 'hour',
          price_hour_usd: price,
          raw_cost: priceText,
          class: 'GPU',
          network,
          type: 'Virtual Machine',
        };

        rows.push(priceRow);
      } catch (error) {
        // Continue with other rows if one fails
      }
    });

    return rows;
  }

  private parseCPUInstances($: cheerio.CheerioAPI, observedAt: string): PriceRow[] {
    const rows: PriceRow[] = [];

    // CPU table rows with class "kubernetes-cpu-pricing"
    const cpuRows = $('div.table-row.w-dyn-item.kubernetes-cpu-pricing');

    cpuRows.each((_, rowElem) => {
      try {
        const $row = $(rowElem);

        // Instance ID from data-product attribute
        const instanceId = $row.find('.table-v2-cell--name [data-product]').attr('data-product');

        // CPU model name
        const modelName = $row.find('.table-v2-cell--name .table-model-name').first().text().trim();

        // Price extraction
        const priceText = $row.find('.table-meta-value').first().text().trim();
        const price = priceText && priceText.startsWith('$') ? toMoney(priceText) : undefined;

        // Parse specs
        let vcpus: number | undefined;
        let ramGb: number | undefined;
        let storageTb: number | undefined;
        let cpuType: string | undefined;

        try {
          const specs: Record<string, string> = {};
          $row.find('.table-cell-column-right .table-meta-text-right').each((_, kvElem) => {
            const $kv = $(kvElem);
            const value = $kv.find('.table-meta-value').text().trim();
            const labelDiv = $kv.find('div').last();
            if (labelDiv.length) {
              const label = labelDiv.text().trim();
              specs[label] = value;
            }
          });

          vcpus = toInt(specs['vCPUs']);
          ramGb = toInt(specs['System RAM']);
          storageTb = toFloat(specs['Local Storage (TB)']);

          // CPU type from second cell if available
          cpuType = $row.find('.table-v2-cell:nth-of-type(2)').text().trim() || undefined;
        } catch (specError) {
          // Continue without specs if parsing fails
        }

        const priceRow: PriceRow = {
          provider: 'coreweave',
          source_url: PRICING_URL,
          observed_at: observedAt,
          instance_id: instanceId,
          cpu_model: modelName,
          cpu_type: cpuType,
          vcpus: vcpus,
          system_ram_gb: ramGb,
          local_storage_tb: storageTb,
          price_unit: 'hour',
          price_hour_usd: price,
          raw_cost: priceText,
          class: 'CPU',
          network: 'Unknown',
          type: 'Virtual Machine',
        };

        rows.push(priceRow);
      } catch (error) {
        // Continue with other rows if one fails
      }
    });

    return rows;
  }


  private extractFootnotes(text: string): string | undefined {
    // Extract superscript numbers and other footnote indicators
    const footnoteMatch = text.match(/[\d¹²³⁴⁵⁶⁷⁸⁹⁰*]+$/);
    return footnoteMatch ? footnoteMatch[0] : undefined;
  }
}

// Export a singleton instance
export const coreweaveScraper = new CoreWeaveScraper();
