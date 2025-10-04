import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // https://github.com/TanStack/table/issues/44#issuecomment-1377024296
  interface TableMeta<TData extends unknown> {
    getRowClassName?: (row: Row<TData>) => string;
    // Separate checkbox-only state controls
    isRowChecked?: (rowId: string) => boolean;
    toggleRowChecked?: (rowId: string, next?: boolean) => void;
    metadata?: {
      totalRows?: number;
      filterRows?: number;
      totalRowsFetched?: number;
    };
  }

  interface ColumnMeta {
    headerClassName?: string;
    cellClassName?: string;
    label?: string;
  }

  interface FilterFns {
    arrSome?: FilterFn<any>;
  }

  // https://github.com/TanStack/table/discussions/4554
  interface ColumnFiltersOptions<TData extends RowData> {
    filterFns?: Record<string, FilterFn<TData>>;
  }
}
