import { NextRequest } from "next/server";
import type { InfiniteQueryResponse, LogsMeta } from "@/components/infinite-table/query-options";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import { searchParamsCache } from "@/components/infinite-table/search-params";
import { pricingCache } from "@/lib/redis";
import { createHash } from "crypto";
import { filterData, getFacetsFromData, percentileData, sliderFilterValues, sortData } from "@/components/infinite-table/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // TODO: we could use a POST request to avoid this
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const search = searchParamsCache.parse(Object.fromEntries(_search));

    // Simpler path (≤1k rows): read snapshots, flatten, filter/sort/slice in memory

    // Legacy path (in-memory)
    const pricingSnapshots = await pricingCache.getAllPricingSnapshots();

    // Flatten all pricing data from all providers
    let totalData: ColumnSchema[] = pricingSnapshots.flatMap((snapshot: any) =>
      snapshot.rows.map((row: any) => {
        const observedAt = snapshot.observed_at || snapshot.last_updated;
        const stableKey = [
          snapshot.provider,
          row.sku ?? row.item ?? "",
          row.region ?? "",
          row.zone ?? "",
          row.gpu_model ?? "",
          row.gpu_count ?? "",
          row.vram_gb ?? "",
          row.vcpus ?? "",
          row.system_ram_gb ?? row.ram_gb ?? "",
          row.price_hour_usd ?? row.price_usd ?? "",
          row.price_unit ?? "",
          row.class ?? "",
          row.network ?? "",
          observedAt ?? "",
        ].join("|");

        const uuid = createHash("sha256").update(stableKey).digest("hex");

        return {
          uuid,
          ...row,
          provider: snapshot.provider,
          observed_at: observedAt,
        };
      })
    );

    // Only include GPU class rows (CPUs remain stored but are not displayed)
    totalData = totalData.filter((row) => row.class === 'GPU');

    // Apply date filtering if specified
    const _obs = (Array.isArray(search.observed_at) ? (search.observed_at as unknown as Date[]) : undefined);
    const _date =
      _obs?.length === 1
        ? [_obs[0], new Date(_obs[0].getTime() + 24 * 60 * 60 * 1000)]
        : _obs;

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
    // Deduplicate rows by uuid to avoid duplicate React keys
    const uniqueByUuidMap = new Map<string, ColumnSchema>();
    for (const row of withPercentileData as any) {
      // @ts-ignore
      if (!uniqueByUuidMap.has(row.uuid)) uniqueByUuidMap.set(row.uuid, row as any);
    }
    const uniqueData = Array.from(uniqueByUuidMap.values());

    // Cursor windowing by numeric offset (simple, server-driven)
    const pageSize = search.size ?? 50;
    const startOffset = typeof search.cursor === 'number' && search.cursor >= 0 ? search.cursor : 0;
    const data = uniqueData.slice(startOffset, startOffset + pageSize);
    const nextCursor = startOffset + data.length < uniqueData.length ? startOffset + data.length : null;
    const prevCursor = startOffset > 0 ? Math.max(0, startOffset - pageSize) : null;

    const t1 = Date.now();
    const rowsOut = data;
    const res = Response.json({
      data: rowsOut,
      meta: {
        totalRowCount: uniqueData.length,
        filterRowCount: uniqueData.length,
        // REMINDER: we separate the slider for keeping the min/max facets of the slider fields
        facets: {
          ...withoutSliderFacets,
          ...Object.fromEntries(Object.entries(facets).filter(([key]) => !sliderFilterValues.includes(key as any))),
        },
        metadata: {} satisfies LogsMeta,
      },
      prevCursor,
      nextCursor,
    } satisfies InfiniteQueryResponse<ColumnSchema[], LogsMeta>, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
    console.log(JSON.stringify({ event: 'api.page', rowsReturned: rowsOut.length, latencyMs: Date.now() - t1 }));
    return res;
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
