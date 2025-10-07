import type { FavoritesResponse, FavoritesRequest, FavoriteKey } from "@/types/favorites";
import { FAVORITES_API_TIMEOUT } from "./constants";

/**
 * Custom error class for favorites API operations
 * Provides structured error information for better error handling
 */
export class FavoritesAPIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "FavoritesAPIError";
  }
}

/**
 * Creates a fetch request with automatic timeout
 * Prevents hanging requests from blocking the UI indefinitely
 * 
 * @param url - The API endpoint URL
 * @param options - Standard fetch options
 * @param timeout - Timeout in milliseconds (default: 10s)
 * @returns Promise that resolves with Response or rejects on timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = FAVORITES_API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new FavoritesAPIError(
        "Request timeout - server took too long to respond",
        408,
        "TIMEOUT"
      );
    }
    throw error;
  }
}

/**
 * Fetches the current user's favorites from the API
 * 
 * @returns Promise resolving to array of favorite GPU keys
 * @throws FavoritesAPIError on failure
 * 
 * @example
 * ```typescript
 * try {
 *   const favorites = await getFavorites();
 * } catch (error) {
 *   if (error instanceof FavoritesAPIError && error.status === 401) {
 *     // Redirect to login
 *   }
 * }
 * ```
 */
export async function getFavorites(): Promise<FavoriteKey[]> {
  try {
    const response = await fetchWithTimeout("/api/favorites");

    if (response.status === 401) {
      throw new FavoritesAPIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (response.status === 429) {
      throw new FavoritesAPIError(
        "Rate limit exceeded, try again shortly",
        429,
        "RATE_LIMIT"
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new FavoritesAPIError(
        errorData?.error || "Failed to fetch favorites",
        response.status,
        "API_ERROR"
      );
    }

    const data: FavoritesResponse = await response.json();
    return (data.favorites || []) as FavoriteKey[];
  } catch (error) {
    if (error instanceof FavoritesAPIError) {
      throw error;
    }
    
    console.error('[getFavorites] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    throw new FavoritesAPIError(
      "Network error - failed to fetch favorites",
      0,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Adds one or more GPUs to user's favorites
 * 
 * @param gpuUuids - Array of GPU UUIDs to favorite
 * @returns Promise resolving on success
 * @throws FavoritesAPIError on failure
 */
export async function addFavorites(gpuUuids: FavoriteKey[]): Promise<void> {
  if (gpuUuids.length === 0) return;

  try {
    const response = await fetchWithTimeout("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpuUuids } satisfies FavoritesRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new FavoritesAPIError(
        errorData?.error || "Failed to add favorites",
        response.status,
        response.status === 429 ? "RATE_LIMIT" : "API_ERROR"
      );
    }
  } catch (error) {
    if (error instanceof FavoritesAPIError) {
      throw error;
    }

    console.error('[addFavorites] Unexpected error', {
      count: gpuUuids.length,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new FavoritesAPIError(
      "Network error - failed to add favorites",
      0,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Removes one or more GPUs from user's favorites
 * 
 * @param gpuUuids - Array of GPU UUIDs to unfavorite
 * @returns Promise resolving on success
 * @throws FavoritesAPIError on failure
 */
export async function removeFavorites(gpuUuids: FavoriteKey[]): Promise<void> {
  if (gpuUuids.length === 0) return;

  try {
    const response = await fetchWithTimeout("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpuUuids } satisfies FavoritesRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new FavoritesAPIError(
        errorData?.error || "Failed to remove favorites",
        response.status,
        response.status === 429 ? "RATE_LIMIT" : "API_ERROR"
      );
    }
  } catch (error) {
    if (error instanceof FavoritesAPIError) {
      throw error;
    }

    console.error('[removeFavorites] Unexpected error', {
      count: gpuUuids.length,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new FavoritesAPIError(
      "Network error - failed to remove favorites",
      0,
      "NETWORK_ERROR"
    );
  }
}

