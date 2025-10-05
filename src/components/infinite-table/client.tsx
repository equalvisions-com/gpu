"use client";

import { useHotKey } from "@/hooks/use-hot-key";
import { useInfiniteQuery } from "@tanstack/react-query";
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

export function Client() {
  const contentRef = React.useRef<HTMLTableSectionElement>(null);
  const [search] = useQueryStates(searchParamsParser);
  const {
    data,
    isFetching,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(dataOptions(search));
  useHotKey(() => {
    contentRef.current?.focus();
  }, ".");

  const flatData: RowWithId[] = React.useMemo(() => {
    // Server guarantees stable, non-overlapping windows via deterministic sort + cursor
    return (data?.pages?.flatMap((page) => page.data ?? []) as RowWithId[]) ?? [] as RowWithId[];
  }, [data?.pages]);

  // REMINDER: meta data is always the same for all pages as filters do not change(!)
  const lastPage = data?.pages?.[data?.pages.length - 1];
  const totalDBRowCount = lastPage?.meta?.totalRowCount;
  const filterDBRowCount = lastPage?.meta?.filterRowCount;
  const metadata = lastPage?.meta?.metadata;
  const facets = lastPage?.meta?.facets;
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
      isFetching={isFetching}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
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
