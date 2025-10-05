import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";
import { DataTableFilterControls } from "./data-table-filter-controls";
import { useHotKey } from "@/hooks/use-hot-key";
import React from "react";

export function DataTableFilterControlsDrawer() {
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);

  useHotKey(() => {
    triggerButtonRef.current?.click();
  }, "b");

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          ref={triggerButtonRef}
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-transparent"
          aria-label="Toggle controls (Cmd+B)"
          title="Toggle controls (Cmd+B)"
        >
          <FilterIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[calc(100dvh-4rem)]">
        <VisuallyHidden>
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Adjust your table filters</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden>
        <div className="px-4 flex-1 overflow-y-auto">
          <DataTableFilterControls />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
