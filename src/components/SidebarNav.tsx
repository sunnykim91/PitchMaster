"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
};

type SidebarNavProps = {
  items: NavItem[];
};

export default function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between h-auto py-2.5 px-3 relative",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                : "hover:translate-x-0.5"
            )}
            asChild
          >
            <Link href={item.href}>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
              )}
              <span className="flex items-center gap-2.5">
                {item.icon && <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />}
                <span className="flex flex-col items-start">
                <span className="font-semibold text-sm">{item.label}</span>
                {item.detail && (
                  <span className={cn("text-[11px]", isActive ? "text-primary/80" : "text-muted-foreground")}>
                    {item.detail}
                  </span>
                )}
                </span>
              </span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-150", isActive ? "text-primary" : "text-muted-foreground")} />
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
