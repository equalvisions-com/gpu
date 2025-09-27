import { redis } from './client';
import type { PriceRow, ProviderSnapshot, CachedPricingData, ProviderResult } from '@/types/pricing';

const PRICING_KEY_PREFIX = 'pricing';

export class PricingCache {
  /**
   * Store pricing data for a provider if content has changed
   */
  async storePricingData(result: ProviderResult): Promise<boolean> {
    const { provider, rows, observedAt, sourceHash } = result;

    // Check if content has changed
    const currentHash = await this.getCurrentHash(provider);
    if (currentHash === sourceHash) {
      // Content hasn't changed, no need to update
      return false;
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
      const key = row.instance_id || (row as any).item;
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

    // Store latest snapshot
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:latest`, snapshot);

    // Store version
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:version`, newVersion);

    // Store hash
    pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:hash`, sourceHash);

    // Store individual instances
    Object.entries(byInstance).forEach(([instanceId, row]) => {
      pipeline.set(`${PRICING_KEY_PREFIX}:${provider}:by_instance:${instanceId}`, row);
    });

    await pipeline.exec();

    return true;
  }

  /**
   * Get latest pricing snapshot for a provider
   */
  async getPricingSnapshot(provider: string): Promise<ProviderSnapshot | null> {
    const data = await redis.get(`${PRICING_KEY_PREFIX}:${provider}:latest`);
    if (!data) return null;

    // Upstash Redis automatically deserializes JSON, so data should already be an object
    return data as ProviderSnapshot;
  }

  /**
   * Get pricing data for a specific instance
   */
  async getInstancePricing(provider: string, instanceId: string): Promise<PriceRow | null> {
    const data = await redis.get<string>(`${PRICING_KEY_PREFIX}:${provider}:by_instance:${instanceId}`);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const keys = await redis.keys(`${PRICING_KEY_PREFIX}:*:latest`);
    return keys.map(key => key.split(':')[1]).filter(Boolean);
  }

  /**
   * Get pricing snapshots for all providers
   */
  async getAllPricingSnapshots(): Promise<ProviderSnapshot[]> {
    const providers = await this.getAvailableProviders();
    const snapshots: ProviderSnapshot[] = [];

    for (const provider of providers) {
      const snapshot = await this.getPricingSnapshot(provider);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
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
