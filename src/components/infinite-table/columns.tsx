"use client";

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
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnDef } from "@tanstack/react-table";
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
          {provider === "runpod" && (
            <img
              src="/logos/runpod.png"
              alt="RunPod"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "lambda" && (
            <img
              src="/logos/lambda.png"
              alt="Lambda"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "digitalocean" && (
            <img
              src="/logos/digitalocean.png"
              alt="DigitalOcean"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "oracle" && (
            <img
              src="/logos/oracle.png"
              alt="Oracle"
              className="h-5 w-5 rounded"
            />
          )}
          {provider === "crusoe" && (
            <img
              src="/logos/crusoe.png"
              alt="Crusoe"
              className="h-5 w-5 rounded"
            />
          )}
          <span className="font-medium capitalize">{provider}</span>
        </div>
      );
    },
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "font-medium",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "gpu_model",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => {
      // Handle both CoreWeave (gpu_model) and Nebius (item) data
      const original = row.original;
      const displayName = original.gpu_model || original.item;

      if (!displayName) return <span className="text-muted-foreground">N/A</span>;

      return (
        <div className="min-w-0 w-full"><span className="block truncate font-medium">{displayName}</span></div>
      );
    },
    size: 600,
    meta: {
      cellClassName: "",
      headerClassName: "text-center",
    },
  },
  {
    id: "blank",
    header: "",
    cell: () => (
      <div
        className="flex items-center justify-center h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox />
      </div>
    ),
    size: 40,
    minSize: 40,
    maxSize: 40,
    meta: {
      cellClassName: "text-center p-0",
      headerClassName: "",
    },
  },
  {
    accessorKey: "price_hour_usd",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" centerTitle />
    ),
    cell: ({ row }) => {
      const original = row.original;
      const price = original.price_hour_usd || original.price_usd;
      const unit = original.price_unit || "hour";

      if (!price) return <span className="text-muted-foreground">N/A</span>;

      return (
        <>
          <span className="font-mono font-medium">${price.toFixed(2)}</span>{" "}
          <span className="font-mono text-muted-foreground">/HR</span>
        </>
      );
    },
    filterFn: "inNumberRange",
    size: 160,
    minSize: 160,
    meta: {
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
  },
  {
    accessorKey: "gpu_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Config" centerTitle />
    ),
    cell: ({ row }) => {
      const gpuCount = row.getValue<ColumnSchema["gpu_count"]>("gpu_count");
      if (!gpuCount) return <span className="text-muted-foreground">N/A</span>;

      return (
        <>
          <span className="font-mono font-medium">{gpuCount}</span>{" "}
          <span className="text-muted-foreground">{gpuCount === 1 ? 'GPU' : 'GPUs'}</span>
        </>
      );
    },
    filterFn: "inNumberRange",
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "vram_gb",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="VRAM" centerTitle />
    ),
    cell: ({ row }) => {
      const vramGb = row.getValue<ColumnSchema["vram_gb"]>("vram_gb");
      return vramGb ? (
        <>
          <span className="font-mono">{vramGb}</span>{" "}
          <span className="text-muted-foreground">GB</span>
        </>
      ) : <span className="text-muted-foreground">N/A</span>;
    },
    filterFn: "inNumberRange",
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "vcpus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="vCPUs" centerTitle />
    ),
    cell: ({ row }) => {
      const vcpus = row.getValue<ColumnSchema["vcpus"]>("vcpus");
      if (!vcpus) return <span className="text-muted-foreground">N/A</span>;

      return (
        <>
          <span className="font-mono font-medium">{vcpus}</span>{" "}
          <span className="text-muted-foreground">vCPUs</span>
        </>
      );
    },
    filterFn: "inNumberRange",
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "system_ram_gb",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="RAM" centerTitle />
    ),
    cell: ({ row }) => {
      const original = row.original;
      const ramGb = original.system_ram_gb || original.ram_gb;
      return ramGb ? (
        <>
          <span className="font-mono">{ramGb}</span>{" "}
          <span className="text-muted-foreground">GB</span>
        </>
      ) : <span className="text-muted-foreground">N/A</span>;
    },
    filterFn: "inNumberRange",
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue<ColumnSchema["type"]>("type");
      return type ? <span className="font-medium">{type}</span> : <span className="text-muted-foreground">N/A</span>;
    },
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
    },
  },
];
