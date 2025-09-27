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
    accessorKey: "provider",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Provider" />
    ),
    cell: ({ row }) => {
      const provider = row.getValue<ColumnSchema["provider"]>("provider");
      return (
        <div className="flex items-center gap-2">
          {provider === "coreweave" && (
            <img
              src="/logos/coreweave.png"
              alt="CoreWeave"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "nebius" && (
            <img
              src="/logos/nebius.png"
              alt="Nebius"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "hyperstack" && (
            <img
              src="/logos/hyperstack.png"
              alt="Hyperstack"
              className="h-5 w-5 rounded"
            />
          )}
          <span className="font-medium capitalize">{provider}</span>
        </div>
      );
    },
    size: 100,
    minSize: 60,
    meta: {
      cellClassName: "font-medium",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "gpu_model",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GPU Model" />
    ),
    cell: ({ row }) => {
      // Handle both CoreWeave (gpu_model) and Nebius (item) data
      const original = row.original;
      const displayName = original.gpu_model || original.item;

      if (!displayName) return <Minus className="h-4 w-4 text-muted-foreground/50" />;

      return (
        <span className="font-medium">{displayName}</span>
      );
    },
    size: 230,
    minSize: 80,
    meta: {
      cellClassName: "",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "price_hour_usd",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Hourly Rate" />
    ),
    cell: ({ row }) => {
      const original = row.original;
      const price = original.price_hour_usd || original.price_usd;
      const unit = original.price_unit || "hour";

      if (!price) return <Minus className="h-4 w-4 text-muted-foreground/50" />;

      const unitDisplay = "/hr";

      return (
        <div className="flex items-center gap-1">
          <span className="font-mono font-medium">${price.toFixed(2)}</span>
          <span className="text-muted-foreground text-xs">{unitDisplay}</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 147,
    minSize: 80,
    meta: {
      headerClassName: "text-center",
      cellClassName: "font-mono",
    },
  },
  {
    accessorKey: "gpu_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GPU Count" />
    ),
    cell: ({ row }) => {
      const gpuCount = row.getValue<ColumnSchema["gpu_count"]>("gpu_count");
      return gpuCount ? <span className="font-mono font-medium">{gpuCount}x</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 117,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "vram_gb",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="VRAM" />
    ),
    cell: ({ row }) => {
      const vramGb = row.getValue<ColumnSchema["vram_gb"]>("vram_gb");
      return vramGb ? (
        <div className="flex items-center gap-1">
          <span className="font-mono">{vramGb}</span>
          <span className="text-muted-foreground text-xs">GB</span>
        </div>
      ) : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 117,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "vcpus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="vCPUs" />
    ),
    cell: ({ row }) => {
      const vcpus = row.getValue<ColumnSchema["vcpus"]>("vcpus");
      return vcpus ? <span className="font-mono">{vcpus}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 97,
    minSize: 50,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "system_ram_gb",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="RAM" />
    ),
    cell: ({ row }) => {
      const original = row.original;
      const ramGb = original.system_ram_gb || original.ram_gb;
      return ramGb ? (
        <div className="flex items-center gap-1">
          <span className="font-mono">{ramGb}</span>
          <span className="text-muted-foreground text-xs">GB</span>
        </div>
      ) : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 107,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "local_storage_tb",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Storage" />
    ),
    cell: ({ row }) => {
      const storageTb = row.getValue<ColumnSchema["local_storage_tb"]>("local_storage_tb");
      return storageTb ? (
        <div className="flex items-center gap-1">
          <span className="font-mono">{storageTb}</span>
          <span className="text-muted-foreground text-xs">TB</span>
        </div>
      ) : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 127,
    minSize: 70,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "text-center",
    },
  },
];
