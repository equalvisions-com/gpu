import * as React from "react";
import { Suspense } from "react";
import { searchParamsCache } from "@/components/infinite-table/search-params";
import { getQueryClient } from "@/providers/get-query-client";
import { dataOptions } from "@/components/infinite-table/query-options";
import { Client } from "@/components/infinite-table/client";
import AuthShell from "./AuthShell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const search = searchParamsCache.parse(await searchParams);
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery(dataOptions(search));

  return (
    <Client
      sidebar={
        <Suspense fallback={null}>
          <AuthShell />
        </Suspense>
      }
    />
  );
}

