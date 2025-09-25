"use client";

import { TextWithTooltip } from "@/components/custom/text-with-tooltip";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableColumnLatency } from "@/components/data-table/data-table-column/data-table-column-latency";
import { DataTableColumnCompanyLogo } from "@/components/data-table/data-table-column/data-table-column-company-logo";
import { DataTableColumnRegion } from "@/components/data-table/data-table-column/data-table-column-region";
import { DataTableColumnStatusCode } from "@/components/data-table/data-table-column/data-table-column-status-code";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  getTimingColor,
  getTimingLabel,
  getTimingPercentage,
  timingPhases,
} from "@/lib/request/timing";
import { cn } from "@/lib/utils";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import type { ColumnDef } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { HoverCardTimestamp } from "./_components/hover-card-timestamp";
import type { ColumnSchema } from "./schema";


export const columns: ColumnDef<ColumnSchema>[] = [
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => {
      const companyName = row.getValue<ColumnSchema["companyName"]>("companyName");
      return (
        <div className="flex items-center gap-2">
          <DataTableColumnCompanyLogo companyName={companyName} size={20} />
          <TextWithTooltip text={companyName} />
        </div>
      );
    },
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "font-medium w-[--col-company-size] max-w-[--col-company-size]",
      headerClassName: "min-w-[--header-company-size] w-[--header-company-size]",
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Added" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue<ColumnSchema["date"]>("date"));
      return <HoverCardTimestamp date={date} />;
    },
    enableResizing: false,
    size: 200,
    minSize: 200,
    meta: {
      headerClassName:
        "w-[--header-date-size] max-w-[--header-date-size] min-w-[--header-date-size]",
      cellClassName:
        "font-mono w-[--col-date-size] max-w-[--col-date-size] min-w-[--col-date-size]",
    },
  },
  {
    id: "uuid",
    accessorKey: "uuid",
    header: "ID",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["uuid"]>("uuid");
      return <TextWithTooltip text={value} />;
    },
    size: 130,
    minSize: 130,
    meta: {
      label: "ID",
      cellClassName:
        "font-mono w-[--col-uuid-size] max-w-[--col-uuid-size] min-w-[--col-uuid-size]",
      headerClassName:
        "min-w-[--header-uuid-size] w-[--header-uuid-size] max-w-[--header-uuid-size]",
    },
  },
  {
    accessorKey: "toolName",
    header: "AI Tool",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["toolName"]>("toolName");
      return <TextWithTooltip text={value} />;
    },
    size: 140,
    minSize: 140,
    meta: {
      cellClassName: "font-semibold w-[--col-tool-size] max-w-[--col-tool-size]",
      headerClassName: "min-w-[--header-tool-size] w-[--header-tool-size]",
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["category"]>("category");
      return <span className="text-sm">{value}</span>;
    },
    filterFn: "arrIncludesSome",
    enableResizing: false,
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "w-[--col-category-size] max-w-[--col-category-size]",
      headerClassName: "w-[--header-category-size] max-w-[--header-category-size]",
    },
  },
  {
    accessorKey: "pricingModel",
    header: "Pricing",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["pricingModel"]>("pricingModel");
      return <span className="text-sm font-medium">{value}</span>;
    },
    filterFn: "arrIncludesSome",
    enableResizing: false,
    size: 100,
    minSize: 100,
    meta: {
      cellClassName: "w-[--col-pricing-size] max-w-[--col-pricing-size]",
      headerClassName: "w-[--header-pricing-size] max-w-[--header-pricing-size]",
    },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rating" />
    ),
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["rating"]>("rating");
      return (
        <div className="flex items-center gap-1">
          <span className="font-mono font-medium">{value.toFixed(1)}</span>
          <span className="text-yellow-500">★</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 90,
    minSize: 90,
    meta: {
      headerClassName:
        "w-[--header-rating-size] max-w-[--header-rating-size] min-w-[--header-rating-size]",
      cellClassName:
        "font-mono w-[--col-rating-size] max-w-[--col-rating-size] min-w-[--col-rating-size]",
    },
  },
  {
    accessorKey: "monthlyUsers",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monthly Users" />
    ),
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["monthlyUsers"]>("monthlyUsers");
      const formatted = new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
      return <span className="font-mono">{formatted}</span>;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 120,
    minSize: 120,
    meta: {
      headerClassName:
        "w-[--header-users-size] max-w-[--header-users-size] min-w-[--header-users-size]",
      cellClassName:
        "font-mono w-[--col-users-size] max-w-[--col-users-size] min-w-[--col-users-size]",
    },
  },
  {
    accessorKey: "foundedYear",
    header: "Founded",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["foundedYear"]>("foundedYear");
      return <span className="font-mono">{value}</span>;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 90,
    minSize: 90,
    meta: {
      cellClassName: "font-mono w-[--col-founded-size] max-w-[--col-founded-size]",
      headerClassName: "w-[--header-founded-size] max-w-[--header-founded-size]",
    },
  },
  {
    accessorKey: "headquarters",
    header: "HQ Location",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["headquarters"]>("headquarters");
      return <span className="text-sm">{value}</span>;
    },
    size: 120,
    minSize: 120,
    meta: {
      cellClassName: "w-[--col-hq-size] max-w-[--col-hq-size]",
      headerClassName: "min-w-[--header-hq-size] w-[--header-hq-size]",
    },
  },
  {
    accessorKey: "regions",
    header: "Available In",
    cell: ({ row }) => {
      const value = row.getValue<ColumnSchema["regions"]>("regions");
      if (Array.isArray(value)) {
        if (value.length > 1) {
          return (
            <div className="text-muted-foreground text-xs">{value.join(", ")}</div>
          );
        } else {
          return (
            <div className="whitespace-nowrap">
              <DataTableColumnRegion value={value[0]} />
            </div>
          );
        }
      }
      if (typeof value === "string") {
        return <DataTableColumnRegion value={value} />;
      }
      return <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "arrIncludesSome",
    enableResizing: false,
    size: 140,
    minSize: 140,
    meta: {
      headerClassName:
        "w-[--header-regions-size] max-w-[--header-regions-size] min-w-[--header-regions-size]",
      cellClassName:
        "font-mono w-[--col-regions-size] max-w-[--col-regions-size] min-w-[--col-regions-size]",
    },
  },
];
