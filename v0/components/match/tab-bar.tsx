"use client"

import type { TabType } from "@/app/page"
import { cn } from "@/lib/utils"

const tabs: { id: TabType; label: string }[] = [
  { id: "정보", label: "정보" },
  { id: "투표", label: "투표" },
  { id: "전술", label: "전술" },
  { id: "기록", label: "기록" },
  { id: "일지", label: "일지" },
]

interface TabBarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav 
      className="sticky top-14 z-40 bg-background/90 glass border-b border-border/50"
      role="tablist"
      aria-label="경기 상세 탭"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 py-3.5 text-center font-medium transition-all min-h-[48px] relative",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <span className={cn(
                "relative z-10 text-sm tracking-wide",
                activeTab === tab.id && "font-semibold"
              )}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-primary rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
