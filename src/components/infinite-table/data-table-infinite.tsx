"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/custom/table";
import { DataTableFilterCommand } from "@/components/data-table/data-table-filter-command";
import { DataTableFilterControls } from "@/components/data-table/data-table-filter-controls";
import { DataTableProvider } from "@/components/data-table/data-table-provider";
import { DataTableResetButton } from "@/components/data-table/data-table-reset-button";
import { MemoizedDataTableSheetContent } from "@/components/data-table/data-table-sheet/data-table-sheet-content";
import { DataTableSheetDetails } from "@/components/data-table/data-table-sheet/data-table-sheet-details";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"; // TODO: check where to put this
import type {
  DataTableFilterField,
  SheetField,
} from "@/components/data-table/types";
import { Button } from "@/components/ui/button";
import { useHotKey } from "@/hooks/use-hot-key";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useControls } from "@/providers/controls";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";
import { arrSome } from "@/lib/table/filterfns";
import { cn } from "@/lib/utils";
import {
  FetchPreviousPageOptions,
  RefetchOptions,
  type FetchNextPageOptions,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingInfoState,
  ColumnSizingState,
  Row,
  RowSelectionState,
  SortingState,
  TableOptions,
  Table as TTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedMinMaxValues as getTTableFacetedMinMaxValues,
  getFacetedUniqueValues as getTTableFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import { LoaderCircle } from "lucide-react";
import { useQueryState, useQueryStates, type ParserBuilder } from "nuqs";
import * as React from "react";
import { LiveButton } from "./_components/live-button";
import { RefreshButton } from "./_components/refresh-button";
import { SocialsFooter } from "./_components/socials-footer";
import { searchParamsParser } from "./search-params";

// Floating Controls Button Component
function FloatingControlsButton() {
  const { open, setOpen } = useControls();

  useHotKey(() => setOpen((prev) => prev !== null ? !prev : false), "b");

  return (
    <Button
      size="sm"
      variant="default"
      onClick={() => setOpen((prev) => prev !== null ? !prev : false)}
      className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
      aria-label={open ? "Hide controls" : "Show controls"}
    >
      {open ? (
        <PanelLeftClose className="h-5 w-5" />
      ) : (
        <PanelLeftOpen className="h-5 w-5" />
      )}
    </Button>
  );
}

// TODO: add a possible chartGroupBy
export interface DataTableInfiniteProps<TData, TValue, TMeta> {
  columns: ColumnDef<TData, TValue>[];
  getRowClassName?: (row: Row<TData>) => string;
  // REMINDER: make sure to pass the correct id to access the rows
  getRowId?: TableOptions<TData>["getRowId"];
  data: TData[];
  defaultColumnFilters?: ColumnFiltersState;
  defaultColumnSorting?: SortingState;
  defaultRowSelection?: RowSelectionState;
  defaultColumnVisibility?: VisibilityState;
  filterFields?: DataTableFilterField<TData>[];
  sheetFields?: SheetField<TData, TMeta>[];
  // REMINDER: close to the same signature as the `getFacetedUniqueValues` of the `useReactTable`
  getFacetedUniqueValues?: (
    table: TTable<TData>,
    columnId: string,
  ) => Map<string, number>;
  getFacetedMinMaxValues?: (
    table: TTable<TData>,
    columnId: string,
  ) => undefined | [number, number];
  totalRows?: number;
  filterRows?: number;
  totalRowsFetched?: number;
  meta: TMeta;
  isFetching?: boolean;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage: (
    options?: FetchNextPageOptions | undefined,
  ) => Promise<unknown>;
  fetchPreviousPage?: (
    options?: FetchPreviousPageOptions | undefined,
  ) => Promise<unknown>;
  refetch: (options?: RefetchOptions | undefined) => void;
  renderLiveRow?: (props?: { row: Row<TData> }) => React.ReactNode;
  renderSheetTitle: (props: { row?: Row<TData> }) => React.ReactNode;
  searchParamsParser: Record<string, ParserBuilder<any>>;
}

export function DataTableInfinite<TData, TValue, TMeta>({
  columns,
  getRowClassName,
  getRowId,
  data,
  defaultColumnFilters = [],
  defaultColumnSorting = [],
  defaultRowSelection = {},
  defaultColumnVisibility = {},
  filterFields = [],
  sheetFields = [],
  isFetching,
  isLoading,
  fetchNextPage,
  hasNextPage,
  fetchPreviousPage,
  refetch,
  totalRows = 0,
  filterRows = 0,
  totalRowsFetched = 0,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  meta,
  renderLiveRow,
  renderSheetTitle,
  searchParamsParser,
}: DataTableInfiniteProps<TData, TValue, TMeta>) {
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(defaultColumnFilters);
  const [sorting, setSorting] =
    React.useState<SortingState>(defaultColumnSorting);
  const [rowSelection, setRowSelection] =
    React.useState<RowSelectionState>(defaultRowSelection);
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>(
    "data-table-column-order",
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(
      "data-table-visibility",
      defaultColumnVisibility,
    );
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfoState] = React.useState<ColumnSizingInfoState | null>(null);

  const setColumnSizingInfo = React.useCallback((updaterOrValue: ColumnSizingInfoState | ((old: ColumnSizingInfoState) => ColumnSizingInfoState)) => {
    setColumnSizingInfoState((prev) => {
      const newValue = typeof updaterOrValue === 'function'
        ? updaterOrValue(prev || {} as ColumnSizingInfoState)
        : updaterOrValue;
      return newValue;
    });
  }, []);
  const topBarRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [topBarHeight, setTopBarHeight] = React.useState(0);
  // FIXME: searchParamsParser needs to be passed as property
  const [_, setSearch] = useQueryStates(searchParamsParser);

  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const onPageBottom =
        Math.ceil(e.currentTarget.scrollTop + e.currentTarget.clientHeight) >=
        e.currentTarget.scrollHeight;

      if (onPageBottom && !isFetching && hasNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, isFetching, hasNextPage],
  );

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      const rect = topBarRef.current?.getBoundingClientRect();
      if (rect) {
        setTopBarHeight(rect.height);
      }
    });

    const topBar = topBarRef.current;
    if (!topBar) return;

    observer.observe(topBar);
    return () => observer.unobserve(topBar);
  }, [topBarRef]);

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder,
      columnSizing,
      ...(columnSizingInfo && { columnSizingInfo }),
    },
    enableMultiRowSelection: false,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getRowId,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    // Disable client-side sorting - all sorting happens on server side
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getTTableFacetedUniqueValues(),
    getFacetedMinMaxValues: getTTableFacetedMinMaxValues(),
    filterFns: { arrSome },
    debugAll: process.env.NEXT_PUBLIC_TABLE_DEBUG === "true",
    meta: { getRowClassName },
  });

  React.useEffect(() => {
    const columnFiltersWithNullable = filterFields.map((field) => {
      const filterValue = columnFilters.find(
        (filter) => filter.id === field.value,
      );
      if (!filterValue) return { id: field.value, value: null };
      return { id: field.value, value: filterValue.value };
    });

    const search = columnFiltersWithNullable.reduce(
      (prev, curr) => {
        prev[curr.id as string] = curr.value;
        return prev;
      },
      {} as Record<string, unknown>,
    );

    setSearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

  React.useEffect(() => {
    setSearch({ sort: sorting?.[0] || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting]);

  const selectedRow = React.useMemo(() => {
    if ((isLoading || isFetching) && !data.length) return;
    const selectedRowKey = Object.keys(rowSelection)?.[0];
    return table
      .getCoreRowModel()
      .flatRows.find((row) => row.id === selectedRowKey);
  }, [rowSelection, table, isLoading, isFetching, data]);

  // TODO: can only share uuid within the first batch
  React.useEffect(() => {
    if (isLoading || isFetching) return;
    if (Object.keys(rowSelection)?.length && !selectedRow) {
      setSearch({ uuid: null });
      setRowSelection({});
    } else {
      setSearch({ uuid: Object.keys(rowSelection)?.[0] || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection, selectedRow, isLoading, isFetching]);


  useHotKey(() => {
    setColumnOrder([]);
    setColumnVisibility(defaultColumnVisibility);
  }, "u");

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      rowSelection={rowSelection}
      columnOrder={columnOrder}
      columnVisibility={columnVisibility}
      enableColumnOrdering={true}
      isLoading={isFetching || isLoading}
      getFacetedUniqueValues={getFacetedUniqueValues}
      getFacetedMinMaxValues={getFacetedMinMaxValues}
    >
      <div
        className="flex h-full w-full flex-col sm:flex-row"
        style={
          {
            "--top-bar-height": `${topBarHeight}px`,
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            "h-full w-full flex-col sm:sticky sm:top-0 sm:max-h-screen sm:min-h-screen sm:min-w-52 sm:max-w-52 sm:self-start md:min-w-72 md:max-w-72",
            // CSS responsive defaults: hidden on mobile, visible on desktop
            "hidden group-data-[expanded=true]/controls:flex sm:flex",
            // Mobile: fixed overlay that takes full screen
            "fixed inset-0 z-40 bg-background overflow-y-auto scrollbar-hide sm:static sm:z-auto sm:overflow-y-visible",
          )}
        >
          <div className="border-b border-border bg-background p-2 md:sticky md:top-0">
            <DataTableToolbar
              renderActions={() => [
                <RefreshButton key="refresh" onClick={refetch} />,
                fetchPreviousPage ? (
                  <LiveButton
                    key="live"
                    fetchPreviousPage={fetchPreviousPage}
                  />
                ) : null,
              ]}
            />
          </div>
          <div className="p-2">
            <DataTableFilterCommand searchParamsParser={searchParamsParser} />
          </div>
          <div className="flex-1 p-2 sm:overflow-y-scroll scrollbar-hide">
            <DataTableFilterControls />
          </div>
          <div className="border-t border-border bg-background p-4 md:sticky md:bottom-0">
            <SocialsFooter />
          </div>
        </div>
        <div
          className={cn(
            "flex max-w-full flex-1 flex-col border-border sm:border-l",
            // Chrome issue
            "group-data-[expanded=true]/controls:sm:max-w-[calc(100vw_-_208px)] group-data-[expanded=true]/controls:md:max-w-[calc(100vw_-_288px)]",
          )}
        >
          <div
            ref={topBarRef}
            className={cn(
              "flex flex-col",
              "sticky top-0 z-10",
            )}
          >
          </div>
          <div className="z-0">
            <Table
              ref={tableRef}
              onScroll={onScroll}
              // REMINDER: https://stackoverflow.com/questions/50361698/border-style-do-not-work-with-sticky-position-element
              className="border-separate border-spacing-0"
              containerClassName="h-full max-h-[calc(100vh_-_var(--top-bar-height))] scrollbar-hide"
            >
              <TableHeader className={cn("sticky top-0 z-20 bg-background")}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className={cn(
                      "bg-muted/50 hover:bg-muted/50",
                      "[&>*]:border-t [&>:not(:last-child)]:border-r",
                    )}
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "relative select-none truncate border-b border-border [&>.cursor-col-resize]:last:opacity-0",
                            header.column.columnDef.meta?.headerClassName,
                          )}
                          style={{
                            width: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                          }}
                          aria-sort={
                            header.column.getIsSorted() === "asc"
                              ? "ascending"
                              : header.column.getIsSorted() === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {header.column.getCanResize() && (
                            <div
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={cn(
                                "user-select-none absolute -right-2 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none justify-center",
                                "before:absolute before:inset-y-0 before:w-px before:translate-x-px before:bg-border",
                              )}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody
                id="content"
                tabIndex={-1}
                className="outline-1 -outline-offset-1 outline-primary transition-colors focus-visible:outline"
                // REMINDER: avoids scroll (skipping the table header) when using skip to content
                style={{
                  scrollMarginTop: "calc(var(--top-bar-height) + 40px)",
                }}
              >
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    // REMINDER: if we want to add arrow navigation https://github.com/TanStack/table/discussions/2752#discussioncomment-192558
                    <React.Fragment key={row.id}>
                      {renderLiveRow?.({ row })}
                      <MemoizedRow
                        row={row}
                        table={table}
                        selected={row.getIsSelected()}
                      />
                    </React.Fragment>
                  ))
                ) : (
                  <React.Fragment>
                    {renderLiveRow?.()}
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <DataTableSheetDetails
        title={renderSheetTitle({ row: selectedRow })}
        titleClassName="font-mono"
      >
        <MemoizedDataTableSheetContent
          table={table}
          data={selectedRow?.original}
          filterFields={filterFields}
          fields={sheetFields}
          // TODO: check if we should memoize this
          // REMINDER: this is used to pass additional data like the `InfiniteQueryMeta`
          metadata={{
            totalRows,
            filterRows,
            totalRowsFetched,
            // REMINDER: includes `currentPercentiles`
            ...meta,
          }}
        />
      </DataTableSheetDetails>
      <FloatingControlsButton />
    </DataTableProvider>
  );
}

/**
 * REMINDER: this is the heaviest component in the table if lots of rows
 * Some other components are rendered more often necessary, but are fixed size (not like rows that can grow in height)
 * e.g. DataTableFilterControls, DataTableFilterCommand, DataTableToolbar, DataTableHeader
 */

function Row<TData>({
  row,
  table,
  selected,
}: {
  row: Row<TData>;
  table: TTable<TData>;
  // REMINDER: row.getIsSelected(); - just for memoization
  selected?: boolean;
}) {
  // REMINDER: rerender the row when live mode is toggled - used to opacity the row
  // via the `getRowClassName` prop - but for some reasons it wil render the row on data fetch
  useQueryState("live", searchParamsParser.live);
  return (
    <TableRow
      id={row.id}
      tabIndex={0}
      data-state={selected && "selected"}
      onClick={() => row.toggleSelected()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          row.toggleSelected();
        }
      }}
      className={cn(
        "[&>:not(:last-child)]:border-r",
        "outline-1 -outline-offset-1 outline-primary transition-colors focus-visible:bg-muted/50 focus-visible:outline data-[state=selected]:outline",
        table.options.meta?.getRowClassName?.(row),
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(
            "truncate border-b border-border p-3",
            cell.column.columnDef.meta?.cellClassName,
          )}
          style={{
            width: `${cell.column.getSize()}px`,
            maxWidth: `${cell.column.getSize()}px`,
            minWidth: `${cell.column.getSize()}px`,
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

const MemoizedRow = React.memo(
  Row,
  (prev, next) =>
    prev.row.id === next.row.id && prev.selected === next.selected,
) as typeof Row;
