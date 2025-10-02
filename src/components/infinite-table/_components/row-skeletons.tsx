"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/custom/table";
import { cn } from "@/lib/utils";
import type { Table as TTable } from "@tanstack/react-table";
import * as React from "react";

interface RowSkeletonsProps<TData> {
  table: TTable<TData>;
  rows?: number;
}

export function RowSkeletons<TData>({ table, rows = 10 }: RowSkeletonsProps<TData>) {
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <React.Fragment>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`} className={cn("[&>:not(:last-child)]:border-r", "hover:bg-transparent")}
        >
          {visibleColumns.map((column) => {
            const widthPx = `${column.getSize()}px`;
            const id = column.id;

            return (
              <TableCell
                key={`${id}-${rowIndex}`}
                className={cn("truncate border-b border-border p-[12px]", column.columnDef.meta?.cellClassName)}
                style={{
                  width: widthPx,
                  maxWidth: widthPx,
                  minWidth: id === "gpu_model" ? "0px" : widthPx,
                }}
              >
                {id === "blank" ? (
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                ) : id === "provider" ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-[6rem]" />
                  </div>
                ) : id === "gpu_model" ? (
                  <Skeleton className="h-4 w-full" />
                ) : id === "price_hour_usd" ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-10" />
                  </div>
                ) : id === "gpu_count" ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-10" />
                  </div>
                ) : id === "vram_gb" || id === "system_ram_gb" ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-10" />
                  </div>
                ) : id === "vcpus" ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-10" />
                  </div>
                ) : id === "type" ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-10" />
                  </div>
                ) : (
                  <Skeleton className="h-4 w-24" />
                )}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </React.Fragment>
  );
}


