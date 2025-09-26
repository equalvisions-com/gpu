import {
  ARRAY_DELIMITER,
  RANGE_DELIMITER,
  SLIDER_DELIMITER,
} from "@/lib/delimiters";
import { z } from "zod";

// GPU instance pricing schema
export const columnSchema = z.object({
  // Unique identifier for table operations
  uuid: z.string(),

  // Core identification (from PriceRow)
  provider: z.literal("coreweave"),
  source_url: z.string(),
  observed_at: z.string(),
  instance_id: z.string().optional(),
  sku: z.string().optional(),
  region: z.string().optional(),
  zone: z.string().optional(),

  // Hardware
  gpu_model: z.string().optional(),
  gpu_count: z.number().optional(),
  vram_gb: z.number().optional(),
  vcpus: z.number().optional(),
  system_ram_gb: z.number().optional(),
  local_storage_tb: z.number().optional(),
  cpu_model: z.string().optional(),

  // Pricing
  price_unit: z.enum(["hour", "month", "gb_month"]),
  price_hour_usd: z.number().optional(),
  price_month_usd: z.number().optional(),
  raw_cost: z.string().optional(),
  billing_notes: z.string().optional(),

  // Flags
  class: z.enum(["GPU", "CPU", "service"]),
  network: z.enum(["InfiniBand", "Ethernet", "Unknown"]).optional(),
  spot: z.boolean().optional(),

  // Computed fields
  percentile: z.number().optional(),
});

export type ColumnSchema = z.infer<typeof columnSchema>;

// GPU pricing filter schema
export const columnFilterSchema = z.object({
  provider: z.literal("coreweave").optional(),
  gpu_model: z.string().optional(),
  instance_id: z.string().optional(),
  cpu_model: z.string().optional(),
  gpu_count: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  vram_gb: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  vcpus: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  system_ram_gb: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  local_storage_tb: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  price_hour_usd: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  observed_at: z
    .string()
    .transform((val) => val.split(RANGE_DELIMITER).map(Number))
    .pipe(z.coerce.date().array())
    .optional(),
  class: z.enum(["GPU", "CPU", "service"]).optional(),
  network: z.enum(["InfiniBand", "Ethernet", "Unknown"]).optional(),
});

export type ColumnFilterSchema = z.infer<typeof columnFilterSchema>;


export const facetMetadataSchema = z.object({
  rows: z.array(z.object({ value: z.any(), total: z.number() })),
  total: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type FacetMetadataSchema = z.infer<typeof facetMetadataSchema>;

