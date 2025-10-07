/**
 * Shared constants for favorites functionality
 * Centralizes all magic strings and configuration values
 */

/** React Query cache key for favorites data */
export const FAVORITES_QUERY_KEY = ["favorites"] as const;

/** BroadcastChannel name for cross-tab synchronization */
export const FAVORITES_BROADCAST_CHANNEL = "favorites" as const;

/** Cache revalidation time for favorites (12 hours in seconds) */
export const FAVORITES_CACHE_TTL = 43200;

/** API request timeout (10 seconds in milliseconds) */
export const FAVORITES_API_TIMEOUT = 10000;

/**
 * Generates a cache tag for a specific user's favorites
 * Used for Next.js cache revalidation
 */
export function getFavoritesCacheTag(userId: string): string {
  return `favorites:user:${userId}`;
}

/**
 * Generates a rate limit key for a specific user's favorites operations
 */
export function getFavoritesRateLimitKey(userId: string): string {
  return `favorites:${userId}`;
}

