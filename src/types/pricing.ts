// Canonical schema normalized across all providers
export type PriceRow = {
  provider: "coreweave";
  source_url: string;           // e.g., https://www.coreweave.com/pricing
  observed_at: string;          // ISO timestamp when you scraped
  instance_id?: string;         // e.g., "nvidia-gb200-nvl72"
  sku?: string;                 // not present in HTML; leave undefined
  region?: string;              // CoreWeave marketing page is global; leave undefined
  zone?: string;                // leave undefined

  // Hardware
  gpu_model?: string;           // e.g., "NVIDIA GB200 NVL72", "H100 PCIe"
  gpu_count?: number;           // integer parsed from "GPU Count" (empty for CPU rows)
  vram_gb?: number;             // number parsed from "VRAM"
  vcpus?: number;               // integer parsed from "vCPUs"
  system_ram_gb?: number;       // integer parsed from "System RAM"
  local_storage_tb?: number;    // number parsed from "Local Storage (TB)"
  cpu_model?: string;           // e.g., "AMD Genoa (9454)" for CPU rows
  cpu_type?: string;            // "High Performance", "General Purpose", etc.

  // Pricing
  price_unit: "hour" | "month" | "gb_month"; // price units vary by service
  price_hour_usd?: number;      // numeric value for hourly rates
  price_month_usd?: number;     // numeric value for monthly rates
  raw_cost?: string;            // original text such as "$49.24" or "$0.110/GB/mo*"
  billing_notes?: string;       // freeform for footnotes (e.g., "superscript 1")

  // Flags
  class: "GPU" | "CPU" | "service"; // "GPU" if GPU Count is present, "CPU" if not, or "service" for NAT/VPC/Data Transfer rows
  network?: "InfiniBand" | "Ethernet" | "Unknown"; // hint from name/ID (contains "IB" => InfiniBand)
  spot?: boolean;               // marketing page lists on‑demand rates; leave undefined
};

export type ProviderSnapshot = {
  provider: "coreweave";
  version: number;             // monotonic
  last_updated: string;        // ISO (same as observed_at of the scrape run)
  rows: PriceRow[];
};

export interface ProviderResult {
  provider: "coreweave";
  rows: PriceRow[];
  observedAt: string; // ISO timestamp
  sourceHash: string;
  version?: number;
}

export interface CachedPricingData {
  latest: ProviderSnapshot;
  version: number;
  hash: string;
  byInstance: Record<string, PriceRow>;
}
