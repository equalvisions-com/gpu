import { redis } from './client';
import { getJson, mgetJson } from './json';
import type { PriceRow, ProviderSnapshot, CachedPricingData, ProviderResult } from '@/types/pricing';

const PRICING_KEY_PREFIX = 'pricing';
const PROVIDERS_SET_KEY = `${PRICING_KEY_PREFIX}:providers`;

export class PricingCache {
  /**
   * Store pricing data for a provider if content has changed
   */
  async storePricingData(result: ProviderResult, force: boolean = false): Promise<boolean> {
    const { provider, rows, observedAt, sourceHash } = result;

    // Check if content has changed
    if (!force) {
      const currentHash = await this.getCurrentHash(provider);
      if (currentHash === sourceHash) {
        // Content hasn't changed, no need to update
        return false;
      }
    }

    // Get next version number
    const currentVersion = await this.getCurrentVersion(provider);
    const newVersion = currentVersion + 1;

    // Create snapshot
    const snapshot: ProviderSnapshot = {
      provider,
      version: newVersion,
      last_updated: observedAt,
      rows,
    };

    // Create individual instance mappings
    const byInstance: Record<string, PriceRow> = {};
    rows.forEach(row => {
      // Use instance_id for CoreWeave, item for Nebius
      const key = (row as any).instance_id || (row as any).item;
      if (key) {
        byInstance[key] = row;
      }
    });

    const cachedData: CachedPricingData = {
      latest: snapshot,
      version: newVersion,
      hash: sourceHash,
      byInstance,
    };

    // Store in Redis with atomic operations
    const pipeline = redis.pipeline();

    // Ensure provider is registered
    pipeline.sadd(PROVIDERS_SET_KEY, provider);

    // Store latest snapshot
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:latest`, snapshot);

    // Store version
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:version`, newVersion);

    // Store hash
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:hash`, sourceHash);

    // Store individual instances
    rows.forEach((row) => {
      const instanceId = (row as any).instance_id || (row as any).item;
      if (instanceId) {
        pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:by_instance:${instanceId}`, row);
      }
    });

    await pipeline.exec();

    return true;
  }
  // Index helpers removed for simplicity at current scale

  /**
   * Get latest pricing snapshot for a provider
   */
  async getPricingSnapshot(provider: string): Promise<ProviderSnapshot | null> {
    return await getJson<ProviderSnapshot>(`${PRICING_KEY_PREFIX}:${provider}:latest`);
  }

  /**
   * Get pricing data for a specific instance
   */
  async getInstancePricing(provider: string, instanceId: string): Promise<PriceRow | null> {
    return await getJson<PriceRow>(`${PRICING_KEY_PREFIX}:${provider}:by_instance:${instanceId}`);
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const members = await redis.smembers(PROVIDERS_SET_KEY as any);
    return (members as unknown as string[]) ?? [];
  }

  /**
   * Get pricing snapshots for all providers
   */
  async getAllPricingSnapshots(): Promise<ProviderSnapshot[]> {
    const providers = await this.getAvailableProviders();
    if (!providers.length) return [];
    const keys = providers.map((p) => `${PRICING_KEY_PREFIX}:${p}:latest`);
    const values = await mgetJson<ProviderSnapshot>(keys);
    return (values || []).filter(Boolean) as ProviderSnapshot[];
  }

  /**
   * No-op retention for ≤1k rows. Present to satisfy maintenance endpoint.
   * Returns 0 as nothing is trimmed in the simplified setup.
   */
  async trimOldRows(_observedBeforeTs: number): Promise<number> {
    return 0;
  }

  /**
   * Get current hash for a provider
   */
  private async getCurrentHash(provider: string): Promise<string | null> {
    return await redis.get<string>(`${PRICING_KEY_PREFIX}:${provider}:hash`);
  }

  /**
   * Get current version for a provider
   */
  private async getCurrentVersion(provider: string): Promise<number> {
    const version = await redis.get<string>(`${PRICING_KEY_PREFIX}:${provider}:version`);
    return version ? parseInt(version) : 0;
  }

  /**
   * Clear all pricing data for a provider (useful for testing)
   */
  async clearProviderData(provider: string): Promise<void> {
    const keys = await redis.keys(`${PRICING_KEY_PREFIX}:${provider}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.srem(PROVIDERS_SET_KEY, provider);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    providers: string[];
    totalInstances: number;
  }> {
    const providers = await this.getAvailableProviders();
    let totalInstances = 0;

    for (const provider of providers) {
      const snapshot = await this.getPricingSnapshot(provider);
      if (snapshot) {
        totalInstances += snapshot.rows.length;
      }
    }

    return {
      providers,
      totalInstances,
    };
  }
}

// Export singleton instance
export const pricingCache = new PricingCache();
