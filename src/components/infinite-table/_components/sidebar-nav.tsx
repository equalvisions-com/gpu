"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LayoutDashboard, Server, BookOpen, HelpCircle, Settings as SettingsIcon, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarLinkProps {
  href?: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
}

function SidebarLink({ href, label, icon: Icon, onClick }: SidebarLinkProps) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left",
        )}
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </button>
    );
  }

  if (!href) {
    return null; // If no href and no onClick, don't render anything
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarNav() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFavoritesClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('favorites', 'true');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleGPUsClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('favorites'); // Remove favorites filter when going to main view
    router.push(params.toString() ? `?${params.toString()}` : '/', { scroll: false });
  };

  return (
    <nav className="space-y-3">
      <div className="space-y-1">
        <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </div>
        <Accordion type="single" collapsible defaultValue="overview" className="space-y-0">
          <AccordionItem value="overview" className="border-b-0">
            <AccordionTrigger className="px-2 py-2 text-sm hover:no-underline rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
                <span>Overview</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="relative mt-1 pl-[25px]">
                <span aria-hidden className="pointer-events-none absolute left-[15px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-1">
                  <SidebarLink label="GPUs" onClick={handleGPUsClick} />
                  <SidebarLink href="/cpus" label="CPUs" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="space-y-1">
          <SidebarLink href="/providers" label="Providers" icon={Server} />
          <SidebarLink label="Favorites" icon={Star} onClick={handleFavoritesClick} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resources
        </div>
        <div className="space-y-1">
          <SidebarLink href="/docs" label="Documentation" icon={BookOpen} />
          <SidebarLink href="/help" label="Support" icon={HelpCircle} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </div>
        <div className="space-y-1">
          <SidebarLink href="/settings" label="Settings" icon={SettingsIcon} />
        </div>
      </div>
    </nav>
  );
}

export default SidebarNav;


