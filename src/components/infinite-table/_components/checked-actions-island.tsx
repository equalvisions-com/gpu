"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { Button } from "@/components/ui/button";
import { Star, GitCompare, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
// No Sonner toasts for favorites flows; use inline notice instead
import { useEphemeralNotice } from "@/hooks/use-ephemeral-notice";
import { FavoritesNotice } from "./favorites-notice";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnSchema } from "@/components/infinite-table/schema";
import type { FavoriteKey } from "@/types/favorites";
import { stableGpuKey } from "@/components/infinite-table/stable-key";
import { 
  FAVORITES_QUERY_KEY, 
  FAVORITES_BROADCAST_CHANNEL,
} from "@/lib/favorites/constants";
import { 
  getFavorites,
  addFavorites,
  removeFavorites,
  FavoritesAPIError
} from "@/lib/favorites/api-client";

export function CheckedActionsIsland({ initialFavoriteKeys }: { initialFavoriteKeys?: FavoriteKey[] }) {
  const { checkedRows, table, toggleCheckedRow } = useDataTable<ColumnSchema, unknown>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const isMountedRef = React.useRef(true);
  const { message: favoritesNotice, isOpen: isFavoritesOpen, show: showFavoritesNotice } = useEphemeralNotice(1600);
  const [noticeVariant, setNoticeVariant] = React.useState<"success" | "error">("success");

  // Cleanup flag (other timers are handled in the hook)
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only show and fetch favorites when the user actually selects rows
  const hasSelection = React.useMemo(() => {
    for (const _ in checkedRows) return true;
    return false;
  }, [checkedRows]);

  /**
   * Fetch favorites when needed: no SSR cache + user selects row
   * Uses centralized API client with timeout and error handling
   */
  const { data: favorites = [] } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: getFavorites,
    staleTime: Infinity,
    // Only fetch if no SSR cache AND user has selection (avoids flicker when cache exists)
    enabled: !initialFavoriteKeys && hasSelection,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  /**
   * Initialize query cache with SSR data for optimistic updates to work
   * Only initializes if cache is empty to prevent overwriting optimistic updates
   */
  React.useEffect(() => {
    const existingData = queryClient.getQueryData<FavoriteKey[]>(FAVORITES_QUERY_KEY);
    if (!existingData && initialFavoriteKeys) {
      queryClient.setQueryData(FAVORITES_QUERY_KEY, initialFavoriteKeys);
    }
  }, [initialFavoriteKeys, queryClient]);

  // Local optimistic snapshot to ensure instant UI even if a fetch is in flight
  const [localFavorites, setLocalFavorites] = React.useState<FavoriteKey[] | undefined>(initialFavoriteKeys);
  const prevFavoritesRef = React.useRef<string>('');
  React.useEffect(() => {
    if (Array.isArray(favorites)) {
      const favoritesArray = favorites as FavoriteKey[];
      const favoritesString = JSON.stringify(favoritesArray);
      // Only update if the arrays are actually different to prevent infinite loops
      if (prevFavoritesRef.current !== favoritesString) {
        setLocalFavorites(favoritesArray);
        prevFavoritesRef.current = favoritesString;
      }
    }
  }, [favorites]);

  /**
   * Initialize BroadcastChannel for cross-tab synchronization
   * Receives favorites data directly from other tabs (no API call)
   * This optimizes multi-tab scenarios by avoiding redundant server requests
   */
  React.useEffect(() => {
    const bc = new BroadcastChannel(FAVORITES_BROADCAST_CHANNEL);
    bcRef.current = bc;
    
    // Listen for updates from other tabs - receive data directly (no API call)
    bc.onmessage = (event) => {
      if (event.data?.type === "updated" && Array.isArray(event.data?.favorites)) {
        const newFavorites = event.data.favorites as FavoriteKey[];
        queryClient.setQueryData(FAVORITES_QUERY_KEY, newFavorites);
        setLocalFavorites(newFavorites);
      }
    };
    
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [queryClient]);

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

  /**
   * Handles favorite/unfavorite action for selected rows
   * Implements optimistic updates with automatic rollback on error
   * Broadcasts changes to other tabs for real-time sync
   */
  const handleFavorite = async () => {
    if (!hasSelection) return;
    if (isMutating) return;
    setIsMutating(true);

    const { toAdd, toRemove } = favoriteStatus;

    // Store original state for potential rollback
    const snapshot = (queryClient.getQueryData(FAVORITES_QUERY_KEY) as FavoriteKey[] | undefined)
      ?? (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : undefined)
      ?? (initialFavoriteKeys || []);
    const originalFavorites = [...snapshot];

    // Immediately update UI with optimistic state (no loading state)
    const current = (localFavorites ?? (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : []) ?? []);
    
    // Cancel any in-flight fetch to prevent overwriting optimistic state
    try { 
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY }); 
    } catch {}

    const optimisticFavorites = [
      ...current.filter((uuid) => !toRemove.includes(uuid as FavoriteKey)), // Remove items
      ...toAdd // Add items
    ];

    queryClient.setQueryData(FAVORITES_QUERY_KEY, optimisticFavorites);
    setLocalFavorites(optimisticFavorites);

    // Perform API calls in background using centralized API client with timeout
    try {
      // Execute mutations in parallel
      await Promise.all([
        toAdd.length > 0 ? addFavorites(toAdd) : Promise.resolve(),
        toRemove.length > 0 ? removeFavorites(toRemove) : Promise.resolve(),
      ]);

      // Success - notify other tabs with the updated data (no need for them to refetch)
      try { 
        bcRef.current?.postMessage({ 
          type: "updated", 
          favorites: optimisticFavorites 
        }); 
      } catch {}

      if (isMountedRef.current) {
        setIsMutating(false);
      }

      // Inline success notice rendered within the island (shares centering context)
      setNoticeVariant("success");
      if (toAdd.length > 0) {
        showFavoritesNotice("Successfully added to favorites");
      } else if (toRemove.length > 0) {
        showFavoritesNotice("Successfully removed from favorites");
      }
    } catch (error) {
      logger.warn('[handleFavorite] Mutation failed', {
        toAddCount: toAdd.length,
        toRemoveCount: toRemove.length,
        error: error instanceof Error ? error.message : String(error),
      });

      // Rollback optimistic update on error
      queryClient.setQueryData(FAVORITES_QUERY_KEY, originalFavorites);
      setLocalFavorites(originalFavorites);
      
      if (isMountedRef.current) {
        setIsMutating(false);
        
        // Handle specific error types with lightweight inline-styled toasts (no global favorites styling)
        if (error instanceof FavoritesAPIError) {
          if (error.status === 401) {
            router.push("/signin");
            return;
          }
          
          if (error.code === "RATE_LIMIT") {
            setNoticeVariant("error");
            showFavoritesNotice('Rate limit exceeded. Try again later');
            return;
          }
          
          if (error.code === "TIMEOUT") {
            setNoticeVariant("error");
            showFavoritesNotice('Server took too long. Please try again.');
            return;
          }
          
          setNoticeVariant("error");
          showFavoritesNotice(error.message);
        } else {
          setNoticeVariant("error");
          showFavoritesNotice('Failed to update favorites');
        }
      }
    }
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
      <FavoritesNotice message={favoritesNotice} open={isFavoritesOpen} variant={noticeVariant} />
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



