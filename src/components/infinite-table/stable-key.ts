import type { ColumnSchema } from "./schema";

/**
 * Generates a stable identity key for a GPU configuration
 * 
 * This function creates a deterministic key that uniquely identifies a GPU configuration
 * across different pricing scrapes and data snapshots. The key is based on immutable
 * characteristics of the GPU offering, not volatile data like pricing or timestamps.
 * 
 * **Key Components:**
 * - Provider (e.g., "coreweave", "lambda")
 * - GPU Model (gpu_model | item | sku - provider-specific field names)
 * - GPU Count (e.g., "1x", "8x")
 * - VRAM in GB (e.g., "80gb", "141gb")
 * - Type (e.g., "virtual machine", "bare metal")
 * 
 * **Why This Matters:**
 * UUIDs change between scrapes, but GPU configurations remain the same.
 * This stable key allows favorites to persist across data refreshes.
 * 
 * @param row - GPU configuration data (partial ColumnSchema)
 * @returns Stable key string (e.g., "coreweave:nvidia h100:8x:80gb:virtual machine")
 * 
 * @example
 * ```typescript
 * const key = stableGpuKey({
 *   provider: "CoreWeave",
 *   gpu_model: "NVIDIA H100",
 *   gpu_count: 8,
 *   vram_gb: 80,
 *   type: "Virtual Machine"
 * });
 * // Returns: "coreweave:nvidia h100:8x:80gb:virtual machine"
 * ```
 */
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


