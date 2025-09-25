"use client";

import { CopyToClipboardContainer } from "@/components/custom/copy-to-clipboard-container";
import { KVTabs } from "@/components/custom/kv-tabs";
import { DataTableColumnRegion } from "@/components/data-table/data-table-column/data-table-column-region";
import type {
  DataTableFilterField,
  Option,
  SheetField,
} from "@/components/data-table/types";
import { AI_CATEGORIES } from "@/constants/categories";
import { PRICING_MODELS } from "@/constants/pricing";
import { REGIONS } from "@/constants/region";
import { getStatusColor } from "@/lib/request/status-code";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PopoverPercentile } from "./_components/popover-percentile";
import { SheetTimingPhases } from "./_components/sheet-timing-phases";
import type { LogsMeta } from "./query-options";
import { type ColumnSchema } from "./schema";

// AI Tools filter fields
export const filterFields = [
  {
    label: "Category",
    value: "category",
    type: "checkbox",
    defaultOpen: true,
    options: AI_CATEGORIES.map((category) => ({ label: category, value: category })),
    component: (props: Option) => {
      return <span className="text-sm">{props.value}</span>;
    },
  },
  {
    label: "Pricing Model",
    value: "pricingModel",
    type: "checkbox",
    options: PRICING_MODELS.map((model) => ({ label: model, value: model })),
    component: (props: Option) => {
      return <span className="text-sm font-medium">{props.value}</span>;
    },
  },
  {
    label: "Company Name",
    value: "companyName",
    type: "input",
  },
  {
    label: "Tool Name",
    value: "toolName",
    type: "input",
  },
  {
    label: "Rating",
    value: "rating",
    type: "slider",
    min: 1,
    max: 5,
  },
  {
    label: "Monthly Users",
    value: "monthlyUsers",
    type: "slider",
    min: 1000,
    max: 100000000,
  },
  {
    label: "Founded Year",
    value: "foundedYear",
    type: "slider",
    min: 2010,
    max: 2024,
  },
  {
    label: "Headquarters",
    value: "headquarters",
    type: "input",
  },
  {
    label: "Regions",
    value: "regions",
    type: "checkbox",
    options: REGIONS.map((region) => ({ label: region, value: region })),
    component: (props: Option) => {
      return <span className="font-mono">{props.value}</span>;
    },
  },
] satisfies DataTableFilterField<ColumnSchema>[];

export const sheetFields = [
  {
    id: "uuid",
    label: "ID",
    type: "readonly",
    skeletonClassName: "w-64",
  },
  {
    id: "date",
    label: "Date Added",
    type: "readonly",
    component: (props) => format(new Date(props.date), "LLL dd, y HH:mm:ss"),
    skeletonClassName: "w-36",
  },
  {
    id: "companyName",
    label: "Company",
    type: "readonly",
    component: (props) => (
      <div className="font-medium text-lg">{props.companyName}</div>
    ),
    skeletonClassName: "w-32",
  },
  {
    id: "toolName",
    label: "AI Tool",
    type: "readonly",
    component: (props) => (
      <div className="font-semibold text-xl">{props.toolName}</div>
    ),
    skeletonClassName: "w-40",
  },
  {
    id: "category",
    label: "Category",
    type: "readonly",
    component: (props) => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        {props.category}
      </span>
    ),
    skeletonClassName: "w-28",
  },
  {
    id: "pricingModel",
    label: "Pricing",
    type: "readonly",
    component: (props) => (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        {props.pricingModel}
      </span>
    ),
    skeletonClassName: "w-20",
  },
  {
    id: "rating",
    label: "Rating",
    type: "readonly",
    component: (props) => (
      <div className="flex items-center gap-1">
        <span className="font-mono font-medium text-lg">{props.rating.toFixed(1)}</span>
        <span className="text-yellow-500 text-lg">★</span>
      </div>
    ),
    skeletonClassName: "w-16",
  },
  {
    id: "monthlyUsers",
    label: "Monthly Users",
    type: "readonly",
    component: (props) => {
      const formatted = new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(props.monthlyUsers);
      return <span className="font-mono font-medium">{formatted}</span>;
    },
    skeletonClassName: "w-20",
  },
  {
    id: "foundedYear",
    label: "Founded",
    type: "readonly",
    component: (props) => (
      <span className="font-mono">{props.foundedYear}</span>
    ),
    skeletonClassName: "w-16",
  },
  {
    id: "headquarters",
    label: "Headquarters",
    type: "readonly",
    component: (props) => (
      <span>{props.headquarters}</span>
    ),
    skeletonClassName: "w-24",
  },
  {
    id: "website",
    label: "Website",
    type: "readonly",
    component: (props) => (
      <a
        href={props.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        {props.website}
      </a>
    ),
    skeletonClassName: "w-40",
  },
  {
    id: "regions",
    label: "Available Regions",
    type: "readonly",
    component: (props) => (
      <div className="flex flex-wrap gap-1">
        {props.regions.map((region: string) => (
          <DataTableColumnRegion key={region} value={region} showFlag />
        ))}
      </div>
    ),
    className: "flex-col items-start w-full gap-2",
  },
  {
    id: "description",
    label: "Description",
    type: "readonly",
    component: (props) => (
      <div className="text-gray-700 leading-relaxed">{props.description}</div>
    ),
    className: "flex-col items-start w-full gap-2",
  },
] satisfies SheetField<ColumnSchema, LogsMeta>[];
