import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { OraclePriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';

const PRICING_URL = 'https://www.oracle.com/cloud/compute/pricing/';

// Oracle GPU hardware specs fallback for instances missing CPU/RAM data in HTML
const ORACLE_GPU_SPECS_FALLBACK: Record<string, { vcpus: number; ramGb: number }> = {
  'BM.GPU.B200.8': { vcpus: 256, ramGb: 2048 },      // NVIDIA B200
  'BM.GPU.GB200.41': { vcpus: 128, ramGb: 1024 },    // NVIDIA B200 NVL72
  'BM.GPU.H200.8': { vcpus: 224, ramGb: 2048 },      // NVIDIA H200
};

// Oracle GPU pricing per GPU (from internal pricing table)
// For multi-GPU instances, multiply by gpu_count to get total instance price
const ORACLE_GPU_PRICING: Record<string, number> = {
  // Large scale-out AI training, data analytics, and HPC
  'BM.GPU.B200.8': 14.00,      // 8x GPUs = $112.00 total
  'BM.GPU.GB200.41': 16.00,   // 4x GPUs = $64.00 total (HTML has superscript 1)
  'BM.GPU.H200.8': 10.00,     // 8x GPUs = $80.00 total
  'BM.GPU.H100.8': 10.00,     // 8x GPUs = $80.00 total
  'BM.GPU.MI300X.8': 6.00,    // 8x GPUs = $48.00 total
  'BM.GPU.A100-v2.8': 4.00,   // 8x GPUs = $32.00 total
  'BM.GPU.L40S.4': 3.50,      // 4x GPUs = $14.00 total
  'BM.GPU4.8': 3.05,          // 8x GPUs = $24.40 total

  // Small AI training, inference, streaming, gaming, and virtual desktop infrastructure
  'VM.GPU.A10.1': 2.00,        // 1x GPU = $2.00 total
  'VM.GPU.A10.2': 2.00,        // 2x GPUs = $4.00 total
  'BM.GPU.A10.4': 2.00,        // 4x GPUs = $8.00 total
  'VM.GPU3.1': 2.95,           // 1x GPU = $2.95 total
  'VM.GPU3.2': 2.95,           // 2x GPUs = $5.90 total
  'VM.GPU3.4': 2.95,           // 4x GPUs = $11.80 total
  'BM.GPU3.8': 2.95,           // 8x GPUs = $23.60 total
  'VM.GPU2.1': 1.275,          // 1x GPU = $1.275 total
  'BM.GPU2.2': 1.275,          // 2x GPUs = $2.55 total
};

export class OracleScraper implements ProviderScraper {
  name = 'oracle';
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
        throw new Error(`Failed to fetch Oracle pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "oracle",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Oracle scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): OraclePriceRow[] {
    const rows: OraclePriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Find the GPU instances table - it's in the rc34w5 div after the compute-gpu header
    const gpuSection = $('#compute-gpu').closest('.rc34w3');
    const gpuTable = gpuSection.find('table').first();

    if (gpuTable.length === 0) {
      console.warn('Could not find Oracle GPU instances table');
      return rows;
    }

    // Parse table rows (skip header)
    gpuTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');

      if (cells.length < 2) {
        return; // Skip malformed rows
      }

      // Extract data from each cell - Oracle table has varying column counts
      const shape = $(cells[0]).find('div').first().text().trim();
      const gpuInfo = $(cells[1]).find('div').first().text().trim();

      // Extract other fields based on position relative to known fields
      let architecture = '';
      let interconnect = '';
      let gpuMemoryText = '';
      let cpuCoresText = '';
      let cpuMemoryText = '';
      let storage = '';
      let network = '';

      if (cells.length >= 3) architecture = $(cells[2]).find('div').first().text().trim() || $(cells[2]).text().trim();
      if (cells.length >= 4) interconnect = $(cells[3]).find('div').first().text().trim() || $(cells[3]).text().trim();
      if (cells.length >= 5) gpuMemoryText = $(cells[4]).find('div').first().text().trim() || $(cells[4]).text().trim();
      if (cells.length >= 6) cpuCoresText = $(cells[5]).find('div').first().text().trim() || $(cells[5]).text().trim();
      if (cells.length >= 7) cpuMemoryText = $(cells[6]).find('div').first().text().trim() || $(cells[6]).text().trim();
      if (cells.length >= 8) storage = $(cells[7]).find('div').first().text().trim() || $(cells[7]).text().trim();
      if (cells.length >= 9) network = $(cells[8]).find('div').first().text().trim() || $(cells[8]).text().trim();

      // Parse GPU information to get gpuCount
      let gpuCount = 1;
      let gpuModel = gpuInfo;

      const gpuMatch = gpuInfo.match(/^(\d+)\s*x\s+(.+)$/);
      if (gpuMatch) {
        gpuCount = parseInt(gpuMatch[1]);
        gpuModel = gpuMatch[2].trim();
      }

      // Clean up GPU model name
      gpuModel = gpuModel.replace(/\s+\d+GB.*$/, '').trim(); // Remove memory info
      gpuModel = gpuModel.replace(/\s+Tensor Core.*$/, '').trim(); // Remove Tensor Core suffix
      gpuModel = gpuModel.replace(/^Nvidia$/, 'NVIDIA').replace(/^Nvidia\s+/, 'NVIDIA '); // Fix capitalization

      // Get pricing from the manual mapping (per GPU pricing)
      let priceHourUsd = 0;
      let rawCost = 'Contact Oracle for pricing';

      const perGpuPrice = ORACLE_GPU_PRICING[shape];
      if (perGpuPrice !== undefined) {
        priceHourUsd = perGpuPrice * gpuCount; // Multiply by GPU count for total instance price
        rawCost = `$${priceHourUsd.toFixed(2)}`;
      }

      if (!shape || !gpuInfo) {
        return; // Skip rows without essential data
      }

      // Parse GPU memory (total, not per GPU)
      const gpuMemoryMatch = gpuMemoryText.match(/(\d+(?:,\d+)?)/);
      const vramGb = gpuMemoryMatch ? parseInt(gpuMemoryMatch[1].replace(',', '')) : 0;

      // Parse CPU cores
      const cpuCoresMatch = cpuCoresText.match(/(\d+)/);
      let vcpus = cpuCoresMatch ? parseInt(cpuCoresMatch[1]) : 0;

      // Parse CPU memory
      const cpuMemoryMatch = cpuMemoryText.match(/(\d+(?:,\d+)?)/);
      let systemRamGb = cpuMemoryMatch ? parseInt(cpuMemoryMatch[1].replace(',', '')) : 0;

      // Apply fallback specs for instances missing CPU/RAM data in HTML
      const fallbackSpecs = ORACLE_GPU_SPECS_FALLBACK[shape];
      if (fallbackSpecs && (vcpus === 0 || systemRamGb === 0)) {
        if (vcpus === 0) vcpus = fallbackSpecs.vcpus;
        if (systemRamGb === 0) systemRamGb = fallbackSpecs.ramGb;
      }

      // Skip if we don't have essential hardware data
      if (!gpuModel || vramGb === 0) {
        console.warn(`Skipping Oracle GPU ${shape}: missing hardware data`);
        return;
      }

      rows.push({
        provider: 'oracle',
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: shape,
        gpu_model: gpuModel,
        gpu_count: gpuCount,
        vram_gb: vramGb,
        vcpus: vcpus,
        system_ram_gb: systemRamGb,
        storage: storage || 'Not specified',
        network: network || 'Not specified',
        architecture: architecture || 'Not specified',
        interconnect: interconnect || 'Not specified',
        price_unit: 'instance_hour',
        price_hour_usd: priceHourUsd,
        raw_cost: rawCost,
        class: 'GPU',
      });

      console.log(`Added Oracle ${shape}: ${gpuModel} (${gpuCount}x), $${priceHourUsd}/hr`);
    });

    return rows;
  }
}

// Export a singleton instance
export const oracleScraper = new OracleScraper();
