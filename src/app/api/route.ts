import { NextRequest } from "next/server";
import type { InfiniteQueryResponse, LogsMeta } from "@/components/infinite-table/query-options";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import { searchParamsCache } from "@/components/infinite-table/search-params";
import { pricingCache } from "@/lib/redis";
import {
  filterData,
  getFacetsFromData,
  percentileData,
  sliderFilterValues,
  sortData,
  splitData,
} from "@/components/infinite-table/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // TODO: we could use a POST request to avoid this
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const search = searchParamsCache.parse(Object.fromEntries(_search));

    // Fetch pricing data directly from Redis cache
    const pricingSnapshots = await pricingCache.getAllPricingSnapshots();

    // Flatten all pricing data from all providers
    let totalData: ColumnSchema[] = pricingSnapshots.flatMap((snapshot: any) =>
      snapshot.rows.map((row: any) => ({
        uuid: crypto.randomUUID(),
        ...row,
        provider: snapshot.provider,
        observed_at: snapshot.observed_at || snapshot.last_updated,
      }))
    );

    // Filter to only show GPU instances that have gpu_count
    totalData = totalData.filter((row) => {
      // Only keep GPU rows with gpu_count
      return row.class === 'GPU' && row.gpu_count !== undefined && row.gpu_count !== null;
    });

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
    const withPercentileData = percentileData(sortedData);
    const data = splitData(withPercentileData, search);

    // For pricing data, we don't use cursors
    const nextCursor = null;
    const prevCursor = null;

    return Response.json({
      data,
      meta: {
        totalRowCount: totalData.length,
        filterRowCount: filteredData.length,
        // REMINDER: we separate the slider for keeping the min/max facets of the slider fields
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
    } satisfies InfiniteQueryResponse<ColumnSchema[], LogsMeta>);
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
