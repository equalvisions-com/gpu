"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LayoutDashboard, Server, BookOpen, HelpCircle, Settings as SettingsIcon, LogIn, User as UserIcon } from "lucide-react";
import { useIsAuthenticated } from "@/components/session-provider";
import type { LucideIcon } from "lucide-react";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon?: LucideIcon;
}

function SidebarLink({ href, label, icon: Icon }: SidebarLinkProps) {
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
  const isAuthenticated = useIsAuthenticated();
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
                  <SidebarLink href="/" label="GPUs" />
                  <SidebarLink href="/cpus" label="CPUs" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="space-y-1">
          <SidebarLink href="/providers" label="Providers" icon={Server} />
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
          User
        </div>
        <div className="space-y-1">
          {isAuthenticated ? (
            <SidebarLink href="/account" label="Account" icon={UserIcon} />
          ) : (
            <SidebarLink href="/signin" label="Sign in" icon={LogIn} />
          )}
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


