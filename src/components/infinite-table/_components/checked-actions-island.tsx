"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { Button } from "@/components/ui/button";
import { Star, GitCompare, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import type { FavoriteKey } from "@/types/favorites";
import { stableGpuKey } from "@/components/infinite-table/stable-key";

export function CheckedActionsIsland({ initialFavoriteKeys }: { initialFavoriteKeys?: FavoriteKey[] }) {
  const { checkedRows, table } = useDataTable<ColumnSchema, unknown>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const [remoteUpdated, setRemoteUpdated] = React.useState(false);

  // Only show and fetch favorites when the user actually selects rows
  const hasSelection = React.useMemo(() => {
    for (const _ in checkedRows) return true;
    return false;
  }, [checkedRows]);

  // Fetch user's favorites only when needed (when user selects rows)
  const { data: favorites = [], refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }
      const data = await response.json();
      return data.favorites || [];
    },
    staleTime: Infinity,
    // Avoid first network hit if SSR provided keys; revalidation happens on writes
    enabled: hasSelection && !(initialFavoriteKeys && initialFavoriteKeys.length),
    initialData: initialFavoriteKeys,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Local optimistic snapshot to ensure instant UI even if a fetch is in flight
  const [localFavorites, setLocalFavorites] = React.useState<FavoriteKey[] | undefined>(initialFavoriteKeys);
  React.useEffect(() => {
    if (Array.isArray(favorites)) {
      setLocalFavorites(favorites as FavoriteKey[]);
    }
  }, [favorites]);

  // Cross-tab sync: listen for favorites updates and trigger a one-time refetch on selection
  React.useEffect(() => {
    const bc = new BroadcastChannel("favorites");
    bcRef.current = bc;
    bc.onmessage = () => setRemoteUpdated(true);
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (hasSelection && remoteUpdated) {
      void refetch();
      setRemoteUpdated(false);
    }
  }, [hasSelection, remoteUpdated, refetch]);

  const favoriteKeys = React.useMemo(() => {
    const list = (localFavorites && localFavorites.length > 0)
      ? localFavorites
      : (initialFavoriteKeys || []);
    return new Set(list);
  }, [localFavorites, initialFavoriteKeys]);

  // hasSelection computed above

  const canCompare = React.useMemo(() => {
    let count = 0;
    for (const _ in checkedRows) {
      count++;
      if (count >= 2) return true;
    }
    return false;
  }, [checkedRows]);

  // Determine favorite status of selected items
  const favoriteStatus = React.useMemo(() => {
    const selectedRowIds = Object.keys(checkedRows);
    const rowById = new Map(table.getRowModel().flatRows.map(r => [r.id, r.original as ColumnSchema]));
    const selectedKeys = selectedRowIds
      .map(id => rowById.get(id))
      .filter(Boolean)
      .map(row => stableGpuKey(row as ColumnSchema));

    const alreadyFavorited = selectedKeys.filter(key => favoriteKeys.has(key));
    const notFavorited = selectedKeys.filter(key => !favoriteKeys.has(key));

    // Only remove if ALL selected items are already favorited
    // Otherwise, only add the unfavorited ones
    const shouldRemove = alreadyFavorited.length === selectedKeys.length && selectedKeys.length > 0;
    const shouldAdd = notFavorited.length > 0;

    return {
      selectedCount: selectedKeys.length,
      alreadyFavorited: alreadyFavorited.length,
      notFavorited: notFavorited.length,
      toAdd: shouldAdd ? notFavorited : [],
      toRemove: shouldRemove ? alreadyFavorited : [],
      shouldRemove,
      shouldAdd,
    };
  }, [checkedRows, favoriteKeys, table]);

  const [isMutating, setIsMutating] = React.useState(false);

  const handleFavorite = async () => {
    if (!hasSelection) return;
    if (isMutating) return;
    setIsMutating(true);

    const { toAdd, toRemove } = favoriteStatus;

    // Store original state for potential rollback
    const snapshot = (queryClient.getQueryData(["favorites"]) as FavoriteKey[] | undefined)
      ?? (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : undefined)
      ?? (initialFavoriteKeys || []);
    const originalFavorites = [...snapshot];

    // Immediately update UI with optimistic state (no loading state)
    const current = (localFavorites ?? (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : []) ?? []);
    // Cancel any in-flight fetch to prevent overwriting optimistic state
    try { await queryClient.cancelQueries({ queryKey: ["favorites"] }); } catch {}

    const optimisticFavorites = [
      ...current.filter((uuid) => !toRemove.includes(uuid as FavoriteKey)), // Remove items
      ...toAdd // Add items
    ];

    queryClient.setQueryData(["favorites"], optimisticFavorites);
    setLocalFavorites(optimisticFavorites);

    // Perform API calls in background (don't await to keep UI responsive)
    Promise.all([
      // Add new favorites
      ...(toAdd.length > 0 ? [fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpuUuids: toAdd }),
      })] : []),

      // Remove existing favorites
      ...(toRemove.length > 0 ? [fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpuUuids: toRemove }),
      })] : []),
    ])
    .then(async (responses) => {
      // If unauthorized, rollback and redirect to sign-in immediately
      if (responses.some((r) => r.status === 401)) {
        queryClient.setQueryData(["favorites"], originalFavorites);
        setLocalFavorites(originalFavorites);
        router.push("/signin");
        setIsMutating(false);
        return;
      }
      const errors = [];
      for (const response of responses) {
        if (!response.ok) {
          if (response.status === 429) {
            errors.push('Rate limit exceeded, try again shortly');
          } else {
            const error = await response.json().catch(() => null);
            errors.push((error && error.error) || 'API call failed');
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Success - invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      // Notify other tabs
      try { bcRef.current?.postMessage({ t: "updated" }); } catch {}

      setIsMutating(false);

      if (toAdd.length > 0) {
        toast("Success", { description: toAdd.length === 1 ? "Favorite added" : "Favorites added" });
      }
      if (toRemove.length > 0) {
        toast("Success", { description: toRemove.length === 1 ? "Favorite removed" : "Favorites removed" });
      }
    })
    .catch((error) => {
      console.error('Error updating favorites:', error);

      // Rollback optimistic update on error
      queryClient.setQueryData(["favorites"], originalFavorites);
      setLocalFavorites(originalFavorites);
      const message = error instanceof Error ? error.message : 'Failed to update favorites';
      if (/rate limit/i.test(message) || /429/.test(message)) {
        toast('Rate Limit Exceeded', { description: 'Please slow down. Try again later' });
      } else {
        toast('Favorites error', { description: message });
      }
      setIsMutating(false);
    });
  };

  if (!hasSelection) return null;

  const content = (
    <div
      className="fixed inset-x-0 flex items-center justify-center px-4"
      style={{ bottom: `calc(24px + env(safe-area-inset-bottom))` }}
      aria-live="polite"
      role="region"
      aria-label="Selection actions"
    >
      <div
        className={cn(
          "z-[var(--z-island)] flex w-auto items-center gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur transition-all duration-200 motion-reduce:transition-none",
          "supports-[backdrop-filter]:bg-background/60",
        )}
      >
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          onClick={handleFavorite}
          aria-disabled={isMutating}
          aria-label="Toggle favorite status"
        >
          <Star
            className={`h-4 w-4 ${
              favoriteStatus.shouldRemove
                ? 'fill-yellow-400 text-yellow-400'
                : ''
            }`}
          />
          <span>
            {favoriteStatus.shouldRemove
              ? 'Favorited'
              : 'Favorite'
            }
          </span>
        </Button>
        {canCompare ? (
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 disabled:opacity-100 disabled:text-muted-foreground"
            aria-label="Compare selected"
          >
            <GitCompare className="h-4 w-4" />
            <span>Compare</span>
          </Button>
        ) : (
          <HoverCard>
            <HoverCardTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 disabled:opacity-100 disabled:text-muted-foreground"
                  disabled
                  aria-label="Select at least 2 to compare"
                >
                  <GitCompare className="h-4 w-4" />
                  <span>Compare</span>
                </Button>
              </span>
            </HoverCardTrigger>
          <HoverCardContent side="top" align="center" sideOffset={16} className="z-[var(--z-tooltip)] text-xs w-auto whitespace-nowrap p-2">
            Select at least 2 to compare
          </HoverCardContent>
          </HoverCard>
        )}
        <Button size="sm" variant="secondary" className="gap-2 disabled:opacity-100 disabled:text-muted-foreground" aria-label="Deploy selected">
          <Rocket className="h-4 w-4" />
          <span>Deploy</span>
        </Button>
        
      </div>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}



