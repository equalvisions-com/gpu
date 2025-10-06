"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        // Neutral styling that adapts to light/dark without colored variants
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-muted group-[.toast]:text-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
