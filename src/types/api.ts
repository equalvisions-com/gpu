import type { FacetMetadataSchema } from "@/components/infinite-table/schema";
import type { ColumnSchema } from "@/components/infinite-table/schema";

export type RowId = string;
export type RowWithId = ColumnSchema & { uuid: RowId };

export type ApiPageMeta<TMeta = unknown> = {
  totalRowCount: number;
  filterRowCount: number;
  facets: Record<string, FacetMetadataSchema>;
  metadata?: TMeta;
};

export type ApiPage<T = RowWithId, TMeta = unknown> = {
  data: T[];
  meta: ApiPageMeta<TMeta>;
  prevCursor: number | null;
  nextCursor: number | null;
};


