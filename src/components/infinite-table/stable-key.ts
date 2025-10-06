import type { ColumnSchema } from "./schema";

// Returns a stable identity key for a GPU config that should not change across scrapes
// Includes provider, model (gpu_model | item | sku), gpu_count, vram_gb, and type.
// This distinguishes 1x vs 8x and similar variants while ignoring volatile pricing/timestamps.
export function stableGpuKey(
  row: Pick<ColumnSchema, "provider" | "gpu_model" | "item" | "sku" | "gpu_count" | "vram_gb" | "type">
): string {
  const provider = row.provider?.toLowerCase().trim();
  const model = (row.gpu_model || row.item || row.sku || "").toLowerCase().trim();
  const count = typeof row.gpu_count === "number" ? `${row.gpu_count}x` : "";
  const vram = typeof row.vram_gb === "number" ? `${row.vram_gb}gb` : "";
  const type = (row.type || "").toLowerCase().trim();

  return [provider, model, count, vram, type].filter(Boolean).join(":");
}


