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
    accessorKey: "instance_id",
    header: "Instance ID",
    cell: ({ row }) => {
      const instanceId = row.getValue<ColumnSchema["instance_id"]>("instance_id");
      return instanceId ? <TextWithTooltip text={instanceId} /> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 200,
    minSize: 120,
    meta: {
      cellClassName: "font-mono font-semibold",
      headerClassName: "",
    },
  },
  {
    accessorKey: "gpu_model",
    header: "GPU Model",
    cell: ({ row }) => {
      // Handle both CoreWeave (gpu_model) and Nebius (item) data
      const original = row.original;
      const displayName = original.gpu_model || original.item;

      if (!displayName) return <Minus className="h-4 w-4 text-muted-foreground/50" />;

      const isNvidia = displayName.toLowerCase().includes('nvidia');

      return (
        <div className="flex items-center gap-2">
          {isNvidia && (
            <img
              src="/logos/nvidia.png"
              alt="NVIDIA"
              className="h-4 w-4 object-contain"
            />
          )}
          <span className="font-medium">{displayName}</span>
        </div>
      );
    },
    size: 150,
    minSize: 80,
    meta: {
      cellClassName: "",
      headerClassName: "",
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
    size: 120,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "",
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
    size: 120,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "",
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
    size: 100,
    minSize: 50,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "",
    },
  },
  {
    accessorKey: "system_ram_gb",
    header: "RAM (GB)",
    cell: ({ row }) => {
      const original = row.original;
      const ramGb = original.system_ram_gb || original.ram_gb;
      return ramGb ? <span className="font-mono">{ramGb}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: "inNumberRange",
    size: 110,
    minSize: 60,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "",
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
    size: 130,
    minSize: 70,
    meta: {
      cellClassName: "font-mono",
      headerClassName: "",
    },
  },
  {
    accessorKey: "cpu_model",
    header: "CPU Model",
    cell: ({ row }) => {
      const cpuModel = row.getValue<ColumnSchema["cpu_model"]>("cpu_model");
      return cpuModel ? <span className="text-sm">{cpuModel}</span> : <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    size: 170,
    minSize: 100,
    meta: {
      cellClassName: "",
      headerClassName: "",
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
          <span className="font-mono font-medium">${price.toFixed(3)}</span>
          <span className="text-muted-foreground text-xs">{unitDisplay}</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 150,
    minSize: 80,
    meta: {
      headerClassName: "",
      cellClassName: "font-mono",
    },
  },
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
          {provider === "nebius" && (
            <img
              src="/logos/nebius.png"
              alt="Nebius"
              className="h-5 w-5"
            />
          )}
          <span className="font-medium capitalize">{provider}</span>
        </div>
      );
    },
    size: 140,
    minSize: 80,
    meta: {
      cellClassName: "font-medium",
      headerClassName: "",
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
    size: 100,
    minSize: 50,
    meta: {
      cellClassName: "",
      headerClassName: "",
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
    size: 120,
    minSize: 60,
    meta: {
      cellClassName: "",
      headerClassName: "",
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
    size: 200,
    minSize: 120,
    meta: {
      headerClassName: "",
      cellClassName: "font-mono",
    },
  },
];
