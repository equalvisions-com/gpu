export type FavoriteKey = string;

export interface FavoritesResponse {
  favorites: FavoriteKey[];
}

// Keep property name aligned with existing API contract
export interface FavoritesRequest {
  gpuUuids: FavoriteKey[];
}


