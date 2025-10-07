"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FavoritesNoticeProps = {
  message?: string | null;
  open?: boolean;
  className?: string;
  variant?: "success" | "error";
};

// Neutral styling used for all notices to match existing success style exactly
const BASE_NOTICE_CLASS =
  "absolute -top-10 z-[var(--z-island)] inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground shadow-md";

export function FavoritesNotice({ message, open, className, variant = "success" }: FavoritesNoticeProps) {
  if (!open || !message) return null;
  return (
    <div
      className={cn(BASE_NOTICE_CLASS, className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-variant={variant}
    >
      {message}
    </div>
  );
}


