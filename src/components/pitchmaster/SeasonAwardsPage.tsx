"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlayerCard, type PlayerCardProps } from "./PlayerCard";

// Types
// name/value는 대부분의 award에는 필수지만 bestMatch는 opponent/score로 대체되므로 optional
// (AwardCard 렌더링이 `award.name || award.opponent` 로 fallback하고 score를 별도 사용)
export type Award = {
  label: string;
  name?: string;
  value?: number | string;
  context?: string;
  cleanSheets?: number;
  winRate?: number;
  date?: string;
  opponent?: string;
  score?: string;
};

export type SeasonAwardsResponse = {
  seasonName: string;
  teamName: string;
  totalMatches: number;
  record: { wins: number; draws: number; losses: number };
  mvp?: {
    name: string;
    playerCardProps: PlayerCardProps;
    signature: string;
    keyStats: Array<{ label: string; value: string }>;
  };
  awards: {
    topScorer?: Award;
    topAssist?: Award;
    topMvp?: Award;
    topAttendance?: Award;
    ironWall?: Award;
    luckyCharm?: Award;
    bestMatch?: Award;
  };
  seasonSummary?: string;
};

// Trophy/Medal SVG Icons
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M20 8h24v8c0 8-4 14-12 16-8-2-12-8-12-16V8z" fill="currentColor" fillOpacity="0.2" />
      <path d="M20 8h24v8c0 8-4 14-12 16-8-2-12-8-12-16V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12H8c0 8 4 12 8 12v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 12h8c0 8-4 12-8 12v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 36h12v4H26z" fill="currentColor" fillOpacity="0.3" />
      <path d="M24 40h16v4c0 2-2 4-4 4H28c-2 0-4-2-4-4v-4z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="18" r="4" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

function MedalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M24 8l8 16 8-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="38" r="16" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="38" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M32 30v16M24 38h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M32 8l6 14h15l-12 10 5 16-14-10-14 10 5-16-12-10h15l6-14z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M20 32l8 8 16-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M32 8L12 16v16c0 12 8 20 20 24 12-4 20-12 20-24V16L32 8z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M32 20v20M24 32h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M32 32c-8-4-16-2-20 4 6 1 12 4 14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 32c8-4 16-2 20 4-6 1-12 4-14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="24" r="8" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
      <path d="M28 22l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <rect x="12" y="12" width="40" height="40" rx="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M20 28h24M32 20v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.5" />
      <circle cx="40" cy="40" r="3" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

// Award Card Configuration
const awardConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string; gradient: string }> = {
  topScorer: {
    icon: TrophyIcon,
    color: "text-yellow-400",
    gradient: "from-yellow-500/20 to-yellow-900/10",
  },
  topAssist: {
    icon: MedalIcon,
    color: "text-gray-300",
    gradient: "from-gray-400/20 to-gray-700/10",
  },
  topMvp: {
    icon: StarIcon,
    color: "text-[hsl(16,85%,58%)]",
    gradient: "from-orange-500/20 to-orange-900/10",
  },
  topAttendance: {
    icon: CheckCircleIcon,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-teal-900/10",
  },
  ironWall: {
    icon: ShieldIcon,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-900/10",
  },
  luckyCharm: {
    icon: WingsIcon,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-pink-900/10",
  },
  bestMatch: {
    icon: ScoreCardIcon,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-900/10",
  },
};

// Award Card Component
function AwardCard({ awardKey, award, featured = false }: { awardKey: string; award: Award; featured?: boolean }) {
  const config = awardConfig[awardKey] || awardConfig.topScorer;
  const IconComponent = config.icon;

  const displayValue = awardKey === "bestMatch"
    ? award.score
    : typeof award.value === "number"
      ? award.value
      : award.value;

  const displayUnit = awardKey === "topScorer" ? "골"
    : awardKey === "topAssist" ? "어시"
    : awardKey === "topMvp" ? "회"
    : awardKey === "topAttendance" ? ""
    : awardKey === "ironWall" ? "클린시트"
    : awardKey === "luckyCharm" ? ""
    : "";

  return (
    <div
      className={cn(
        "group relative bg-[hsl(240,5%,10%)] rounded-2xl border border-white/10",
        "hover:border-white/20 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg",
        featured ? "p-6 sm:p-8" : "p-4",
      )}
    >
      {/* Background Gradient */}
      <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br", config.gradient, featured ? "opacity-70" : "opacity-50")} />

      <div className={cn("relative", featured && "flex items-center gap-6")}>
        {/* Icon */}
        <div className={cn(featured ? "shrink-0" : "mb-3")}>
          <IconComponent className={cn(
            "transition-transform group-hover:rotate-6",
            config.color,
            featured ? "w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" : "w-12 h-12"
          )} />
        </div>

        <div className={cn(featured && "flex-1 min-w-0")}>
          {/* Label */}
          <p className={cn(
            "font-medium mb-1",
            config.color,
            featured ? "text-sm tracking-[0.2em] uppercase" : "text-xs"
          )}>
            {award.label}
            {featured && " · 시즌 1위"}
          </p>

          {/* Name */}
          <h3 className={cn(
            "font-bold text-white mb-2 truncate",
            featured ? "text-2xl sm:text-3xl" : "text-lg"
          )}>
            {award.name || `${award.opponent}`}
          </h3>

          {/* Value */}
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "font-black text-white",
              featured ? "text-5xl sm:text-6xl drop-shadow-lg" : "text-3xl"
            )}>{displayValue}</span>
            {displayUnit && (
              <span className={cn("text-white/60", featured ? "text-base sm:text-lg ml-1" : "text-sm")}>
                {displayUnit}
              </span>
            )}
          </div>

          {/* Context */}
          {award.context && (
            <span className={cn(
              "inline-block mt-2 px-2 py-0.5 rounded bg-white/10 text-white/70",
              featured ? "text-xs" : "text-[10px]"
            )}>
              {award.context}
            </span>
          )}

          {/* Extra info for specific awards */}
          {awardKey === "ironWall" && award.cleanSheets && (
            <>
              <p className="text-xs text-white/50 mt-1">클린시트 {award.cleanSheets}회</p>
              <p className="text-[10px] text-white/40 mt-0.5">출전 경기 중 상대 무실점 경기 수</p>
            </>
          )}
          {awardKey === "luckyCharm" && award.winRate && (
            <>
              <p className="text-xs text-white/50 mt-1">승률 {Math.round(award.winRate * 100)}%</p>
              <p className="text-[10px] text-white/40 mt-0.5">5경기 이상 출전 선수 중 최고 승률</p>
            </>
          )}
          {awardKey === "bestMatch" && award.date && (
            <p className="text-xs text-white/50 mt-1">{award.date}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Season Selector Component
function SeasonSelector({ 
  seasons, 
  current, 
  onChange 
}: { 
  seasons: string[]; 
  current: string; 
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[hsl(240,5%,12%)] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(16,85%,58%)]"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

// Main Season Awards Page Component
export function SeasonAwardsPage({ data }: { data: SeasonAwardsResponse }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const { seasonName, teamName, totalMatches, record, mvp, awards, seasonSummary } = data;
  const winRate = totalMatches > 0 ? Math.round((record.wins / totalMatches) * 100) : 0;

  const awardEntries = Object.entries(awards).filter(([_, v]) => v !== undefined) as [string, Award][];

  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] relative">
      {/* Background Effects */}
      <div className="fixed inset-0 stadium-pattern opacity-20 pointer-events-none" />
      <div className="fixed inset-0 vignette pointer-events-none" />

      {/* Season Selector */}
      <div className="sticky top-0 z-50 bg-[hsl(240,6%,6%)]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs tracking-[0.2em] text-white/40">PITCHMASTER</span>
          <SeasonSelector 
            seasons={["2026 시즌", "2025 시즌", "2024 시즌"]} 
            current={seasonName} 
            onChange={() => {}} 
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro Sequence */}
        <section className="text-center py-16 sm:py-24">
          <p className="text-[10px] tracking-[0.5em] text-white/30 mb-4">PITCHMASTER PRESENTS</p>
          
          <div className="mb-6">
            <p className="text-lg text-[hsl(16,85%,58%)] font-medium mb-2">{seasonName}</p>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">{teamName}</h1>
          </div>

          <div className="relative inline-block">
            <h2 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-400 tracking-tight">
              THE SEASON
            </h2>
            <h2 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[hsl(16,85%,58%)] to-yellow-500 tracking-tight">
              AWARDS
            </h2>
            {/* Gold particles */}
            <div className="absolute -top-4 -right-4 w-2 h-2 bg-yellow-400 rounded-full sparkle" />
            <div className="absolute top-1/2 -left-6 w-1.5 h-1.5 bg-yellow-400 rounded-full sparkle" style={{ animationDelay: "0.5s" }} />
            <div className="absolute -bottom-2 right-1/4 w-1 h-1 bg-yellow-400 rounded-full sparkle" style={{ animationDelay: "1s" }} />
          </div>

          <p className="text-sm text-white/50 mt-6">
            총 {totalMatches}경기 · {record.wins}승 {record.draws}무 {record.losses}패 · 승률 {winRate}%
          </p>
        </section>

        {/* MVP Super Card */}
        {mvp && (
          <section className="mb-16">
            {/* 외곽 wrapper — 글로우 blur가 안전하게 빠져나갈 수 있도록 overflow 허용 */}
            <div className="relative">
              {/* Background glow (외곽 박스 밖으로 살짝 흘러도 됨) */}
              <div className="absolute -top-8 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* 본 컨테이너 */}
              <div className="relative bg-gradient-to-br from-yellow-500/10 via-[hsl(240,5%,10%)] to-yellow-500/5 rounded-3xl p-5 sm:p-8 border border-yellow-500/20 glow-gold">
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                  {/* Compact Player Card — 모바일/데스크탑 너비 분리 */}
                  <div className="w-full max-w-[260px] sm:max-w-[280px] shrink-0">
                    <PlayerCard {...mvp.playerCardProps} />
                  </div>

                {/* MVP Info */}
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-[10px] tracking-[0.3em] text-yellow-400/80 mb-2">
                    ★ {seasonName} MVP ★
                  </p>
                  <h2 className="text-4xl sm:text-5xl font-black text-white text-glow-gold mb-3">
                    {mvp.name}
                  </h2>
                  <p className="text-base text-white/70 mb-6">{mvp.signature}</p>

                  {/* Key Stats */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    {mvp.keyStats.map((stat, i) => (
                      <div key={i} className="text-center px-4 py-2 bg-white/5 rounded-xl">
                        <p className="text-2xl font-black text-yellow-400">{stat.value}</p>
                        <p className="text-xs text-white/50">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Season Record Recap */}
        <section className="mb-16">
          <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">시즌 성과 리캡</h3>
            
            {/* W/D/L Display */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <span className="text-4xl sm:text-5xl font-black text-[hsl(152,55%,55%)]">{record.wins}</span>
                <span className="text-lg font-bold text-[hsl(152,55%,55%)]">W</span>
              </div>
              <div className="text-center">
                <span className="text-4xl sm:text-5xl font-black text-[hsl(38,85%,58%)]">{record.draws}</span>
                <span className="text-lg font-bold text-[hsl(38,85%,58%)]">D</span>
              </div>
              <div className="text-center">
                <span className="text-4xl sm:text-5xl font-black text-[hsl(0,65%,60%)]">{record.losses}</span>
                <span className="text-lg font-bold text-[hsl(0,65%,60%)]">L</span>
              </div>
            </div>

            {/* Best Match Highlight */}
            {awards.bestMatch && (
              <div className="flex items-center justify-center gap-2 text-sm text-white/70 mb-4">
                <span className="text-white/50">가장 큰 승리:</span>
                <span className="font-semibold text-white">vs {awards.bestMatch.opponent} {awards.bestMatch.score}</span>
              </div>
            )}

            {/* Top Scorer Mention */}
            {awards.topScorer && (
              <div className="flex items-center justify-center gap-2 text-sm text-white/70 mb-4">
                <span className="text-white/50">가장 많은 득점:</span>
                <span className="font-semibold text-white">{awards.topScorer.name} {awards.topScorer.value}골</span>
              </div>
            )}

            {/* Season Summary */}
            {seasonSummary && (
              <p className="text-center text-white/60 italic border-t border-white/10 pt-4 mt-4">
                &ldquo;{seasonSummary}&rdquo;
              </p>
            )}
          </div>
        </section>

        {/* Awards Gallery — 1순위(첫 항목)을 더 크게 강조 */}
        <section className="mb-16">
          <h3 className="text-lg font-bold text-white mb-6 text-center">시즌 어워드</h3>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {awardEntries.map(([key, award], idx) => (
              <div
                key={key}
                className={cn(idx === 0 && "col-span-2 lg:col-span-3 lg:row-span-1")}
              >
                <AwardCard awardKey={key} award={award} featured={idx === 0} />
              </div>
            ))}
          </div>
        </section>

        {/* Share CTA */}
        <section className="text-center py-8">
          <div className="bg-gradient-to-r from-[hsl(16,85%,58%)]/20 via-[hsl(240,5%,10%)] to-[hsl(16,85%,58%)]/20 rounded-2xl p-8 border border-[hsl(16,85%,58%)]/30">
            <h3 className="text-xl font-bold text-white mb-2">이 시즌을 하나의 이미지로</h3>
            <p className="text-sm text-white/50 mb-6">인스타 스토리, 카톡으로 공유하세요</p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-3 rounded-xl bg-[hsl(16,85%,58%)] text-white font-medium hover:bg-[hsl(16,85%,50%)] transition-colors"
              >
                스토리로 공유
              </button>
              <button className="px-6 py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/5 transition-colors">
                이미지 저장
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-white/5">
          <p className="text-[10px] tracking-[0.3em] text-white/30">PITCHMASTER</p>
          <p className="text-xs text-white/20 mt-1">pitch-master.app</p>
        </footer>
      </div>

      {/* Share Modal Placeholder */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-white mb-4">공유하기</h4>
            <p className="text-sm text-white/60 mb-4">ShareCard 컴포넌트가 여기에 렌더링됩니다</p>
            <button onClick={() => setShowShareModal(false)} className="w-full py-2 rounded-lg bg-white/10 text-white text-sm">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Empty State Component
export function SeasonAwardsEmpty({ teamName }: { teamName: string }) {
  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
          <TrophyIcon className="w-12 h-12 text-white/20" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{teamName}</h2>
        <p className="text-white/50">아직 집계된 경기가 없어요</p>
        <p className="text-xs text-white/30 mt-1">첫 경기 후 시상 결과가 집계됩니다</p>
      </div>
    </div>
  );
}

// Demo with Mock Data
export function SeasonAwardsDemo() {
  const mockData: SeasonAwardsResponse = {
    seasonName: "2026 시즌",
    teamName: "FC 피치마스터",
    totalMatches: 20,
    record: { wins: 12, draws: 3, losses: 5 },
    mvp: {
      name: "김민수",
      playerCardProps: {
        ovr: 92,
        rarity: "ICON",
        positionLabel: "FW",
        positionCategory: "FW",
        playerName: "김민수",
        jerseyNumber: 10,
        teamName: "FC 피치마스터",
        teamPrimaryColor: "#e8613a",
        seasonName: "2026 시즌",
        signature: "15골 8어시 — 시즌 MVP",
        stats: [
          { label: "골", value: "15", rank: "팀 1위", badge: "trophy", isHero: true },
          { label: "어시", value: "8", rank: "팀 2위" },
          { label: "MOM", value: "5" },
          { label: "출석률", value: "95%" },
          { label: "승률", value: "78%" },
          { label: "경기", value: "19" },
        ],
      },
      signature: "15골 + 5 MOM — 이 시즌의 주인공",
      keyStats: [
        { label: "골", value: "15" },
        { label: "어시", value: "8" },
        { label: "MOM", value: "5" },
      ],
    },
    awards: {
      topScorer: { label: "득점왕", name: "김민수", value: 15, context: "전 시즌 대비 +5골" },
      topAssist: { label: "도움왕", name: "이준혁", value: 12, context: "팀 역대 1위" },
      topMvp: { label: "MOM", name: "김민수", value: 5 },
      topAttendance: { label: "출석왕", name: "박성진", value: "100%", context: "20경기 개근" },
      ironWall: { label: "철벽수비", name: "정우석", value: "0.6", cleanSheets: 8, context: "경기당 실점" },
      luckyCharm: { label: "승리요정", name: "최영호", value: "82%", winRate: 0.82, context: "출전 경기 승률" },
      bestMatch: { label: "베스트매치", date: "2026.05.15", opponent: "강남 FC", score: "7:1" },
    },
    seasonSummary: "우승 후보다운 시즌이었다",
  };

  return <SeasonAwardsPage data={mockData} />;
}

export default SeasonAwardsPage;
