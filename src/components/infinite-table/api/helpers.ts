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
  "latency",
  "timing.dns",
  "timing.connection",
  "timing.tls",
  "timing.ttfb",
  "timing.transfer",
] as const satisfies (keyof ColumnSchema)[];

export const filterValues = [
  "level",
  ...sliderFilterValues,
  "status",
  "regions",
  "method",
  "host",
  "pathname",
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
      if (
        (key === "latency" ||
          key === "timing.dns" ||
          key === "timing.connection" ||
          key === "timing.tls" ||
          key === "timing.ttfb" ||
          key === "timing.transfer") &&
        isArrayOfNumbers(filter)
      ) {
        if (filter.length === 1 && row[key] !== filter[0]) {
          return false;
        } else if (
          filter.length === 2 &&
          (row[key] < filter[0] || row[key] > filter[1])
        ) {
          return false;
        }
        return true;
      }
      if (key === "status" && isArrayOfNumbers(filter)) {
        if (!filter.includes(row[key])) {
          return false;
        }
      }
      if (key === "regions" && Array.isArray(filter)) {
        const typedFilter = filter as unknown as typeof REGIONS;
        if (!typedFilter.includes(row[key]?.[0])) {
          return false;
        }
      }
      if (key === "date" && isArrayOfDates(filter)) {
        if (filter.length === 1 && !isSameDay(row[key], filter[0])) {
          return false;
        } else if (
          filter.length === 2 &&
          (row[key].getTime() < filter[0].getTime() ||
            row[key].getTime() > filter[1].getTime())
        ) {
          return false;
        }
      }
      if (key === "level" && Array.isArray(filter)) {
        const typedFilter = filter as unknown as (typeof LEVELS)[number][];
        if (!typedFilter.includes(row[key])) {
          return false;
        }
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
  const latencies = data.map((row) => row.latency);
  return data.map((row) => ({
    ...row,
    percentile: calculatePercentile(latencies, row.latency),
  }));
}

export function splitData(data: ColumnSchema[], search: SearchParamsType) {
  let newData: ColumnSchema[] = [];
  const now = new Date();

  // TODO: write a helper function for this
  data.forEach((item) => {
    if (search.direction === "next") {
      if (
        item.date.getTime() < search.cursor.getTime() &&
        newData.length < search.size
      ) {
        newData.push(item);
        // TODO: check how to deal with the cases that there are some items left with the same date
      } else if (
        item.date.getTime() === newData[newData.length - 1]?.date.getTime()
      ) {
        newData.push(item);
      }
    } else if (search.direction === "prev") {
      if (
        item.date.getTime() > search.cursor.getTime() &&
        // REMINDER: we need to make sure that we don't get items that are in the future which we do with mockLive data
        item.date.getTime() < now.getTime()
      ) {
        newData.push(item);
      }
    }
  });

  return newData;
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
  const latencies = data.map((row) => row.latency);

  const p50 = calculateSpecificPercentile(latencies, 50);
  const p75 = calculateSpecificPercentile(latencies, 75);
  const p90 = calculateSpecificPercentile(latencies, 90);
  const p95 = calculateSpecificPercentile(latencies, 95);
  const p99 = calculateSpecificPercentile(latencies, 99);

  return { p50, p75, p90, p95, p99 };
}


