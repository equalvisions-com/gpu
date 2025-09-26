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
    header: "Provider",
    cell: ({ row }) => {
      const provider = row.getValue<ColumnSchema["provider"]>("provider");
      return (
        <div className="flex items-center gap-2">
          {provider === "coreweave" && (
            <img
              src="/logos/coreweave.png"
              alt="CoreWeave"
              className="h-5 w-5"
            />
          )}
          <span className="font-medium capitalize">{provider}</span>
        </div>
      );
    },
    size: 120,
    minSize: 120,
    meta: {
      cellClassName: "font-medium w-[--col-provider-size] max-w-[--col-provider-size]",
      headerClassName: "min-w-[--header-provider-size] w-[--header-provider-size]",
    },
  },
  {
    accessorKey: "instance_id",
    header: "Instance ID",
    cell: ({ row }) => {
      const instanceId = row.getValue<ColumnSchema["instance_id"]>("instance_id");
      return instanceId ? <TextWithTooltip text={instanceId} /> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 160,
    minSize: 160,
    meta: {
      cellClassName: "font-mono font-semibold w-[--col-instance-size] max-w-[--col-instance-size]",
      headerClassName: "min-w-[--header-instance-size] w-[--header-instance-size]",
    },
  },
  {
    accessorKey: "gpu_model",
    header: "GPU Model",
    cell: ({ row }) => {
      const gpuModel = row.getValue<ColumnSchema["gpu_model"]>("gpu_model");
      return gpuModel ? <span className="font-medium">{gpuModel}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 120,
    minSize: 120,
    meta: {
      cellClassName: "w-[--col-gpu-size] max-w-[--col-gpu-size]",
      headerClassName: "w-[--header-gpu-size] max-w-[--header-gpu-size]",
    },
  },
  {
    accessorKey: "gpu_count",
    header: "GPU Count",
    cell: ({ row }) => {
      const gpuCount = row.getValue<ColumnSchema["gpu_count"]>("gpu_count");
      return gpuCount ? <span className="font-mono font-medium">{gpuCount}x</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 100,
    minSize: 100,
    meta: {
      cellClassName: "font-mono w-[--col-gpu-count-size] max-w-[--col-gpu-count-size]",
      headerClassName: "w-[--header-gpu-count-size] max-w-[--header-gpu-count-size]",
    },
  },
  {
    accessorKey: "vram_gb",
    header: "VRAM (GB)",
    cell: ({ row }) => {
      const vramGb = row.getValue<ColumnSchema["vram_gb"]>("vram_gb");
      return vramGb ? <span className="font-mono">{vramGb}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 100,
    minSize: 100,
    meta: {
      cellClassName: "font-mono w-[--col-vram-size] max-w-[--col-vram-size]",
      headerClassName: "w-[--header-vram-size] max-w-[--header-vram-size]",
    },
  },
  {
    accessorKey: "vcpus",
    header: "vCPUs",
    cell: ({ row }) => {
      const vcpus = row.getValue<ColumnSchema["vcpus"]>("vcpus");
      return vcpus ? <span className="font-mono">{vcpus}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 80,
    minSize: 80,
    meta: {
      cellClassName: "font-mono w-[--col-vcpus-size] max-w-[--col-vcpus-size]",
      headerClassName: "w-[--header-vcpus-size] max-w-[--header-vcpus-size]",
    },
  },
  {
    accessorKey: "system_ram_gb",
    header: "RAM (GB)",
    cell: ({ row }) => {
      const ramGb = row.getValue<ColumnSchema["system_ram_gb"]>("system_ram_gb");
      return ramGb ? <span className="font-mono">{ramGb}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 90,
    minSize: 90,
    meta: {
      cellClassName: "font-mono w-[--col-ram-size] max-w-[--col-ram-size]",
      headerClassName: "w-[--header-ram-size] max-w-[--header-ram-size]",
    },
  },
  {
    accessorKey: "local_storage_tb",
    header: "Storage (TB)",
    cell: ({ row }) => {
      const storageTb = row.getValue<ColumnSchema["local_storage_tb"]>("local_storage_tb");
      return storageTb ? <span className="font-mono">{storageTb}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 110,
    minSize: 110,
    meta: {
      cellClassName: "font-mono w-[--col-storage-size] max-w-[--col-storage-size]",
      headerClassName: "w-[--header-storage-size] max-w-[--header-storage-size]",
    },
  },
  {
    accessorKey: "cpu_model",
    header: "CPU Model",
    cell: ({ row }) => {
      const cpuModel = row.getValue<ColumnSchema["cpu_model"]>("cpu_model");
      return cpuModel ? <span className="text-sm">{cpuModel}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 140,
    minSize: 140,
    meta: {
      cellClassName: "w-[--col-cpu-size] max-w-[--col-cpu-size]",
      headerClassName: "min-w-[--header-cpu-size] w-[--header-cpu-size]",
    },
  },
  {
    accessorKey: "price_hour_usd",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Hourly Rate" />
    ),
    cell: ({ row }) => {
      const priceHourUsd = row.getValue<ColumnSchema["price_hour_usd"]>("price_hour_usd");
      return priceHourUsd ? (
        <div className="flex items-center gap-1">
          <span className="font-mono font-medium">${priceHourUsd.toFixed(3)}</span>
          <span className="text-muted-foreground text-xs">/hr</span>
        </div>
      ) : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    enableResizing: false,
    size: 120,
    minSize: 120,
    meta: {
      headerClassName:
        "w-[--header-rate-size] max-w-[--header-rate-size] min-w-[--header-rate-size]",
      cellClassName:
        "font-mono w-[--col-rate-size] max-w-[--col-rate-size] min-w-[--col-rate-size]",
    },
  },
  {
    accessorKey: "class",
    header: "Class",
    cell: ({ row }) => {
      const classType = row.getValue<ColumnSchema["class"]>("class");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          classType === "GPU"
            ? "bg-blue-100 text-blue-800"
            : classType === "CPU"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}>
          {classType}
        </span>
      );
    },
    size: 80,
    minSize: 80,
    meta: {
      cellClassName: "w-[--col-class-size] max-w-[--col-class-size]",
      headerClassName: "w-[--header-class-size] max-w-[--header-class-size]",
    },
  },
  {
    accessorKey: "network",
    header: "Network",
    cell: ({ row }) => {
      const network = row.getValue<ColumnSchema["network"]>("network");
      return network ? (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          network === "InfiniBand"
            ? "bg-purple-100 text-purple-800"
            : network === "Ethernet"
            ? "bg-cyan-100 text-cyan-800"
            : "bg-gray-100 text-gray-800"
        }`}>
          {network}
        </span>
      ) : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 100,
    minSize: 100,
    meta: {
      cellClassName: "w-[--col-network-size] max-w-[--col-network-size]",
      headerClassName: "w-[--header-network-size] max-w-[--header-network-size]",
    },
  },
  {
    accessorKey: "observed_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Updated" />
    ),
    cell: ({ row }) => {
      const observedAt = new Date(row.getValue<ColumnSchema["observed_at"]>("observed_at"));
      return <HoverCardTimestamp date={observedAt} />;
    },
    enableResizing: false,
    size: 180,
    minSize: 180,
    meta: {
      headerClassName:
        "w-[--header-observed-size] max-w-[--header-observed-size] min-w-[--header-observed-size]",
      cellClassName:
        "font-mono w-[--col-observed-size] max-w-[--col-observed-size] min-w-[--col-observed-size]",
    },
  },
];
