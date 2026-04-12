"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Types
export type StatWithContext = {
  label: string;
  value: string;
  rank?: string;
  streak?: string;
  badge?: "fire" | "trophy" | "rocket" | "crown";
  isHero?: boolean;
};

export type PlayerCardProps = {
  ovr: number;
  rarity: "ICON" | "HERO" | "RARE" | "COMMON";
  positionLabel: string;
  positionCategory: "FW" | "MID" | "DEF" | "GK" | "DEFAULT";
  playerName: string;
  jerseyNumber: number | null;
  teamName: string;
  teamPrimaryColor: string;
  seasonName: string;
  photoUrl?: string;
  signature?: string;
  stats: StatWithContext[];
};

// Sparkle dots for premium cards — 크기 다양화 + 수량 ↑로 화려함 강화
function SparklesDots({ count = 8, color = "gold" }: { count?: number; color?: string }) {
  const colorClass = color === "gold" ? "bg-yellow-300" : color === "coral" ? "bg-[hsl(16,85%,65%)]" : "bg-teal-300";
  const glowClass = color === "gold" ? "shadow-[0_0_8px_rgba(255,215,0,0.9)]"
    : color === "coral" ? "shadow-[0_0_6px_rgba(232,97,58,0.8)]"
      : "shadow-[0_0_6px_rgba(43,211,181,0.8)]";
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        // 4가지 사이즈 랜덤(작은 점이 많고 큰 점이 가끔)
        const sizes = ["w-1 h-1", "w-1 h-1", "w-1.5 h-1.5", "w-2 h-2"];
        const sizeClass = sizes[i % sizes.length];
        return (
          <div
            key={i}
            className={cn(
              "absolute rounded-full sparkle pointer-events-none",
              sizeClass,
              colorClass,
              glowClass,
            )}
            style={{
              top: `${5 + ((i * 37) % 90)}%`,
              left: `${4 + ((i * 53) % 92)}%`,
              animationDelay: `${(i * 0.18) % 2}s`,
            }}
          />
        );
      })}
    </>
  );
}

// Context Chip Component
function ContextChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/15 text-white/90 whitespace-nowrap">
      {text}
    </span>
  );
}

// Rarity Configuration — 옵션B 적용: opacity·glow·sparkle 강화로 시각 임팩트 ↑
const rarityConfig = {
  ICON: {
    label: "LEGENDARY",
    labelColor: "text-yellow-300",
    ovrColor: "text-yellow-300",
    bgStyle: `
      background: conic-gradient(from 0deg at 50% 50%,
        hsl(51 100% 50% / 0.55) 0deg,
        hsl(40 100% 40% / 0.45) 60deg,
        hsl(51 100% 50% / 0.55) 120deg,
        hsl(40 100% 40% / 0.45) 180deg,
        hsl(51 100% 50% / 0.55) 240deg,
        hsl(40 100% 40% / 0.45) 300deg,
        hsl(51 100% 50% / 0.55) 360deg
      );
    `,
    borderClass: "ring-[3px] ring-yellow-500/80 ring-offset-2 ring-offset-yellow-900/60",
    innerBorderClass: "border-2 border-yellow-500/60",
    glowStyle: "0 0 80px rgba(255, 215, 0, 0.6), 0 0 140px rgba(255, 215, 0, 0.4), 0 0 200px rgba(255, 215, 0, 0.25)",
    sparkleCount: 18,
    sparkleColor: "gold",
    hasShimmer: true,
  },
  HERO: {
    label: "HERO",
    labelColor: "text-[hsl(16,90%,68%)]",
    ovrColor: "text-[hsl(16,90%,68%)]",
    bgStyle: `
      background: linear-gradient(135deg,
        hsl(16 85% 58% / 0.45) 0%,
        hsl(240 5% 10%) 40%,
        hsl(16 85% 58% / 0.35) 100%
      );
    `,
    borderClass: "ring-2 ring-[hsl(16,85%,58%)]/75",
    innerBorderClass: "border border-[hsl(16,85%,58%)]/55",
    glowStyle: "0 0 60px rgba(232, 97, 58, 0.55), 0 0 110px rgba(232, 97, 58, 0.3), 0 0 160px rgba(232, 97, 58, 0.18)",
    sparkleCount: 8,
    sparkleColor: "coral",
    hasShimmer: false,
  },
  RARE: {
    label: "RARE",
    labelColor: "text-teal-300",
    ovrColor: "text-teal-300",
    bgStyle: `
      background: linear-gradient(135deg,
        hsl(165 55% 50% / 0.4) 0%,
        hsl(180 60% 40% / 0.25) 30%,
        hsl(165 55% 50% / 0.35) 60%,
        hsl(200 60% 40% / 0.25) 100%
      );
    `,
    borderClass: "ring-2 ring-teal-500/65",
    innerBorderClass: "border border-teal-500/45",
    glowStyle: "0 0 50px rgba(43, 211, 181, 0.5), 0 0 90px rgba(43, 211, 181, 0.28), 0 0 140px rgba(43, 211, 181, 0.16)",
    sparkleCount: 5,
    sparkleColor: "teal",
    hasShimmer: false,
  },
  COMMON: {
    label: "COMMON",
    labelColor: "text-white/50",
    ovrColor: "text-white/80",
    bgStyle: `
      background: linear-gradient(135deg, 
        hsl(240 5% 15%) 0%,
        hsl(240 5% 10%) 50%,
        hsl(240 5% 12%) 100%
      );
    `,
    borderClass: "",
    innerBorderClass: "border border-white/15",
    glowStyle: "none",
    sparkleCount: 0,
    sparkleColor: "white",
    hasShimmer: false,
  },
};

// Card Back Component
function CardBack({
  playerName,
  teamName,
  seasonName,
  stats,
  rarity,
}: Pick<PlayerCardProps, "playerName" | "teamName" | "seasonName" | "stats" | "rarity">) {
  const config = rarityConfig[rarity];
  
  return (
    <div
      className={cn(
        "absolute inset-0 backface-hidden rotate-y-180 rounded-3xl overflow-hidden",
        "bg-[hsl(240,5%,10%)]",
        config.innerBorderClass
      )}
      style={{ boxShadow: config.glowStyle }}
    >
      <div className="relative h-full p-3 sm:p-4 flex flex-col">
        {/* Header — 컴팩트 */}
        <div className="text-center mb-2">
          <p className={cn("text-[9px] tracking-[0.3em] font-semibold mb-0.5", config.labelColor)}>
            {config.label}
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">{playerName}</h3>
          <p className="text-[11px] text-white/50 mt-0.5">{teamName} · {seasonName}</p>
        </div>

        {/* Stats Table — 패딩·간격 축소 */}
        <div className="flex-1 min-h-0">
          <p className="text-[9px] tracking-[0.2em] text-white/40 uppercase mb-1.5">시즌 기록</p>
          <div className="space-y-0">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-xs text-white/60">{stat.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-bold text-white">{stat.value}</span>
                  {(stat.rank || stat.streak) && (
                    <ContextChip text={stat.rank || stat.streak || ""} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2 text-center">
          <p className="text-[9px] tracking-[0.3em] text-white/30">PITCHMASTER</p>
        </div>
      </div>
    </div>
  );
}

// Main Player Card Component
export function PlayerCard({
  ovr,
  rarity,
  positionLabel,
  // positionCategory: 현재는 stats[].isHero 플래그로 hero stat을 결정하므로 미사용.
  // Phase 2에서 데이터 어댑터가 isHero를 못 채우는 케이스를 위해 자동 선택 로직에서 쓸 예정.
  positionCategory: _positionCategory,
  playerName,
  jerseyNumber,
  teamName,
  teamPrimaryColor,
  seasonName,
  photoUrl,
  signature,
  stats,
}: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const config = rarityConfig[rarity];
  
  // Find hero stat based on position
  const heroStat = stats.find((s) => s.isHero);
  const otherStats = stats.filter((s) => !s.isHero).slice(0, 5);

  return (
    <div
      className="perspective-1000 cursor-pointer w-full"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={cn(
          "relative preserve-3d transition-transform duration-700 ease-in-out",
          "aspect-[3/4]",
          isFlipped && "rotate-y-180"
        )}
      >
        {/* Card Front */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-3xl overflow-hidden",
            config.borderClass,
            config.innerBorderClass,
            config.hasShimmer && "card-shimmer"
          )}
          style={{ 
            boxShadow: config.glowStyle,
          }}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{ 
              background: rarity === "ICON" 
                ? `conic-gradient(from 0deg at 50% 50%, 
                    hsl(51 100% 50% / 0.35) 0deg,
                    hsl(40 100% 30% / 0.25) 60deg,
                    hsl(51 100% 50% / 0.35) 120deg,
                    hsl(40 100% 30% / 0.25) 180deg,
                    hsl(51 100% 50% / 0.35) 240deg,
                    hsl(40 100% 30% / 0.25) 300deg,
                    hsl(51 100% 50% / 0.35) 360deg
                  )`
                : rarity === "HERO"
                ? `linear-gradient(135deg, 
                    ${teamPrimaryColor}40 0%,
                    hsl(240 5% 10%) 50%,
                    ${teamPrimaryColor}30 100%
                  )`
                : rarity === "RARE"
                ? `linear-gradient(135deg, 
                    hsl(165 55% 50% / 0.25) 0%,
                    hsl(180 60% 40% / 0.15) 50%,
                    hsl(200 60% 40% / 0.2) 100%
                  )`
                : `linear-gradient(135deg, 
                    hsl(240 5% 15%) 0%,
                    hsl(240 5% 10%) 100%
                  )`
            }}
          />

          {/* Noise Overlay */}
          <div className="absolute inset-0 noise-overlay" />

          {/* Vignette */}
          <div className="absolute inset-0 vignette" />

          {/* Light Streak from top */}
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/10 to-transparent" />

          {/* Sparkles for ICON cards */}
          {config.sparkleCount > 0 && (
            <SparklesDots count={config.sparkleCount} color={config.sparkleColor} />
          )}

          {/* Content */}
          <div className="relative h-full flex flex-col p-4 sm:p-5">
            {/* Top Section: OVR + Position + Rarity Label */}
            <div className="flex justify-between items-start">
              {/* Left: OVR + Position — 압도적 크기 강화 */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "text-7xl sm:text-8xl font-black leading-none tracking-tighter",
                    config.ovrColor,
                    rarity === "ICON" && "text-glow-gold",
                    rarity === "HERO" && "text-glow-coral",
                    rarity === "RARE" && "text-glow-teal",
                  )}
                  style={{
                    textShadow: rarity === "ICON"
                      ? "0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.5), 0 4px 8px rgba(0,0,0,0.5)"
                      : rarity === "HERO"
                        ? "0 0 18px rgba(232,97,58,0.7), 0 4px 8px rgba(0,0,0,0.5)"
                        : rarity === "RARE"
                          ? "0 0 18px rgba(43,211,181,0.7), 0 4px 8px rgba(0,0,0,0.5)"
                          : "0 4px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  {ovr}
                </span>
                <span className="text-sm sm:text-base font-bold text-white/85 mt-1 tracking-wider">{positionLabel}</span>
              </div>

              {/* Right: Rarity + Team Badge */}
              <div className="flex flex-col items-end gap-2">
                <span className={cn(
                  "text-xs sm:text-sm tracking-[0.18em] font-bold",
                  config.labelColor
                )}>
                  {rarity === "ICON" ? "★ LEGENDARY ★" : config.label}
                </span>
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl font-black shadow-lg"
                  style={{
                    backgroundColor: teamPrimaryColor + "60",
                    color: "white",
                    border: `1px solid ${teamPrimaryColor}80`,
                  }}
                >
                  {teamName.charAt(0)}
                </div>
              </div>
            </div>

            {/* Center: Giant Jersey Number Watermark OR Photo — 워터마크 강화 */}
            <div className="flex-1 flex items-center justify-center relative -my-2">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={playerName}
                  className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-full border-2 border-white/20"
                  crossOrigin="anonymous"
                />
              ) : (
                <span
                  className="text-[220px] sm:text-[300px] font-black leading-none select-none absolute"
                  style={{
                    color: rarity === "ICON"
                      ? "rgba(255, 215, 0, 0.22)"
                      : rarity === "HERO"
                        ? `${teamPrimaryColor}38`
                        : rarity === "RARE"
                          ? "rgba(43, 211, 181, 0.18)"
                          : "rgba(255,255,255,0.08)",
                    textShadow: rarity === "ICON" ? "0 0 60px rgba(255,215,0,0.3)" : "none",
                  }}
                >
                  {jerseyNumber ?? "?"}
                </span>
              )}
            </div>

            {/* Player Name + Signature — 시그니처 강화 */}
            <div className="text-center relative z-10 mb-3">
              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-lg",
                  playerName.length <= 3 && "tracking-[0.2em]"
                )}
              >
                {playerName}
              </h2>
              {signature && (
                <p className={cn(
                  "text-sm sm:text-[15px] mt-2 italic line-clamp-1 font-medium",
                  rarity === "ICON" ? "text-yellow-200/90" :
                    rarity === "HERO" ? "text-[hsl(16,90%,80%)]" :
                      rarity === "RARE" ? "text-teal-200" : "text-white/75"
                )}>
                  &ldquo;{signature}&rdquo;
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-3" />

            {/* Stats Section with Hero Stat */}
            <div className="space-y-3">
              {/* Hero Stat - Large */}
              {heroStat && (
                <div className="flex items-center justify-between bg-white/8 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/70 font-medium">{heroStat.label}</span>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-4xl sm:text-5xl font-black",
                      config.ovrColor,
                      rarity === "ICON" && "text-glow-gold"
                    )}>
                      {heroStat.value}
                    </span>
                    {(heroStat.rank || heroStat.streak) && (
                      <ContextChip text={heroStat.rank || heroStat.streak || ""} />
                    )}
                  </div>
                </div>
              )}

              {/* Other Stats - Smaller Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {otherStats.map((stat, i) => (
                  <div key={i} className="text-center bg-white/5 rounded-lg py-2 px-1">
                    <p className="text-base sm:text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 flex items-center justify-between">
              <span className="text-[9px] text-white/40">{seasonName}</span>
              <span className="text-[8px] tracking-[0.25em] text-white/30">PITCHMASTER</span>
            </div>
          </div>
        </div>

        {/* Card Back */}
        <CardBack
          playerName={playerName}
          teamName={teamName}
          seasonName={seasonName}
          stats={stats}
          rarity={rarity}
        />
      </div>
    </div>
  );
}

// Demo: Hero Layout - ICON large, others as thumbnails
export function PlayerCardDemo() {
  const iconCard: PlayerCardProps = {
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
  };

  const heroCard: PlayerCardProps = {
    ovr: 84,
    rarity: "HERO",
    positionLabel: "MID",
    positionCategory: "MID",
    playerName: "이준혁",
    jerseyNumber: 8,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "5경기 연속 MOM에 빛난 미드필더",
    stats: [
      { label: "어시", value: "12", rank: "🏆 팀 1위", isHero: true },
      { label: "골", value: "5" },
      { label: "MOM", value: "5", streak: "🔥 5연속" },
      { label: "출석률", value: "88%" },
      { label: "승률", value: "68%" },
      { label: "경기", value: "16" },
    ],
  };

  const rareCard: PlayerCardProps = {
    ovr: 76,
    rarity: "RARE",
    positionLabel: "DEF",
    positionCategory: "DEF",
    playerName: "박성진",
    jerseyNumber: 4,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "22경기 출장 · 클린시트 7회",
    stats: [
      { label: "클린시트", value: "7", rank: "🏆 팀 1위", isHero: true },
      { label: "승률", value: "78%" },
      { label: "출석률", value: "92%", streak: "🔥 13경기 연속" },
      { label: "MOM", value: "2" },
      { label: "실점", value: "0.8" },
      { label: "경기", value: "22" },
    ],
  };

  const commonCard: PlayerCardProps = {
    ovr: 62,
    rarity: "COMMON",
    positionLabel: "GK",
    positionCategory: "GK",
    playerName: "최영호",
    jerseyNumber: 1,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "꾸준함으로 시즌을 채운 선수",
    stats: [
      { label: "클린시트", value: "3", isHero: true },
      { label: "실점", value: "1.2" },
      { label: "승률", value: "55%" },
      { label: "출석률", value: "70%" },
      { label: "MOM", value: "1" },
      { label: "경기", value: "10" },
    ],
  };

  const thumbnailCards = [heroCard, rareCard, commonCard];

  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] py-8 sm:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-[10px] tracking-[0.4em] text-white/40 mb-2">PITCHMASTER PRESENTS</p>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-3">플레이어 카드</h1>
          <p className="text-sm sm:text-base text-white/50">카드를 클릭하여 뒷면을 확인하세요</p>
        </div>

        {/* Hero ICON Card - Large */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <div className="w-full max-w-[340px] sm:max-w-[400px]">
            <PlayerCard {...iconCard} />
            <div className="text-center mt-4">
              <span className="text-yellow-400 text-sm font-bold tracking-wider">
                ★ LEGENDARY · OVR {iconCard.ovr}
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail Cards - Smaller comparison row */}
        <div className="mb-8">
          <p className="text-center text-xs tracking-[0.2em] text-white/40 mb-6">등급 비교</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            {thumbnailCards.map((card, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full max-w-[280px]">
                  <PlayerCard {...card} />
                </div>
                <span className={cn(
                  "text-xs font-semibold tracking-wider mt-3",
                  rarityConfig[card.rarity].labelColor
                )}>
                  {card.rarity} · OVR {card.ovr}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-12">
          <button className="px-6 py-3 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors">
            이미지로 저장
          </button>
          <button className="px-6 py-3 rounded-xl bg-[hsl(16,85%,58%)] text-white text-sm font-medium hover:bg-[hsl(16,85%,50%)] transition-colors">
            공유하기
          </button>
        </div>

        {/* Empty State Example */}
        <div className="mt-16 max-w-sm mx-auto">
          <div className="bg-[hsl(240,5%,10%)] rounded-2xl p-8 text-center border border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-white/60 text-sm">아직 출전 기록이 없어요</p>
            <p className="text-white/30 text-xs mt-1">첫 경기 후 카드가 생성됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerCard;
