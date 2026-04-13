"use client"

import { useState } from "react"
import { ArrowLeft, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TabBar } from "@/components/match/tab-bar"
import { InfoTab } from "@/components/match/info-tab"
import { VoteTab } from "@/components/match/vote-tab"
import { TacticsTab } from "@/components/match/tactics-tab"
import { RecordTab } from "@/components/match/record-tab"
import { DiaryTab } from "@/components/match/diary-tab"

export type TabType = "정보" | "투표" | "전술" | "기록" | "일지"

export default function MatchDetailPage() {
  const [activeTab, setActiveTab] = useState<TabType>("정보")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
            aria-label="경기 일정으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only sm:not-sr-only font-medium">경기 일정</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight">경기 상세</h1>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            aria-label="더보기"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <main className="max-w-lg mx-auto pb-8">
        <div role="tabpanel" aria-label={`${activeTab} 탭 내용`}>
          {activeTab === "정보" && <InfoTab />}
          {activeTab === "투표" && <VoteTab />}
          {activeTab === "전술" && <TacticsTab />}
          {activeTab === "기록" && <RecordTab />}
          {activeTab === "일지" && <DiaryTab />}
        </div>
      </main>
    </div>
  )
}
