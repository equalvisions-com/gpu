import { NextRequest } from "next/server";
import type { InfiniteQueryResponse, LogsMeta } from "@/components/infinite-table/query-options";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import { searchParamsCache } from "@/components/infinite-table/search-params";
import {
  filterData,
  getFacetsFromData,
  sliderFilterValues,
  sortData,
} from "@/components/infinite-table/api/helpers";
import { pricingCache } from "@/lib/redis";
import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
export const dynamic = 'force-dynamic';

 

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // TODO: we could use a POST request to avoid this
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const search = searchParamsCache.parse(Object.fromEntries(_search));

    // Read from Redis cache directly (avoid network hop) and cache base step
    const getSnapshotsCached = unstable_cache(
      async () => {
        return await pricingCache.getAllPricingSnapshots();
      },
      ["pricing:snapshots"],
      { revalidate: 900, tags: ["pricing"] }
    );
    const pricingSnapshots = await getSnapshotsCached();

    // Flatten all pricing data from all providers, only including GPU class rows
    const totalData: ColumnSchema[] = pricingSnapshots.flatMap((snapshot: any) =>
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

    // Apply date filtering if specified
    const _date =
      search.observed_at?.length === 1
        ? [search.observed_at[0], new Date(search.observed_at[0].getTime() + 24 * 60 * 60 * 1000)]
        : search.observed_at;

    // REMINDER: we need to filter out the slider values because they are not part of the search params
    const _rest = Object.fromEntries(
      Object.entries(search).filter(
        ([key]) => !sliderFilterValues.includes(key as any),
      ),
    );

    const rangedData = filterData(totalData, { observed_at: _date });
    const withoutSliderData = filterData(rangedData, { ..._rest, observed_at: null });

    const filteredData = filterData(withoutSliderData, { ...search, observed_at: null });
    const sortedData = sortData(filteredData, search.sort);
    const withoutSliderFacets = getFacetsFromData(withoutSliderData);
    const facets = getFacetsFromData(filteredData);

    // Offset-based pagination (align with main API)
    const pageSize = search.size ?? 50;
    const startOffset = typeof search.cursor === 'number' && search.cursor >= 0 ? search.cursor : 0;
    const data = sortedData.slice(startOffset, startOffset + pageSize);
    const nextCursor = startOffset + data.length < sortedData.length ? startOffset + data.length : null;
    const prevCursor = startOffset > 0 ? Math.max(0, startOffset - pageSize) : null;

    return Response.json({
      data,
      meta: {
        totalRowCount: totalData.length,
        filterRowCount: filteredData.length,
        facets: {
          ...withoutSliderFacets,
          ...Object.fromEntries(
            Object.entries(facets).filter(
              ([key]) => !sliderFilterValues.includes(key as any),
            ),
          ),
        },
        metadata: {} satisfies LogsMeta,
      },
      prevCursor,
      nextCursor,
    } satisfies InfiniteQueryResponse<ColumnSchema[], LogsMeta>, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error in pricing API:', error);
    return Response.json(
      {
        error: 'Failed to fetch pricing data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

