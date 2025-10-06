"use client";

import { useHotKey } from "@/hooks/use-hot-key";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Table as TTable } from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import * as React from "react";
import { columns } from "./columns";
import { filterFields as defaultFilterFields, sheetFields } from "./constants";
import { DataTableInfinite } from "./data-table-infinite";
import { dataOptions } from "./query-options";
import type { FacetMetadataSchema } from "./schema";
import { searchParamsParser } from "./search-params";
import type { RowWithId } from "@/types/api";
import type { ColumnSchema } from "./schema";
import { stableGpuKey } from "./stable-key";
import { toast } from "sonner";
import type { FavoritesResponse, FavoriteKey } from "@/types/favorites";

interface ClientProps {
  initialFavoritesData?: ColumnSchema[];
  initialFavoriteKeys?: string[];
}

export function Client({ initialFavoritesData, initialFavoriteKeys }: ClientProps = {}) {
  const contentRef = React.useRef<HTMLTableSectionElement>(null);
  const [search] = useQueryStates(searchParamsParser);

  // Use favorites data if provided, otherwise use infinite query
  const isFavoritesMode = !!initialFavoritesData;

  // Fetch user's favorites for real-time updates in favorites mode
  const { data: favorites = [], isError: isFavoritesError, error: favoritesError } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (response.status === 429) {
        throw new Error("Rate limit exceeded, try again shortly");
      }
      if (!response.ok) throw new Error("Failed to fetch favorites");
      const data: FavoritesResponse = await response.json();
      // API returns { favorites: string[] }
      return (data.favorites || []) as FavoriteKey[];
    },
    staleTime: Infinity,
    enabled: isFavoritesMode, // Only fetch in favorites mode
    retry: false,
    initialData: isFavoritesMode ? (initialFavoriteKeys || []) : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (isFavoritesError && favoritesError instanceof Error) {
      if (/(rate limit|429)/i.test(favoritesError.message)) {
        toast('Rate Limit Exceeded', { description: 'Please slow down. Try again later' });
      } else {
        toast('Favorites error', { description: favoritesError.message });
      }
    }
  }, [isFavoritesError, favoritesError]);

  const favoriteKeys = React.useMemo(() => new Set(favorites as FavoriteKey[]), [favorites]);

  // For favorites mode, track favorites changes to update data optimistically
  const [favoritesData, setFavoritesData] = React.useState(initialFavoritesData);

  // Update favorites data when initialFavoritesData changes
  React.useEffect(() => {
    setFavoritesData(initialFavoritesData);
  }, [initialFavoritesData]);

  // Update favorites data when favorites change (optimistic updates)
  React.useEffect(() => {
    if (isFavoritesMode && initialFavoritesData && !isFavoritesError) {
      const updatedFavoritesData = initialFavoritesData.filter(row =>
        favoriteKeys.has(stableGpuKey(row))
      );
      setFavoritesData(updatedFavoritesData);
    }
  }, [favorites, favoriteKeys, isFavoritesMode, initialFavoritesData, isFavoritesError]);

  const {
    data,
    isFetching,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    ...dataOptions(search),
    enabled: !isFavoritesMode, // Disable infinite query when showing favorites
  });

  useHotKey(() => {
    contentRef.current?.focus();
  }, ".");

  const flatData: RowWithId[] = React.useMemo(() => {
    if (isFavoritesMode) {
      // Use favorites data with optimistic updates
      return (favoritesData || initialFavoritesData || []) as RowWithId[];
    }
    // Server guarantees stable, non-overlapping windows via deterministic sort + cursor
    return (data?.pages?.flatMap((page) => page.data ?? []) as RowWithId[]) ?? [] as RowWithId[];
  }, [data?.pages, isFavoritesMode, favoritesData, initialFavoritesData]);

  // REMINDER: meta data is always the same for all pages as filters do not change(!)
  const lastPage = data?.pages?.[data?.pages.length - 1];
  const totalDBRowCount = isFavoritesMode ? flatData.length : lastPage?.meta?.totalRowCount;
  const filterDBRowCount = isFavoritesMode ? flatData.length : lastPage?.meta?.filterRowCount;
  const metadata = {
    ...(lastPage?.meta?.metadata ?? {}),
    initialFavoriteKeys,
  } as Record<string, unknown>;
  const facets = isFavoritesMode ? {} : lastPage?.meta?.facets;
  const totalFetched = flatData?.length;

  const { sort, start, size, uuid, cursor, direction, observed_at, ...filter } =
    search;

  // REMINDER: this is currently needed for the cmdk search
  // TODO: auto search via API when the user changes the filter instead of hardcoded
  const filterFields = React.useMemo(() => {
    return defaultFilterFields.map((field) => {
      const facetsField = facets?.[field.value];
      if (!facetsField) return field;
      if (field.options && field.options.length > 0) return field;

      // REMINDER: if no options are set, we need to set them via the API
    const options = facetsField.rows.map(({ value }) => {
      return {
        label: `${value}`,
        value,
      };
    });

    if (field.type === "slider") {
      return {
        ...field,
        min: facetsField.min ?? field.min,
        max: facetsField.max ?? field.max,
        options, // Use API-generated options for sliders
      };
    }

    // Only set options for checkbox fields, not input fields
    if (field.type === "checkbox") {
      return { ...field, options };
    }

    return field;
    });
  }, [facets]);

  return (
      <DataTableInfinite
      key={`table-${isFavoritesMode ? `favorites-${favorites?.length || 0}` : 'all'}`}
      columns={columns}
      data={flatData}
        skeletonRowCount={search.size ?? 50}
      totalRows={totalDBRowCount}
      filterRows={filterDBRowCount}
      totalRowsFetched={totalFetched}
      defaultColumnFilters={Object.entries(filter)
        .map(([key, value]) => ({
          id: key,
          value,
        }))
        .filter(({ value }) => value ?? undefined)}
      defaultColumnSorting={sort ? [sort] : undefined}
      defaultRowSelection={search.uuid ? { [search.uuid]: true } : undefined}
      meta={metadata}
      filterFields={filterFields}
      sheetFields={sheetFields}
      isFetching={isFavoritesMode ? false : isFetching}
      isLoading={isFavoritesMode ? false : isLoading}
      isFetchingNextPage={isFavoritesMode ? false : isFetchingNextPage}
      fetchNextPage={isFavoritesMode ? () => Promise.resolve() : fetchNextPage}
      hasNextPage={isFavoritesMode ? false : hasNextPage}
      getRowClassName={() => "opacity-100"}
      getRowId={(row) => row.uuid}
      getFacetedUniqueValues={getFacetedUniqueValues(facets)}
      getFacetedMinMaxValues={getFacetedMinMaxValues(facets)}
      renderSheetTitle={(props) => props.row?.original.uuid}
      searchParamsParser={searchParamsParser}
      focusTargetRef={contentRef}
    />
  );
}


export function getFacetedUniqueValues<TData>(
  facets?: Record<string, FacetMetadataSchema>,
) {
  return (_: TTable<TData>, columnId: string): Map<string, number> => {
    return new Map(
      facets?.[columnId]?.rows?.map(({ value, total }) => [value, total]) || [],
    );
  };
}

export function getFacetedMinMaxValues<TData>(
  facets?: Record<string, FacetMetadataSchema>,
) {
  return (_: TTable<TData>, columnId: string): [number, number] | undefined => {
    const min = facets?.[columnId]?.min;
    const max = facets?.[columnId]?.max;
    if (typeof min === "number" && typeof max === "number") return [min, max];
    if (typeof min === "number") return [min, min];
    if (typeof max === "number") return [max, max];
    return undefined;
  };
}
