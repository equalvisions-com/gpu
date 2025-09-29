import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { CrusoePriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://www.crusoe.ai/cloud/pricing';

// Complete Crusoe GPU specifications (from research)
// Maps GPU model + interface to complete hardware specs
const CRUSOE_GPU_SPECS: Record<string, { vcpus: number; ramGb: number }> = {
  // From user's research data - keys match what scraper extracts: gpuModel (gpuInterface)
  // Model names now include interface (except OAM for AMD)
  'NVIDIA B200 SXM (SXM)': { vcpus: 0, ramGb: 0 },      // Contact Sales - specs unknown, set to 0
  'NVIDIA H200 SXM (SXM)': { vcpus: 22, ramGb: 250 },   // Complete specs
  'NVIDIA H100 SXM (SXM)': { vcpus: 22, ramGb: 120 },   // Complete specs
  'AMD MI300X (OAM)': { vcpus: 30, ramGb: 250 },        // Complete specs (AMD skips OAM in model name)
  'NVIDIA A100 SXM (SXM)': { vcpus: 12, ramGb: 120 },   // Complete specs (80GB SXM)
  'NVIDIA A100 PCIe (PCIe)': { vcpus: 12, ramGb: 120 }, // Complete specs (both 80GB and 40GB PCIe use same specs)
  'NVIDIA L40S PCIe (PCIe)': { vcpus: 8, ramGb: 147 },  // Complete specs
  'NVIDIA A40 PCIe (PCIe)': { vcpus: 6, ramGb: 60 },    // Complete specs
};

export class CrusoeScraper implements ProviderScraper {
  name = 'crusoe';
  url = PRICING_URL;
  scrapeIntervalMinutes = 10;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      // Fetch the pricing page
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
        throw new Error(`Failed to fetch Crusoe pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "crusoe",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Crusoe scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): CrusoePriceRow[] {
    const rows: CrusoePriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Find the GPU pricing table
    const gpuTable = $('table.table');

    if (gpuTable.length === 0) {
      console.warn('Could not find Crusoe GPU pricing table');
      return rows;
    }

    // Parse table rows (skip header)
    gpuTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length < 2) {
        return; // Skip malformed rows
      }

      // Extract GPU information from the first cell
      const gpuCell = $(cells[0]);
      const gpuName = gpuCell.find('.gp-name').first().text().trim();
      const gpuMem = gpuCell.find('.gp-mem').first().text().trim();
      const gpuInterface = gpuCell.find('.gp-mem0model').first().text().trim();

      // Extract On-Demand pricing from the second cell (index 1)
      const onDemandCell = $(cells[1]);
      const priceText = onDemandCell.find('.tr-price').first().text().trim();

      if (!gpuName) {
        return; // Skip rows without GPU name
      }

      // Handle instances that require contacting sales
      let priceHourUsd = 0;
      let isContactSales = false;
      if (priceText === 'Contact sales') {
        console.log(`Including Crusoe ${gpuName}: requires contacting sales`);
        isContactSales = true;
        priceHourUsd = -1; // Special marker for contact sales
      } else {
        // Parse price (remove $ and convert to number)
        const priceMatch = priceText.match(/\$?(\d+(?:\.\d+)?)/);
        priceHourUsd = priceMatch ? parseFloat(priceMatch[1]) : 0;
      }

      // Parse VRAM (remove 'GB' and convert to number)
      const vramMatch = gpuMem.match(/(\d+)/);
      const vramGb = vramMatch ? parseInt(vramMatch[1]) : 0;

      if (vramGb === 0) {
        console.warn(`Skipping Crusoe ${gpuName}: missing VRAM (${vramGb})`);
        return;
      }

      // Clean up GPU model name - include interface but skip OAM for AMD
      let gpuModel = gpuName;
      gpuModel = gpuModel.replace(/^Nvidia$/, 'NVIDIA').replace(/^Nvidia\s+/, 'NVIDIA '); // Fix capitalization

      // Append interface to model name (except OAM for AMD)
      if (gpuInterface && gpuInterface !== 'OAM') {
        gpuModel = `${gpuModel} ${gpuInterface}`;
      }

      // Get complete hardware specs from mapping
      const specsKey = `${gpuModel} (${gpuInterface})`;
      const specs = CRUSOE_GPU_SPECS[specsKey] || { vcpus: 0, ramGb: 0 };

      rows.push({
        provider: 'crusoe',
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: gpuName, // Use GPU name as instance ID
        gpu_model: gpuModel,
        gpu_count: 1, // Crusoe appears to offer single GPU instances
        vram_gb: vramGb,
        gpu_interface: gpuInterface || 'Unknown',
        vcpus: specs.vcpus,
        system_ram_gb: specs.ramGb,
        price_unit: 'gpu_hour',
        ...(isContactSales ? { contact_sales: true } : { price_hour_usd: priceHourUsd }),
        raw_cost: priceText,
        class: 'GPU',
        type: 'VM',
      });

      console.log(`Added Crusoe ${gpuName}: ${gpuModel} (${vramGb}GB ${gpuInterface}) - ${isContactSales ? 'Contact Sales' : `$${priceHourUsd}/hr`}`);
    });

    return rows;
  }
}

// Export a singleton instance
export const crusoeScraper = new CrusoeScraper();
