// Provider types
export type Provider = "coreweave" | "nebius";

// CoreWeave pricing schema
export type CoreWeavePriceRow = {
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

// Nebius pricing schema
export type NebiusPriceRow = {
  provider: "nebius";
  source_url: string;           // https://nebius.com/prices
  observed_at: string;          // ISO timestamp

  // Compute identifiers
  item: string;                 // e.g. "NVIDIA HGX H100" or "AMD EPYC Genoa"
  class: "GPU" | "CPU";         // GPU or CPU table

  // Hardware
  gpu_count?: number;           // Always 1 for GPU instances

  // Specs (may be ranges)
  vcpus: string;                // "16", "8-40", etc.
  ram_gb: string;               // "200", "32-160", etc.

  // Pricing
  price_unit: "gpu_hour" | "hour"; // GPU table uses per GPU-hour, CPU uses per hour
  price_usd?: number;           // numeric price (e.g. 2.95); undefined if "Contact us"
  raw_cost: string;             // original price string (e.g. "$2.95", "from $1.82", "Contact us")
};

// Union type for all price rows
export type PriceRow = CoreWeavePriceRow | NebiusPriceRow;

export type ProviderSnapshot = {
  provider: Provider;
  version: number;             // monotonic
  last_updated: string;        // ISO (same as observed_at of the scrape run)
  rows: PriceRow[];
};

export interface ProviderResult {
  provider: Provider;
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
