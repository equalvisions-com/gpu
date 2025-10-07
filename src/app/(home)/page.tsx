import * as React from "react";
import { searchParamsCache } from "@/components/infinite-table/search-params";
import { getQueryClient } from "@/providers/get-query-client";
import { dataOptions } from "@/components/infinite-table/query-options";
import { Client } from "@/components/infinite-table/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pricingCache } from "@/lib/redis";
import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import { stableGpuKey } from "@/components/infinite-table/stable-key";
import { getUserFavoritesFromCache } from "@/lib/favorites/cache";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const isFavoritesMode = params.favorites === 'true';

  if (isFavoritesMode) {
    // Start snapshots fetch immediately; fetch session in parallel
    const getSnapshotsCached = unstable_cache(
      async () => {
        return await pricingCache.getAllPricingSnapshots();
      },
      ["pricing:snapshots"],
      { revalidate: 900, tags: ["pricing"] }
    );
    const snapshotsPromise = getSnapshotsCached();

    const hdrsForFav = await headers();
    const sessionPromise = auth.api.getSession({ headers: hdrsForFav });
    const [session, pricingSnapshots] = await Promise.all([
      sessionPromise,
      snapshotsPromise,
    ]);

    if (!session) {
      // Redirect to signin if not authenticated
      return <div>Please sign in to view favorites</div>;
    }

    // Flatten all pricing data, only GPU class rows
    const allGpuData: ColumnSchema[] = pricingSnapshots.flatMap((snapshot: any) =>
      snapshot.rows
        .filter((row: any) => row.class === 'GPU')
        .map((row: any) => {
          const observedAt = snapshot.last_updated;
          const hashInput = JSON.stringify({ provider: snapshot.provider, observed_at: observedAt, row });
          const uuid = createHash("sha256").update(hashInput).digest("hex");
          return {
            uuid,
            ...row,
            provider: snapshot.provider,
            observed_at: observedAt,
          } as ColumnSchema;
        })
    );

    // Fetch user's favorites with caching
    const initialFavoriteKeys: string[] = await getUserFavoritesFromCache(session.user.id);
    const favoriteKeys = new Set<string>(initialFavoriteKeys);

    // Filter data to only show favorites (compare by stable key, not volatile uuid)
    const favoritesFilteredData = allGpuData.filter(row => favoriteKeys.has(stableGpuKey(row)));

    return <Client initialFavoritesData={favoritesFilteredData} initialFavoriteKeys={initialFavoriteKeys} />;
  }

  // Normal mode - show all data
  const search = searchParamsCache.parse(params);
  const queryClient = getQueryClient();
  const prefetchPromise = queryClient.prefetchInfiniteQuery(dataOptions(search));

  // Prehydrate favorites keys for authed users to avoid flicker on first selection
  const hdrs = await headers();
  const sessionPromise = auth.api.getSession({ headers: hdrs });
  const [, session] = await Promise.all([prefetchPromise, sessionPromise]);
  
  let initialFavoriteKeys: string[] | undefined;
  if (session) {
    initialFavoriteKeys = await getUserFavoritesFromCache(session.user.id);
  }

  return <Client initialFavoriteKeys={initialFavoriteKeys} />;
}

