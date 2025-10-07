"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Server, BookOpen, HelpCircle, Settings as SettingsIcon, Star, Cpu, Bot } from "lucide-react";
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
          "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors text-foreground hover:bg-muted/50 hover:text-accent-foreground w-full text-left",
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
        "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors text-foreground hover:bg-muted/50 hover:text-accent-foreground",
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
        <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Main
        </div>
        <div className="space-y-1">
          <SidebarLink label="GPUs" icon={Server} onClick={handleGPUsClick} />
          <SidebarLink href="/cpus" label="CPUs" icon={Cpu} />
          <SidebarLink href="/models" label="Models" icon={Bot} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Account
        </div>
        <div className="space-y-1">
          <SidebarLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <SidebarLink label="Favorites" icon={Star} onClick={handleFavoritesClick} />
          <SidebarLink href="/settings" label="Settings" icon={SettingsIcon} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resources
        </div>
        <div className="space-y-1">
          <SidebarLink href="/docs" label="Documentation" icon={BookOpen} />
          <SidebarLink href="/help" label="Support" icon={HelpCircle} />
        </div>
      </div>
    </nav>
  );
}

export default SidebarNav;


