import { LEVELS } from "@/constants/levels";
import { REGIONS } from "@/constants/region";
import { isArrayOfDates, isArrayOfNumbers } from "@/lib/is-array";
import {
  calculatePercentile,
  calculateSpecificPercentile,
} from "@/lib/request/percentile";
import {
  differenceInMinutes,
  isSameDay,
} from "date-fns";
import type {
  ColumnSchema,
  FacetMetadataSchema,
} from "../schema";
import type { SearchParamsType } from "../search-params";

export const sliderFilterValues = [
  "gpu_count",
  "vram_gb",
  "vcpus",
  "system_ram_gb",
  "price_hour_usd",
] as const satisfies (keyof ColumnSchema)[];

export const filterValues = [
  "provider",
  "gpu_model",
  ...sliderFilterValues,
  "observed_at",
] as const satisfies (keyof ColumnSchema)[];

export function filterData(
  data: ColumnSchema[],
  search: Partial<SearchParamsType>,
): ColumnSchema[] {
  const { start, size, sort, ...filters } = search;
  return data.filter((row) => {
    for (const key in filters) {
      const filter = filters[key as keyof typeof filters];
      if (filter === undefined || filter === null) continue;

      // Handle slider filters (gpu_count, vram_gb, vcpus, system_ram_gb, price_hour_usd)
      if ((key === "gpu_count" || key === "vram_gb" || key === "vcpus" || key === "system_ram_gb" || key === "price_hour_usd") && isArrayOfNumbers(filter)) {
        const value = row[key];
        if (typeof value !== 'number') continue;

        if (filter.length === 1 && value !== filter[0]) {
          return false;
        } else if (
          filter.length === 2 &&
          (value < filter[0] || value > filter[1])
        ) {
          return false;
        }
        continue;
      }

      // Handle observed_at date filtering
      if (key === "observed_at" && isArrayOfDates(filter)) {
        const value = new Date(row[key]);
        if (filter.length === 1 && !isSameDay(value, filter[0])) {
          return false;
        } else if (
          filter.length === 2 &&
          (value.getTime() < filter[0].getTime() ||
            value.getTime() > filter[1].getTime())
        ) {
          return false;
        }
        continue;
      }

      // Handle string filters (provider, gpu_model)
      if ((key === "provider" || key === "gpu_model") && typeof filter === 'string') {
        const value = row[key];
        if (typeof value === 'string' && !value.toLowerCase().includes(filter.toLowerCase())) {
          return false;
        }
        continue;
      }
    }
    return true;
  });
}

export function sortData(data: ColumnSchema[], sort: SearchParamsType["sort"]) {
  if (!sort) return data;
  return data.sort((a, b) => {
    if (sort.desc) {
      // @ts-ignore
      return a?.[sort.id] < b?.[sort.id] ? 1 : -1;
    } else {
      // @ts-ignore
      return a?.[sort.id] > b?.[sort.id] ? 1 : -1;
    }
  });
}

export function percentileData(data: ColumnSchema[]): ColumnSchema[] {
  // For GPU pricing, we can calculate percentiles based on price_hour_usd
  const rates = data.map((row) => row.price_hour_usd || 0);
  return data.map((row) => ({
    ...row,
    percentile: calculatePercentile(rates, row.price_hour_usd || 0),
  }));
}

export function splitData(data: ColumnSchema[], search: SearchParamsType) {
  // For pricing data, we don't need complex cursor-based pagination
  // Just return a slice of the data based on start and size
  const start = search.start || 0;
  const size = search.size || 50;

  return data.slice(start, start + size);
}

export function getFacetsFromData(data: ColumnSchema[]) {
  const valuesMap = data.reduce((prev, curr) => {
    Object.entries(curr).forEach(([key, value]) => {
      if (filterValues.includes(key as any)) {
        // REMINDER: because regions is an array with a single value we need to convert to string
        // TODO: we should make the region a single string instead of an array?!?
        const _value = Array.isArray(value) ? value.toString() : value;
        const total = prev.get(key)?.get(_value) || 0;
        if (prev.has(key) && _value) {
          prev.get(key)?.set(_value, total + 1);
        } else if (_value) {
          prev.set(key, new Map([[_value, 1]]));
        }
      }
    });
    return prev;
  }, new Map<string, Map<any, number>>());

  const facets = Object.fromEntries(
    Array.from(valuesMap.entries()).map(([key, valueMap]) => {
      let min: number | undefined;
      let max: number | undefined;
      const rows = Array.from(valueMap.entries()).map(([value, total]) => {
        if (typeof value === "number") {
          if (!min) min = value;
          else min = value < min ? value : min;
          if (!max) max = value;
          else max = value > max ? value : max;
        }
        return {
          value,
          total,
        };
      });
      const total = Array.from(valueMap.values()).reduce((a, b) => a + b, 0);
      return [key, { rows, total, min, max }];
    }),
  );

  return facets satisfies Record<string, FacetMetadataSchema>;
}

export function getPercentileFromData(data: ColumnSchema[]) {
  const prices = data.map((row) => row.price_hour_usd || 0);

  const p50 = calculateSpecificPercentile(prices, 50);
  const p75 = calculateSpecificPercentile(prices, 75);
  const p90 = calculateSpecificPercentile(prices, 90);
  const p95 = calculateSpecificPercentile(prices, 95);
  const p99 = calculateSpecificPercentile(prices, 99);

  return { p50, p75, p90, p95, p99 };
}


