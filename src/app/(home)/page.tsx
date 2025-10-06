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
import { db } from "@/db/client";
import { userFavorites } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Read favorite keys via Next.js cache and tag for revalidation after writes
    const getUserFavoriteKeysCached = unstable_cache(
      async (userId: string) => {
        // @ts-ignore - Drizzle typing quirk
        const rows: Array<{ gpuUuid: string }> = await db
          // use a simple select().from(table) to avoid drizzle typing conflicts
          .select()
          .from(userFavorites as any)
          // @ts-ignore drizzle SQL type mismatch between build artifacts
          .where(eq(userFavorites.userId as any, userId as any));
        return (rows || []).map((r: any) => r.gpuUuid as string);
      },
      ["favorites:keys"],
      { revalidate: 43200, tags: [`favorites:user:${session.user.id}`] }
    );

    const initialFavoriteKeys: string[] = await getUserFavoriteKeysCached(session.user.id);
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
    const getUserFavoriteKeysCached = unstable_cache(
      async (userId: string) => {
        // @ts-ignore - Drizzle typing quirk
        const rows: Array<{ gpuUuid: string }> = await db
          .select()
          .from(userFavorites as any)
          // @ts-ignore drizzle SQL type mismatch between build artifacts
          .where(eq(userFavorites.userId as any, userId as any));
        return (rows || []).map((r: any) => r.gpuUuid as string);
      },
      ["favorites:keys"],
      { revalidate: 43200, tags: [`favorites:user:${session.user.id}`] }
    );
    initialFavoriteKeys = await getUserFavoriteKeysCached(session.user.id);
  }

  return <Client initialFavoriteKeys={initialFavoriteKeys} />;
}

