"use client";

import type {
  DataTableFilterField,
  Option,
  SheetField,
} from "@/components/data-table/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ColumnSchema } from "./schema";

// GPU pricing filter fields
export const filterFields = [
  {
    label: "Provider",
    value: "provider",
    type: "input",
    defaultOpen: true,
  },
  {
    label: "GPU Model",
    value: "gpu_model",
    type: "input",
  },
  {
    label: "GPU Count",
    value: "gpu_count",
    type: "slider",
    min: 1,
    max: 8,
  },
  {
    label: "VRAM (GB)",
    value: "vram_gb",
    type: "slider",
    min: 8,
    max: 128,
  },
  {
    label: "vCPUs",
    value: "vcpus",
    type: "slider",
    min: 1,
    max: 256,
  },
  {
    label: "System RAM (GB)",
    value: "system_ram_gb",
    type: "slider",
    min: 8,
    max: 4096,
  },
  {
    label: "Local Storage (TB)",
    value: "local_storage_tb",
    type: "slider",
    min: 0.1,
    max: 100,
  },
  {
    label: "Hourly Rate ($)",
    value: "price_hour_usd",
    type: "slider",
    min: 0.1,
    max: 50,
  },
] satisfies DataTableFilterField<ColumnSchema>[];

export const sheetFields = [
  {
    id: "provider",
    label: "Provider",
    type: "readonly",
    component: (props) => (
      <div className="font-medium text-lg capitalize">{props.provider}</div>
    ),
    skeletonClassName: "w-24",
  },
  {
    id: "gpu_model",
    label: "GPU Model",
    type: "readonly",
    component: (props) => props.gpu_model ? (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
        {props.gpu_model}
      </span>
    ) : <span className="text-muted-foreground">N/A</span>,
    skeletonClassName: "w-20",
  },
  {
    id: "gpu_count",
    label: "GPU Count",
    type: "readonly",
    component: (props) => props.gpu_count ? (
      <div className="flex items-center gap-1">
        <span className="font-mono font-medium text-lg">{props.gpu_count}x</span>
        <span className="text-muted-foreground">GPUs</span>
      </div>
    ) : <span className="text-muted-foreground">N/A</span>,
    skeletonClassName: "w-16",
  },
  {
    id: "vram_gb",
    label: "VRAM",
    type: "readonly",
    component: (props) => (
      <span className="font-mono font-medium">
        {props.vram_gb ? `${props.vram_gb}GB` : 'N/A'}
      </span>
    ),
    skeletonClassName: "w-16",
  },
  {
    id: "vcpus",
    label: "vCPUs",
    type: "readonly",
    component: (props) => (
      <span className="font-mono font-medium">
        {props.vcpus || 'N/A'}
      </span>
    ),
    skeletonClassName: "w-16",
  },
  {
    id: "system_ram_gb",
    label: "System RAM",
    type: "readonly",
    component: (props) => (
      <span className="font-mono font-medium">
        {props.system_ram_gb ? `${props.system_ram_gb}GB` : 'N/A'}
      </span>
    ),
    skeletonClassName: "w-20",
  },
  {
    id: "local_storage_tb",
    label: "Local Storage",
    type: "readonly",
    component: (props) => (
      <span className="font-mono font-medium">
        {props.local_storage_tb ? `${props.local_storage_tb}TB` : 'N/A'}
      </span>
    ),
    skeletonClassName: "w-20",
  },
  {
    id: "price_hour_usd",
    label: "Hourly Rate",
    type: "readonly",
    component: (props) => props.price_hour_usd ? (
      <div className="flex items-center gap-1">
        <span className="font-mono font-medium text-lg">${props.price_hour_usd.toFixed(3)}</span>
        <span className="text-muted-foreground">per hour</span>
      </div>
    ) : <span className="text-muted-foreground">N/A</span>,
    skeletonClassName: "w-24",
  },
  {
    id: "source_url",
    label: "Source",
    type: "readonly",
    component: (props) => (
      <a
        href={props.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline text-sm"
      >
        View on CoreWeave
      </a>
    ),
    skeletonClassName: "w-32",
  },
  {
    id: "observed_at",
    label: "Last Updated",
    type: "readonly",
    component: (props) => format(new Date(props.observed_at), "LLL dd, y HH:mm:ss"),
    skeletonClassName: "w-36",
  },
] satisfies SheetField<ColumnSchema>[];
