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
import { useDataTable } from "@/components/data-table/data-table-provider";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { HoverCardTimestamp } from "./_components/hover-card-timestamp";
import type { ColumnSchema } from "./schema";
import { DataTableFilterControlsDrawer } from "@/components/data-table/data-table-filter-controls-drawer";


function RowCheckboxCell({ rowId }: { rowId: string }) {
  const { checkedRows, toggleCheckedRow } = useDataTable<ColumnSchema, unknown>();
  const isChecked = checkedRows[rowId] ?? false;
  return (
    <Checkbox
      checked={isChecked}
      onCheckedChange={(next) => toggleCheckedRow(rowId, Boolean(next))}
      aria-label={`Check row ${rowId}`}
    />
  );
}


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
            <Image src="/logos/coreweave.png" alt="CoreWeave" width={20} height={20} className="rounded" />
          )}
          {provider === "nebius" && (
            <Image src="/logos/nebius.png" alt="Nebius" width={20} height={20} className="rounded" />
          )}
          {provider === "hyperstack" && (
            <Image src="/logos/hyperstack.png" alt="Hyperstack" width={20} height={20} className="rounded" />
          )}
          {provider === "runpod" && (
            <Image src="/logos/runpod.png" alt="RunPod" width={20} height={20} className="rounded" />
          )}
          {provider === "lambda" && (
            <Image src="/logos/lambda.png" alt="Lambda" width={20} height={20} className="rounded" />
          )}
          {provider === "digitalocean" && (
            <Image src="/logos/digitalocean.png" alt="DigitalOcean" width={20} height={20} className="rounded" />
          )}
          {provider === "oracle" && (
            <Image src="/logos/oracle.png" alt="Oracle" width={20} height={20} className="rounded" />
          )}
          {provider === "crusoe" && (
            <Image src="/logos/crusoe.png" alt="Crusoe" width={20} height={20} className="rounded" />
          )}
          <span className="font-medium capitalize">{provider}</span>
        </div>
      );
    },
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "font-medium min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
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
        <div className="w-full overflow-hidden" style={{ maxWidth: '250px' }}><span className="block truncate font-medium">{displayName}</span></div>
      );
    },
    size: 1, // Use flex sizing instead of fixed pixels
    minSize: 250,
    meta: {
      cellClassName: "overflow-hidden min-w-[250px] w-[250px] max-w-[250px] md:flex-1 md:max-w-none",
      headerClassName: "text-center overflow-hidden min-w-[250px] w-[250px] max-w-[250px] md:flex-1 md:max-w-none",
    },
  },
  {
    id: "blank",
    header: () => (
      <div className="flex items-center justify-center">
        <DataTableFilterControlsDrawer />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    cell: ({ row }) => {
      const stop = (e: any) => e.stopPropagation();
      return (
        <div className="flex items-center justify-center h-full" onClick={stop} onMouseDown={stop} onPointerDown={stop} onKeyDown={stop}>
          <RowCheckboxCell rowId={row.id} />
        </div>
      );
    },
    size: 45,
    minSize: 45,
    maxSize: 45,
    meta: {
      cellClassName: "text-center p-0 min-w-[45px]",
      headerClassName: "min-w-[45px]",
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
          <span className="font-mono text-muted-foreground">/hr</span>
        </>
      );
    },
    filterFn: "inNumberRange",
    size: 155,
    minSize: 155,
    meta: {
      headerClassName: "text-center min-w-[155px]",
      cellClassName: "text-center min-w-[155px]",
    },
  },
  {
    accessorKey: "gpu_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GPUs" centerTitle />
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
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "text-center min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
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
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "text-center min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
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
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "text-center min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
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
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "text-center min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Config" centerTitle />
    ),
    cell: ({ row }) => {
      const type = row.getValue<ColumnSchema["type"]>("type");
      return type ? <span className="font-medium">{type}</span> : <span className="text-muted-foreground">N/A</span>;
    },
    size: 155,
    minSize: 155,
    meta: {
      cellClassName: "text-center min-w-[155px]",
      headerClassName: "text-center min-w-[155px]",
    },
  },
];
