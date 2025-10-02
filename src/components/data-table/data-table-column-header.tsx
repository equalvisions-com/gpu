import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> extends ButtonProps {
  column: Column<TData, TValue>;
  title: string;
  centerTitle?: boolean;
  titleClassName?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  centerTitle,
  titleClassName,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className, centerTitle && "text-center", titleClassName)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        column.toggleSorting(undefined);
      }}
      className={cn(
        "py-0 px-0 h-7 hover:bg-transparent flex gap-2 items-center w-full",
        centerTitle ? "relative justify-center" : "justify-between",
        className
      )}
      {...props}
    >
      <span className={cn(centerTitle && "pointer-events-none", titleClassName)}>{title}</span>
      <span className={cn("flex flex-col", centerTitle && "absolute right-0 top-1/2 -translate-y-1/2") }>
        <ChevronUp
          className={cn(
            "-mb-0.5 h-3 w-3",
            column.getIsSorted() === "asc"
              ? "text-accent-foreground"
              : "text-muted-foreground"
          )}
        />
        <ChevronDown
          className={cn(
            "-mt-0.5 h-3 w-3",
            column.getIsSorted() === "desc"
              ? "text-accent-foreground"
              : "text-muted-foreground"
          )}
        />
      </span>
    </Button>
  );
}
