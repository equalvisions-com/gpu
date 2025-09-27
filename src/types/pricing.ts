// Provider types
export type Provider = "coreweave" | "nebius" | "hyperstack" | "runpod" | "lambda" | "digitalocean";

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

// (moved final union below to include Hyperstack)

// Hyperstack pricing schema (On-Demand GPU)
export type HyperstackPriceRow = {
  provider: "hyperstack";
  source_url: string;           // https://www.hyperstack.cloud/gpu-pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // slug of gpu_model (e.g., "nvidia-h100-sxm")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100 SXM"
  gpu_count: number;            // always 1 (per GPU pricing)
  vram_gb?: number;             // parsed from VRAM (GB)
  vcpus?: number;               // parsed from Max pCPUs per GPU
  system_ram_gb?: number;       // parsed from Max RAM (GB) per GPU

  // Pricing
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd?: number;      // numeric price value
  raw_cost?: string;            // original price text (e.g., "$2.40")

  // Flags
  class: "GPU";                // On-demand GPU rows only
  network?: "InfiniBand" | "Ethernet" | "Unknown"; // not specified
};

// RunPod pricing schema
export type RunPodPriceRow = {
  provider: "runpod";
  source_url: string;           // https://www.runpod.io/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // deploy link parameter (e.g., "B200", "H100+NVL")

  // Hardware
  gpu_model: string;            // e.g., "B200", "H100 NVL"
  gpu_count: number;            // always 1 (per GPU pricing)
  vram_gb: number;              // VRAM in GB (e.g., 180, 94, 80)
  vcpus: number;                // vCPUs count (e.g., 28, 16, 20)
  system_ram_gb: number;        // System RAM in GB (e.g., 283, 94, 125)

  // Pricing
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd: number;       // hourly price in USD
  raw_cost: string;             // original price text (e.g., "$5.99", "$3.00")

  // Flags
  class: "GPU";                // GPU instances only
};

// Lambda pricing schema
export type LambdaPriceRow = {
  provider: "lambda";
  source_url: string;           // https://lambda.ai/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // instance type (e.g., "8x-nvidia-b200-sxm6")

  // Hardware (per GPU specs)
  gpu_model: string;            // e.g., "NVIDIA B200 SXM6"
  gpu_count: number;            // number of GPUs in instance (1, 2, 4, 8)
  vram_gb: number;              // VRAM per GPU in GB
  vcpus: number;                // total vCPUs for the instance
  system_ram_gb: number;        // total RAM for the instance in GB
  storage: string;              // storage description (e.g., "22 TiB SSD")

  // Pricing
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd: number;       // price per GPU per hour
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
};

// DigitalOcean pricing schema
export type DigitalOceanPriceRow = {
  provider: "digitalocean";
  source_url: string;           // https://www.digitalocean.com/pricing/gpu-droplets
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // instance type (e.g., "nvidia-h100-x8")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100"
  gpu_count: number;            // number of GPUs in droplet (1 or 8)
  vram_gb: number;              // VRAM per GPU in GB
  vcpus: number;                // total vCPUs for the droplet
  system_ram_gb: number;        // total RAM for the droplet in GB
  storage: string;              // storage description

  // Network
  transfer_gb?: number;         // transfer allowance in GB

  // Pricing (on-demand only)
  price_unit: "gpu_hour" | "instance_hour";  // per GPU-hour or per instance-hour for multi-GPU
  price_hour_usd: number;       // price per GPU per hour or total instance price
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
};

// Union type for all price rows
export type PriceRow = CoreWeavePriceRow | NebiusPriceRow | HyperstackPriceRow | RunPodPriceRow | LambdaPriceRow | DigitalOceanPriceRow;

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
