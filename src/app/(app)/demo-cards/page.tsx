"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlayerCardDemo } from "@/components/pitchmaster/PlayerCard";
import { SeasonAwardsDemo } from "@/components/pitchmaster/SeasonAwardsPage";
import { PlayerProfileDemo } from "@/components/pitchmaster/PlayerProfilePage";
import { ShareCardDemo } from "@/components/pitchmaster/ShareCard";

/**
 * v0 디자인 이식 후 dev 확인용 데모 페이지.
 * 실제 데이터 연결은 Phase 2 이후에서 진행.
 * 접근 경로: 더보기 페이지 → "카드 디자인 데모" 메뉴
 */

type DemoTab = "cards" | "awards" | "profile" | "share";

export default function PitchMasterCardDemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>("cards");

  const tabs: { key: DemoTab; label: string; description: string }[] = [
    { key: "cards", label: "플레이어 카드", description: "EA FC 스타일 선수 카드 4종(ICON/HERO/RARE/COMMON)" },
    { key: "awards", label: "시즌 어워드", description: "시즌 시상식 페이지 — MVP 슈퍼 카드 + 7종 시상" },
    { key: "profile", label: "커리어 프로필", description: "선수 공개 프로필 — 히어로/다이제스트/베스트 모먼트/타임라인" },
    { key: "share", label: "공유 카드", description: "인스타 스토리(1080×1920) / 정사각(1080×1080) / OG(1200×630)" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] -mx-4 sm:-mx-6">
      {/* Dev 경고 배너 */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center">
        <p className="text-[11px] text-yellow-200">
          🚧 <strong>카드 디자인 데모</strong> — v0에서 이식한 UI, mock 데이터. 실제 데이터 연결은 미진행
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="sticky top-0 z-40 bg-[hsl(240,6%,6%)]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 sm:gap-2 h-14 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-[hsl(16,85%,58%)] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Description */}
      <div className="bg-[hsl(240,5%,8%)] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-xs sm:text-sm text-white/50">
            {tabs.find((t) => t.key === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Content */}
      <main>
        {activeTab === "cards" && <PlayerCardDemo />}
        {activeTab === "awards" && <SeasonAwardsDemo />}
        {activeTab === "profile" && <PlayerProfileDemo />}
        {activeTab === "share" && <ShareCardDemo />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] tracking-[0.3em] text-white/30 mb-1">PITCHMASTER</p>
          <p className="text-xs text-white/20">v0 이식 — 디자인 검증용 데모</p>
        </div>
      </footer>
    </div>
  );
}
