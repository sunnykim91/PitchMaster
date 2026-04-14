"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlayerCard, type PlayerCardProps } from "./PlayerCard";

// Types
export type PlayerStats = {
  goals: number;
  assists: number;
  mvp: number;
  attended: number;
  totalMatches: number;
  attendanceRate: number;
  winRate: number;
  cleanSheets: number;
  attackPoints: number;
  goalsRank?: string;
  assistsRank?: string;
  attendanceStreak?: number;
  goalStreak?: number;
};

export type BestMoment = {
  kind: "bestMatch" | "firstGoal" | "streak";
  headline: string;
  detail: string;
  date: string;
};

export type RecentMatch = {
  date: string;
  opponent: string;
  score: string;
  result: "W" | "D" | "L";
  goals: number;
  assists: number;
  mvp: boolean;
  isHighlight: boolean;
};

export type PlayerProfile = {
  name: string;
  teamName: string;
  teamPrimaryColor: string;
  positions: string[];
  jerseyNumber: number | null;
  teamRole: "CAPTAIN" | "VICE_CAPTAIN" | null;
  seasonName: string;
  signature: string;
  playerCardProps: PlayerCardProps;
  stats: PlayerStats | null;
  bestMoments: BestMoment[];
  recentMatches: RecentMatch[];
};

// Role Badge Component
function RoleBadge({ role }: { role: "CAPTAIN" | "VICE_CAPTAIN" }) {
  const isCaption = role === "CAPTAIN";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold",
        isCaption
          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          : "bg-white/10 text-white/80 border border-white/20"
      )}
    >
      {isCaption ? "C" : "VC"}
      <span>{isCaption ? "주장" : "부주장"}</span>
    </span>
  );
}

// SVG Soccer Field Lines Pattern
function SoccerFieldPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.1]"
      viewBox="0 0 400 600"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Outer boundary */}
      <rect x="20" y="20" width="360" height="560" stroke="white" strokeWidth="2" fill="none" />
      {/* Center line */}
      <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeWidth="2" />
      {/* Center circle */}
      <circle cx="200" cy="300" r="60" stroke="white" strokeWidth="2" fill="none" />
      {/* Top penalty area */}
      <rect x="100" y="20" width="200" height="100" stroke="white" strokeWidth="2" fill="none" />
      {/* Top goal area */}
      <rect x="140" y="20" width="120" height="40" stroke="white" strokeWidth="2" fill="none" />
      {/* Top penalty arc */}
      <path d="M 140 120 Q 200 160 260 120" stroke="white" strokeWidth="2" fill="none" />
      {/* Bottom penalty area */}
      <rect x="100" y="480" width="200" height="100" stroke="white" strokeWidth="2" fill="none" />
      {/* Bottom goal area */}
      <rect x="140" y="540" width="120" height="40" stroke="white" strokeWidth="2" fill="none" />
      {/* Bottom penalty arc */}
      <path d="M 140 480 Q 200 440 260 480" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

// Circular Progress Component
function CircularProgress({
  value,
  label,
  color = "coral",
  size = 100,
}: {
  value: number;
  label: string;
  color?: "coral" | "teal" | "gold";
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClass = {
    coral: "stroke-[hsl(16,85%,58%)]",
    teal: "stroke-teal-400",
    gold: "stroke-yellow-400",
  }[color];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="fill-none stroke-white/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("fill-none transition-all duration-1000", colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-xs text-white/50 mt-2">{label}</span>
    </div>
  );
}

// Stat Bar Component
function StatBar({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/60 text-sm">{label}</span>
      <span className="font-bold text-white">{value}</span>
      {unit && <span className="text-white/40 text-sm">{unit}</span>}
    </div>
  );
}

// Context Chip
function ContextChip({ text, icon }: { text: string; icon?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-white/80">
      {icon && <span>{icon}</span>}
      {text}
    </span>
  );
}

// Best Moment Card Component
function BestMomentCard({ moment, index }: { moment: BestMoment; index: number }) {
  const gradients = [
    "from-[hsl(16,85%,58%)]/30 to-orange-900/20",
    "from-teal-500/30 to-teal-900/20",
    "from-yellow-500/30 to-yellow-900/20",
  ];

  const icons = {
    bestMatch: "🏆",
    firstGoal: "⚽",
    streak: "🔥",
  };

  const titles = {
    bestMatch: "베스트 경기",
    firstGoal: "시즌 첫 골",
    streak: "연속 기록",
  };

  // 카드별 포인트 컬러 (sparkle / 글로우용)
  const sparkleColors = [
    "bg-[hsl(16,85%,68%)] shadow-[0_0_6px_rgba(232,97,58,0.8)]", // bestMatch — coral
    "bg-teal-300 shadow-[0_0_6px_rgba(43,211,181,0.8)]",         // firstGoal — teal
    "bg-yellow-300 shadow-[0_0_6px_rgba(255,215,0,0.9)]",        // streak — gold
  ];
  const sparkleColor = sparkleColors[index % sparkleColors.length];

  return (
    <div
      className={cn(
        "relative bg-gradient-to-br rounded-2xl p-4 sm:p-5 border border-white/15 overflow-hidden",
        "min-h-[120px] flex items-center gap-4 shadow-lg",
        gradients[index % gradients.length]
      )}
    >
      <div className="absolute inset-0 stadium-pattern opacity-20" />

      {/* Sparkle dots — 6개 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const sizes = ["w-1 h-1", "w-1.5 h-1.5", "w-1 h-1"];
        return (
          <div
            key={i}
            className={cn(
              "absolute rounded-full sparkle pointer-events-none",
              sizes[i % sizes.length],
              sparkleColor,
            )}
            style={{
              top: `${10 + ((i * 23) % 80)}%`,
              left: `${5 + ((i * 41) % 85)}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        );
      })}

      {/* 좌측: 큰 이모지 박스 — 미니 그라디언트 + 링 */}
      <div className={cn(
        "relative shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl backdrop-blur-sm",
        "bg-gradient-to-br from-white/15 to-white/5 ring-1 ring-white/20",
      )}>
        <span className="text-4xl sm:text-5xl drop-shadow-lg" aria-hidden>
          {icons[moment.kind]}
        </span>
      </div>

      {/* 우측: 라벨/헤드라인/디테일 */}
      <div className="relative min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.2em] text-white/70 uppercase font-bold mb-1">
          {titles[moment.kind]}
        </p>
        <h4 className="text-base sm:text-lg font-bold text-white mb-0.5 line-clamp-2 leading-snug drop-shadow">{moment.headline}</h4>
        <p className="text-sm text-white/80 line-clamp-1">{moment.detail}</p>
        <p className="text-[11px] text-white/50 mt-1">{moment.date}</p>
      </div>
    </div>
  );
}

// Match Timeline Item Component
function MatchTimelineItem({ match, isLast }: { match: RecentMatch; isLast: boolean }) {
  const resultColors = {
    W: "bg-[hsl(152,55%,55%)] text-white",
    D: "bg-[hsl(38,85%,58%)] text-black",
    L: "bg-[hsl(0,65%,60%)] text-white",
  };

  const resultLabels = {
    W: "승",
    D: "무",
    L: "패",
  };

  const activities: string[] = [];
  for (let i = 0; i < match.goals; i++) activities.push("⚽");
  for (let i = 0; i < match.assists; i++) activities.push("🅰️");
  if (match.mvp) activities.push("⭐");

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 shrink-0",
            match.isHighlight
              ? "bg-[hsl(16,85%,58%)] border-[hsl(16,85%,58%)]"
              : "bg-transparent border-white/30"
          )}
        />
        {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
      </div>

      <div className={cn("flex-1 pb-4 transition-all", match.isHighlight ? "mb-2" : "")}>
        <div
          className={cn(
            "bg-[hsl(240,5%,10%)] rounded-xl p-3 border border-white/10",
            match.isHighlight && "border-[hsl(16,85%,58%)]/30"
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", resultColors[match.result])}>
                  {resultLabels[match.result]}
                </span>
                {match.isHighlight && (
                  <span className="text-[10px] text-[hsl(16,85%,58%)]">HIGHLIGHT</span>
                )}
              </div>
              <p className="text-base font-semibold text-white">
                {match.opponent === "자체전" ? "자체전" : `vs ${match.opponent}`}
              </p>
              <p className="text-xl font-black text-white mt-1">{match.score}</p>
            </div>
            <span className="text-xs text-white/40 whitespace-nowrap">{match.date}</span>
          </div>

          {activities.length > 0 && (
            <div className="flex items-center gap-1 pt-2 border-t border-white/5">
              {activities.map((icon, i) => (
                <span key={i} className="text-base">{icon}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sticky Share Button
function StickyShareButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[hsl(240,6%,6%)] to-transparent sm:hidden z-40">
      <button
        onClick={onClick}
        className="w-full py-4 rounded-xl bg-[hsl(16,85%,58%)] text-white font-semibold text-base hover:bg-[hsl(16,85%,50%)] transition-colors"
      >
        내 카드 공유하기
      </button>
    </div>
  );
}

// Main Player Profile Page Component
export function PlayerProfilePage({ profile }: { profile: PlayerProfile }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const { name, teamName, teamPrimaryColor, positions, jerseyNumber, teamRole, seasonName, signature, playerCardProps, stats, bestMoments, recentMatches } = profile;

  function handleBack() {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/dashboard";
  }

  function showShareToast(msg: string) {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 2000);
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showShareToast("링크가 복사되었습니다");
      setShowShareModal(false);
    } catch {
      showShareToast("복사에 실패했습니다");
    }
  }

  async function handleNativeShare() {
    const shareData = {
      title: `${name} · ${seasonName} · ${teamName}`,
      text: signature ? `"${signature}"` : `${name}의 ${seasonName} 카드`,
      url: window.location.href,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        setShowShareModal(false);
      } catch {
        // 사용자 취소 — 아무 처리 안 함
      }
    } else {
      handleCopyUrl();
    }
  }

  function handleSaveImage() {
    // 이미지 다운로드는 별도 API 필요. 대안: 스크린샷 안내
    showShareToast("스크린샷으로 저장해주세요 (이미지 다운로드 준비 중)");
    setShowShareModal(false);
  }

  function handleStartOwnTeam() {
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] pb-24 sm:pb-8">
      {/* 뒤로가기 버튼 — 상단 좌측 고정 */}
      <button
        type="button"
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors border border-white/10"
        aria-label="뒤로가기"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ========================================= */}
      {/* HERO SECTION - CINEMATIC MOVIE POSTER    */}
      {/* ========================================= */}
      {/* min-h-screen fallback + 100svh (모바일 동적 viewport 대응) */}
      <section
        className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-10 overflow-hidden"
      >
        {/* Base Gradient Background with Team Color */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 30% 0%, ${teamPrimaryColor}35 0%, transparent 50%),
              radial-gradient(ellipse 100% 60% at 70% 10%, ${teamPrimaryColor}25 0%, transparent 40%),
              linear-gradient(180deg, ${teamPrimaryColor}20 0%, hsl(240, 6%, 6%) 40%, hsl(240, 6%, 6%) 100%)
            `
          }}
        />

        {/* Soccer Field Lines Pattern */}
        <SoccerFieldPattern />

        {/* Stadium Lights Effect - Multiple radial lights from top */}
        <div
          className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)` }}
        />
        <div
          className="absolute -top-10 right-1/3 w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{ background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)` }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, ${teamPrimaryColor}40 0%, transparent 60%)` }}
        />

        {/* Noise Texture */}
        <div className="absolute inset-0 noise-overlay" />

        {/* Vignette - Darker edges to focus center */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(0,0,0,0.5) 100%)`
          }}
        />

        {/* PITCHMASTER Watermark - Top Right */}
        <div className="absolute top-6 right-6 sm:top-10 sm:right-10">
          <span className="text-[10px] tracking-[0.35em] text-white/25 font-medium">PITCHMASTER</span>
        </div>

        {/* Main Content */}
        <div className="relative text-center z-10 max-w-4xl mx-auto">
          {/* Season Overline */}
          <p className="text-[11px] sm:text-xs tracking-[0.4em] text-white/40 mb-4 uppercase font-medium">
            {seasonName}
          </p>

          {/* GIANT Player Name */}
          <h1
            className="font-black text-white mb-4 leading-[0.9]"
            style={{
              fontSize: "clamp(56px, 14vw, 120px)",
              letterSpacing: name.length <= 3 ? "0.1em" : name.length <= 4 ? "0.05em" : "0",
              textShadow: "0 4px 60px rgba(0,0,0,0.5), 0 0 120px rgba(255,255,255,0.1)"
            }}
          >
            {name}
          </h1>

          {/* Subtitle Line */}
          <p className="text-sm sm:text-base text-white/60 mb-4 tracking-wide">
            {teamName}
            <span className="mx-2 text-white/30">·</span>
            {positions.join(" / ")}
            {jerseyNumber && (
              <>
                <span className="mx-2 text-white/30">·</span>
                <span className="font-semibold">#{jerseyNumber}</span>
              </>
            )}
            {stats && (
              <>
                <span className="mx-2 text-white/30">·</span>
                <span>{stats.attended}경기 출장</span>
              </>
            )}
          </p>

          {/* Role Badge */}
          {teamRole && (
            <div className="mb-4">
              <RoleBadge role={teamRole} />
            </div>
          )}

          {/* Signature Statement - Primary Color, Italic */}
          <p 
            className="text-lg sm:text-xl italic font-medium max-w-lg mx-auto leading-relaxed"
            style={{ color: teamPrimaryColor }}
          >
            &ldquo;{signature}&rdquo;
          </p>
        </div>

        {/* Scroll Cue - Bottom Center */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase">Scroll</span>
          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ========================================= */}
      {/* SEASON DIGEST - Card + Stats             */}
      {/* ========================================= */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          {/* Player Card */}
          <div className="w-full max-w-[340px] shrink-0">
            <PlayerCard {...playerCardProps} />
          </div>

          {/* Key Stats */}
          {stats && (
            <div className="flex-1 w-full">
              <h2 className="text-lg font-bold text-white mb-4 text-center lg:text-left">시즌 다이제스트</h2>

              {/* Big Numbers Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-4 text-center border border-white/10">
                  <p className="text-4xl font-black text-[hsl(16,85%,58%)]">{stats.goals}</p>
                  <p className="text-sm text-white/50 mt-1">골</p>
                  {stats.goalsRank && <ContextChip text={stats.goalsRank} icon="🏆" />}
                </div>
                <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-4 text-center border border-white/10">
                  <p className="text-4xl font-black text-white">{stats.assists}</p>
                  <p className="text-sm text-white/50 mt-1">어시</p>
                  {stats.assistsRank && <ContextChip text={stats.assistsRank} />}
                </div>
                <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-4 text-center border border-white/10">
                  <p className="text-4xl font-black text-white">{Math.round(stats.attendanceRate * 100)}%</p>
                  <p className="text-sm text-white/50 mt-1">출석률</p>
                  {stats.attendanceStreak && <ContextChip text={`${stats.attendanceStreak}경기 연속`} icon="🔥" />}
                </div>
                <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-4 text-center border border-white/10">
                  <p className="text-4xl font-black text-white">{Math.round(stats.winRate * 100)}%</p>
                  <p className="text-sm text-white/50 mt-1">승률</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Detailed Stats */}
      {stats && (
        <section className="max-w-4xl mx-auto px-4 py-6">
          <h3 className="text-lg font-bold text-white mb-4">시즌 통계 상세</h3>
          
          <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-5 border border-white/10">
            <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <StatBar label="골" value={stats.goals} />
              <span className="text-white/20">·</span>
              <StatBar label="어시" value={stats.assists} />
              <span className="text-white/20">·</span>
              <StatBar label="MOM" value={stats.mvp} />
            </div>

            <div className="flex justify-center gap-8 sm:gap-16 mb-4">
              <CircularProgress value={stats.attendanceRate * 100} label="출석률" color="coral" />
              <CircularProgress value={stats.winRate * 100} label="승률" color="teal" />
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-white/10">
              <div className="px-4 py-2 bg-white/5 rounded-lg text-center">
                <p className="text-sm font-bold text-white">{stats.attended} / {stats.totalMatches}</p>
                <p className="text-xs text-white/50">출전 경기</p>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-lg text-center">
                <p className="text-sm font-bold text-white">{stats.cleanSheets}</p>
                <p className="text-xs text-white/50">클린시트</p>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-lg text-center">
                <p className="text-sm font-bold text-white">{stats.attackPoints}</p>
                <p className="text-xs text-white/50">공격P</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Best Moments */}
      {bestMoments.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-6">
          <h3 className="text-lg font-bold text-white mb-4">시즌 베스트 모먼트</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bestMoments.map((moment, index) => (
              <BestMomentCard key={index} moment={moment} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Matches Timeline */}
      {recentMatches.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-6">
          <h3 className="text-lg font-bold text-white mb-4">최근 경기</h3>
          
          <div className="max-w-md mx-auto lg:mx-0">
            {recentMatches.map((match, index) => (
              <MatchTimelineItem
                key={index}
                match={match}
                isLast={index === recentMatches.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-[hsl(16,85%,58%)]/20 via-[hsl(240,5%,10%)] to-[hsl(16,85%,58%)]/20 rounded-2xl p-6 border border-[hsl(16,85%,58%)]/30 text-center">
          <h3 className="text-xl font-bold text-white mb-2">내 카드 가져가세요</h3>
          <p className="text-sm text-white/50 mb-5">이 시즌의 내 카드를 다운로드하고 공유하세요</p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-6 py-3 rounded-xl bg-[hsl(16,85%,58%)] text-white font-medium hover:bg-[hsl(16,85%,50%)] transition-colors"
            >
              친구에게 공유
            </button>
            <button
              onClick={handleStartOwnTeam}
              className="px-6 py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/5 transition-colors"
              title="PitchMaster로 우리 팀도 시작하기"
            >
              우리 팀도 시작하기 →
            </button>
          </div>

          <p className="text-xs text-white/30 mt-4">
            PitchMaster는 풋살·축구 팀 관리 앱이에요. 참석 투표, 회비, 라인업, 기록을 한 번에.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-white/5">
        <p className="text-[10px] tracking-[0.3em] text-white/30">PITCHMASTER</p>
        <p className="text-xs text-white/20 mt-1">pitch-master.app</p>
      </footer>

      {/* Sticky Share Button (Mobile) */}
      <StickyShareButton onClick={() => setShowShareModal(true)} />

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-black/80 text-white text-sm border border-white/10 backdrop-blur-sm">
          {shareToast}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-white mb-4">공유하기</h4>
            <div className="space-y-3">
              <button
                onClick={handleNativeShare}
                className="w-full py-3 rounded-lg bg-[hsl(16,85%,58%)] text-white font-medium hover:bg-[hsl(16,85%,50%)] transition-colors"
              >
                카카오톡·메시지로 공유
              </button>
              <button
                onClick={handleCopyUrl}
                className="w-full py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                링크 복사
              </button>
              <button
                onClick={handleSaveImage}
                className="w-full py-3 rounded-lg bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-colors text-sm"
              >
                이미지로 저장 (준비 중)
              </button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full mt-4 py-2 text-white/50 text-sm">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Empty State Component
export function PlayerProfileEmpty({ name, teamName, positions }: { name: string; teamName: string; positions: string[] }) {
  function handleBack() {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/dashboard";
  }
  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] flex items-center justify-center px-4">
      <button
        type="button"
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors border border-white/10"
        aria-label="뒤로가기"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
          <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{name}</h2>
        <p className="text-white/50 mb-1">{teamName}</p>
        <p className="text-white/30 text-sm mb-6">{positions.join(" / ")}</p>
        <p className="text-white/40">아직 시즌이 시작되지 않았어요</p>
        <p className="text-xs text-white/30 mt-1">첫 경기 후 기록이 집계됩니다</p>
      </div>
    </div>
  );
}

// Demo with Mock Data
export function PlayerProfileDemo() {
  const mockProfile: PlayerProfile = {
    name: "김민수",
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    positions: ["FW", "ST"],
    jerseyNumber: 10,
    teamRole: "CAPTAIN",
    seasonName: "2026 시즌",
    signature: "15골 8어시 — 팀 득점왕",
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
      signature: "15골 8어시 — 시즌 MVP 후보",
      stats: [
        { label: "골", value: "15", rank: "🏆 팀 1위", isHero: true },
        { label: "어시", value: "8", rank: "상위 10%" },
        { label: "공격P", value: "23", streak: "🔥 5경기 연속" },
        { label: "MOM", value: "5" },
        { label: "출석률", value: "82%" },
        { label: "경기", value: "18" },
      ],
    },
    stats: {
      goals: 15,
      assists: 8,
      mvp: 5,
      attended: 18,
      totalMatches: 20,
      attendanceRate: 0.9,
      winRate: 0.78,
      cleanSheets: 0,
      attackPoints: 23,
      goalsRank: "팀 1위",
      assistsRank: "상위 10%",
      attendanceStreak: 13,
      goalStreak: 5,
    },
    bestMoments: [
      {
        kind: "bestMatch",
        headline: "vs 강남 FC, 5:2 승",
        detail: "본인 2골 1어시",
        date: "2026.05.15",
      },
      {
        kind: "firstGoal",
        headline: "시즌 첫 골",
        detail: "vs 역삼 유나이티드",
        date: "2026.03.02",
      },
      {
        kind: "streak",
        headline: "13경기 연속 출장",
        detail: "시즌 최다 연속 기록",
        date: "2026.03 ~ 진행 중",
      },
    ],
    recentMatches: [
      {
        date: "2026.06.01",
        opponent: "서초 FC",
        score: "3:2",
        result: "W",
        goals: 2,
        assists: 1,
        mvp: true,
        isHighlight: true,
      },
      {
        date: "2026.05.25",
        opponent: "강남 FC",
        score: "5:2",
        result: "W",
        goals: 2,
        assists: 1,
        mvp: false,
        isHighlight: true,
      },
      {
        date: "2026.05.18",
        opponent: "자체전",
        score: "4:4",
        result: "D",
        goals: 1,
        assists: 0,
        mvp: false,
        isHighlight: false,
      },
      {
        date: "2026.05.11",
        opponent: "송파 유나이티드",
        score: "1:2",
        result: "L",
        goals: 1,
        assists: 0,
        mvp: false,
        isHighlight: false,
      },
      {
        date: "2026.05.04",
        opponent: "잠실 FC",
        score: "2:0",
        result: "W",
        goals: 0,
        assists: 1,
        mvp: false,
        isHighlight: false,
      },
    ],
  };

  return <PlayerProfilePage profile={mockProfile} />;
}

export default PlayerProfilePage;
