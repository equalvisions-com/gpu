import {
  ARRAY_DELIMITER,
  RANGE_DELIMITER,
  SLIDER_DELIMITER,
} from "@/lib/delimiters";
import { AI_CATEGORIES } from "@/constants/categories";
import { PRICING_MODELS } from "@/constants/pricing";
import { REGIONS } from "@/constants/region";
import { z } from "zod";

// https://github.com/colinhacks/zod/issues/2985#issue-2008642190
const stringToBoolean = z
  .string()
  .toLowerCase()
  .transform((val) => {
    try {
      return JSON.parse(val);
    } catch (e) {
      console.log(e);
      return undefined;
    }
  })
  .pipe(z.boolean().optional());

// HTTP status levels
const HTTP_LEVELS = ["success", "warning", "error", "info"] as const;


export const columnSchema = z.object({
  uuid: z.string(),
  companyName: z.string(),
  toolName: z.string(),
  category: z.enum(AI_CATEGORIES),
  pricingModel: z.enum(PRICING_MODELS),
  foundedYear: z.number(),
  headquarters: z.string(),
  website: z.string(),
  description: z.string(),
  rating: z.number().min(1).max(5),
  monthlyUsers: z.number(),
  regions: z.enum(REGIONS).array(),
  date: z.date(),
  latency: z.number(),
  level: z.enum(HTTP_LEVELS),
  status: z.number(),
  method: z.string(),
  host: z.string(),
  pathname: z.string(),
  timing: z.object({
    dns: z.number(),
    connection: z.number(),
    tls: z.number(),
    ttfb: z.number(),
    transfer: z.number(),
  }),
  percentile: z.number().optional(),
});

export type ColumnSchema = z.infer<typeof columnSchema>;

// TODO: can we get rid of this in favor of nuqs search-params?
export const columnFilterSchema = z.object({
  category: z
    .string()
    .transform((val) => val.split(ARRAY_DELIMITER))
    .pipe(z.enum(AI_CATEGORIES).array())
    .optional(),
  pricingModel: z
    .string()
    .transform((val) => val.split(ARRAY_DELIMITER))
    .pipe(z.enum(PRICING_MODELS).array())
    .optional(),
  companyName: z.string().optional(),
  toolName: z.string().optional(),
  rating: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  monthlyUsers: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  foundedYear: z
    .string()
    .transform((val) => val.split(SLIDER_DELIMITER))
    .pipe(z.coerce.number().array().max(2))
    .optional(),
  headquarters: z.string().optional(),
  regions: z
    .string()
    .transform((val) => val.split(ARRAY_DELIMITER))
    .pipe(z.enum(REGIONS).array())
    .optional(),
  date: z
    .string()
    .transform((val) => val.split(RANGE_DELIMITER).map(Number))
    .pipe(z.coerce.date().array())
    .optional(),
});

export type ColumnFilterSchema = z.infer<typeof columnFilterSchema>;


export const facetMetadataSchema = z.object({
  rows: z.array(z.object({ value: z.any(), total: z.number() })),
  total: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type FacetMetadataSchema = z.infer<typeof facetMetadataSchema>;

