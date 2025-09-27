import { NextRequest } from "next/server";
import SuperJSON from "superjson";
import type { InfiniteQueryResponse, LogsMeta } from "../query-options";
import type { ColumnSchema } from "../schema";
import { searchParamsCache } from "../search-params";
import {
  filterData,
  getFacetsFromData,
  sliderFilterValues,
  sortData,
  splitData,
} from "./helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // TODO: we could use a POST request to avoid this
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const search = searchParamsCache.parse(Object.fromEntries(_search));

    // Fetch pricing data from our pricing API
    const pricingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/pricing`);
    if (!pricingResponse.ok) {
      throw new Error(`Failed to fetch pricing data: ${pricingResponse.status}`);
    }

    const pricingSnapshots = await pricingResponse.json();

    // Flatten all pricing data from all providers
    const totalData: ColumnSchema[] = pricingSnapshots.flatMap((snapshot: any) =>
      snapshot.rows.map((row: any) => ({
        uuid: crypto.randomUUID(),
        ...row,
        provider: snapshot.provider,
        // Keep the original observed_at field from the row, which is already a string
      }))
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
    const data = splitData(sortedData, search);

    const nextCursor =
      data.length > 0 ? new Date(data[data.length - 1].observed_at).getTime() : null;
    const prevCursor =
      data.length > 0 ? new Date(data[0].observed_at).getTime() : new Date().getTime();

    return Response.json(
      SuperJSON.stringify({
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
      } satisfies InfiniteQueryResponse<ColumnSchema[], LogsMeta>),
    );
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
