"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { Button } from "@/components/ui/button";
import { Star, GitCompare, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { ColumnSchema } from "@/components/infinite-table/schema";

export function CheckedActionsIsland() {
  const { checkedRows } = useDataTable<ColumnSchema, unknown>();

  const hasSelection = React.useMemo(() => {
    for (const _ in checkedRows) return true;
    return false;
  }, [checkedRows]);

  const canCompare = React.useMemo(() => {
    let count = 0;
    for (const _ in checkedRows) {
      count++;
      if (count >= 2) return true;
    }
    return false;
  }, [checkedRows]);

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
        <Button size="sm" variant="secondary" className="gap-2 disabled:opacity-100 disabled:text-muted-foreground" aria-label="Favorite selected">
          <Star className="h-4 w-4" />
          <span>Favorite</span>
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


