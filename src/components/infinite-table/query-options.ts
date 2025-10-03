import type { Percentile } from "@/lib/request/percentile";
import { infiniteQueryOptions } from "@tanstack/react-query";
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
      searchParamsSerializer({ ...search, uuid: null }),
    ],
    queryFn: async ({ pageParam }) => {
      const serialize = searchParamsSerializer({
        ...search,
        cursor: pageParam?.cursor ?? null,
        start: pageParam?.cursor ? undefined as unknown as number : 0,
        size: pageParam?.size,
        uuid: null,
      });
      const response = await fetch(`/api${serialize}` , { next: { revalidate: 900, tags: ['pricing'] } });
      const json = await response.json();
      return json as InfiniteQueryResponse<ColumnSchema[], LogsMeta>;
    },
    initialPageParam: { cursor: null as number | null, size: search.size ?? 50 },
    getNextPageParam: (lastPage) => lastPage.nextCursor
      ? { cursor: lastPage.nextCursor, size: search.size ?? 50 }
      : null,
    refetchOnWindowFocus: false,
  });
};
