"use client";

import { memo, useMemo } from "react";
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
  /** 외부에서 결정한 active href — 여러 SidebarNav 인스턴스가 그룹별로
   * 분리될 때 그룹 간 가장 긴 prefix 비교가 안 되는 버그(예: /settings/animations
   * 진입 시 '전술 영상'과 '설정' 동시 active)를 막기 위해 부모가 평탄화로 계산해 전달. */
  activeHref?: string | null;
};

function SidebarNav({ items, activeHref: externalActiveHref }: SidebarNavProps) {
  const pathname = usePathname();

  // 외부 activeHref 있으면 우선. 없을 때만 내부에서 자기 items 기준 가장 긴 prefix.
  const internalActiveHref = useMemo(() => {
    const matches = items.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.href.length - a.href.length);
    return matches[0].href;
  }, [pathname, items]);
  const activeHref = externalActiveHref !== undefined ? externalActiveHref : internalActiveHref;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between h-auto py-2.5 px-3",
              isActive
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}
            asChild
          >
            <Link href={item.href}>
              <span className="flex items-center gap-2.5">
                {item.icon && <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />}
                <span className="flex flex-col items-start">
                <span className="font-semibold text-sm">{item.label}</span>
                {item.detail && (
                  <span className={cn("text-xs", isActive ? "text-primary/80" : "text-muted-foreground")}>
                    {item.detail}
                  </span>
                )}
                </span>
              </span>
              {isActive ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150" />
              )}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export default memo(SidebarNav);
