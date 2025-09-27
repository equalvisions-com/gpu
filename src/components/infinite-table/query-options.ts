import type { Percentile } from "@/lib/request/percentile";
import { infiniteQueryOptions, keepPreviousData } from "@tanstack/react-query";
import type {
  ColumnSchema,
  FacetMetadataSchema,
} from "./schema";
import { searchParamsSerializer, type SearchParamsType } from "./search-params";

export type LogsMeta = {
  // For GPU pricing, we might add different metadata later
};

export type InfiniteQueryMeta<TMeta = Record<string, unknown>> = {
  totalRowCount: number;
  filterRowCount: number;
  facets: Record<string, FacetMetadataSchema>;
  metadata?: TMeta;
};

export type InfiniteQueryResponse<TData, TMeta = unknown> = {
  data: TData;
  meta: InfiniteQueryMeta<TMeta>;
  prevCursor: number | null;
  nextCursor: number | null;
};

export const dataOptions = (search: SearchParamsType) => {
  return infiniteQueryOptions({
    queryKey: [
      "data-table",
      searchParamsSerializer({ ...search, uuid: null, live: null }),
    ], // remove uuid/live as it would otherwise retrigger a fetch
    queryFn: async ({ pageParam }) => {
      const serialize = searchParamsSerializer({
        ...search,
        start: pageParam.start,
        size: pageParam.size,
        uuid: null,
        live: null,
      });
      const response = await fetch(`/api${serialize}`);
      const json = await response.json();
      return json as InfiniteQueryResponse<ColumnSchema[], LogsMeta>;
    },
    initialPageParam: { start: 0, size: search.size ?? 50 },
    getNextPageParam: (lastPage, pages) => {
      const PAGE_SIZE = search.size ?? 50;
      const totalFetched = pages.reduce((sum, p) => sum + p.data.length, 0);
      // Stop when we've fetched all rows reported by the server
      if (totalFetched >= lastPage.meta.filterRowCount) return null;
      // Also stop if the last page was not full
      if (lastPage.data.length < PAGE_SIZE) return null;
      return { start: totalFetched, size: PAGE_SIZE };
    },
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};
