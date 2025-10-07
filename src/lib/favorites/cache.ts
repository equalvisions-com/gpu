import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { userFavorites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FAVORITES_CACHE_TTL, getFavoritesCacheTag } from "./constants";
import type { FavoriteKey } from "@/types/favorites";

/**
 * Database row type for user_favorites table
 * Defines the shape of data returned from Drizzle queries
 */
type UserFavoriteRow = {
  id: string;
  userId: string;
  gpuUuid: string;
  createdAt: Date | null;
};

/**
 * Fetches a user's favorite GPU UUIDs with Next.js caching
 * 
 * This function is cached using Next.js's unstable_cache with:
 * - 12 hour revalidation period
 * - User-specific cache tags for targeted invalidation
 * - Distributed cache across serverless functions
 * 
 * @param userId - The user's ID from the session
 * @returns Array of GPU UUIDs that the user has favorited
 * 
 * @example
 * ```typescript
 * const favoriteKeys = await getUserFavoritesFromCache(session.user.id);
 * // ['gpu-uuid-1', 'gpu-uuid-2']
 * ```
 */
export async function getUserFavoritesFromCache(userId: string): Promise<FavoriteKey[]> {
  const getCached = unstable_cache(
    async (uid: string) => {
      try {
        /**
         * Type suppression needed due to Drizzle ORM build artifact conflicts
         * Issue: Multiple Drizzle versions in node_modules create incompatible type declarations
         * Solution: Use type assertion after query execution - runtime behavior is correct
         * TODO: Remove when Drizzle resolves upstream type conflicts
         */
        const rows = await db
          .select()
          // @ts-ignore - Drizzle ORM type conflict between build artifacts (see comment above)
          .from(userFavorites)
          // @ts-ignore - Drizzle ORM type conflict between build artifacts
          .where(eq(userFavorites.userId, uid));
        
        const typedRows = rows as unknown as UserFavoriteRow[];
        return (typedRows || []).map((r) => r.gpuUuid as FavoriteKey);
      } catch (error) {
        console.error('[getUserFavoritesFromCache] Database query failed', {
          userId: uid,
          error: error instanceof Error ? error.message : String(error),
        });
        // Return empty array on error to prevent cascade failures
        return [];
      }
    },
    ["favorites:keys"],
    { 
      revalidate: FAVORITES_CACHE_TTL, 
      tags: [getFavoritesCacheTag(userId)] 
    }
  );

  return getCached(userId);
}

