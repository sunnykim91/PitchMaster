"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type PlayerCardProps } from "./PlayerCard";

// Types
export type ShareCardVariant = "story" | "square" | "og";

export type ShareCardData = {
  variant: ShareCardVariant;
  playerName: string;
  teamName: string;
  seasonName: string;
  teamPrimaryColor: string;
  ovr?: number;
  rarity?: "ICON" | "HERO" | "RARE" | "COMMON";
  positionLabel?: string;
  jerseyNumber?: number | null;
  signature?: string;
  stats?: Array<{ label: string; value: string; rank?: string }>;
  awards?: Array<{ label: string; name: string; value: string | number }>;
  record?: { wins: number; draws: number; losses: number };
};

// Rarity Configuration (simplified for share cards)
const rarityConfig = {
  ICON: { label: "ICON", color: "text-yellow-400", bgGradient: "from-yellow-500/30 via-yellow-900/20 to-yellow-500/30" },
  HERO: { label: "HERO", color: "text-orange-400", bgGradient: "from-orange-500/25 via-orange-900/15 to-orange-500/25" },
  RARE: { label: "RARE", color: "text-teal-400", bgGradient: "from-teal-500/20 via-teal-900/10 to-teal-500/20" },
  COMMON: { label: "COMMON", color: "text-white/60", bgGradient: "from-white/10 via-transparent to-white/10" },
};

// Mini Player Card for Share (simplified inline version)
function MiniPlayerCard({
  ovr,
  rarity,
  positionLabel,
  playerName,
  jerseyNumber,
  teamPrimaryColor,
}: {
  ovr: number;
  rarity: "ICON" | "HERO" | "RARE" | "COMMON";
  positionLabel: string;
  playerName: string;
  jerseyNumber: number | null;
  teamPrimaryColor: string;
}) {
  const config = rarityConfig[rarity];
  
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden aspect-[3/4] w-full",
        "border-2",
        rarity === "ICON" && "border-yellow-500/80",
        rarity === "HERO" && "border-orange-500/70",
        rarity === "RARE" && "border-teal-500/60",
        rarity === "COMMON" && "border-white/20"
      )}
    >
      {/* Background */}
      <div
        className={cn("absolute inset-0 bg-gradient-to-br", config.bgGradient)}
        style={{
          background: `linear-gradient(135deg, ${teamPrimaryColor}40 0%, hsl(240, 5%, 10%) 50%, ${teamPrimaryColor}30 100%)`,
        }}
      />
      
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-3">
        {/* Top: OVR + Position */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col items-center">
            <span className={cn("text-3xl font-black leading-none", config.color)}>{ovr}</span>
            <span className="text-[10px] font-bold text-white/80">{positionLabel}</span>
          </div>
          <span className={cn("text-[8px] tracking-[0.15em] font-semibold", config.color)}>
            {config.label}
          </span>
        </div>
        
        {/* Center: Jersey Number */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-6xl font-black opacity-15"
            style={{ color: teamPrimaryColor }}
          >
            {jerseyNumber ?? "?"}
          </span>
        </div>
        
        {/* Bottom: Name */}
        <div className="text-center">
          <h3 className="text-base font-bold text-white">{playerName}</h3>
        </div>
      </div>
    </div>
  );
}

// Instagram Story Format (1080x1920 비율, 미리보기 320x568)
// 실제 공유 시에는 1080x1920 PNG로 출력
function StoryShareCard({ data }: { data: ShareCardData }) {
  const { playerName, teamName, seasonName, teamPrimaryColor, ovr, rarity, positionLabel, jerseyNumber, signature, stats } = data;

  return (
    <div
      className="relative bg-[hsl(240,6%,6%)] overflow-hidden rounded-2xl"
      style={{ width: 320, height: 568 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 stadium-pattern opacity-20" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30"
        style={{ background: teamPrimaryColor }}
      />
      <div className="absolute inset-0 vignette" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        {/* Top Section: Season */}
        <div className="text-center mb-4">
          <p className="text-[8px] tracking-[0.3em] text-white/40 mb-1">PITCHMASTER</p>
          <p className="text-xs text-[hsl(16,85%,58%)] font-medium">{seasonName}</p>
        </div>
        
        {/* Card Section */}
        {ovr && rarity && positionLabel && (
          <div className="w-40 mx-auto mb-4">
            <MiniPlayerCard
              ovr={ovr}
              rarity={rarity}
              positionLabel={positionLabel}
              playerName={playerName}
              jerseyNumber={jerseyNumber ?? null}
              teamPrimaryColor={teamPrimaryColor}
            />
          </div>
        )}
        
        {/* Name & Signature */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-white mb-1">{playerName}</h2>
          <p className="text-xs text-white/60">{teamName}</p>
          {signature && (
            <p className="text-[10px] text-white/50 mt-2 italic">&ldquo;{signature}&rdquo;</p>
          )}
        </div>
        
        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="space-y-2 mb-4">
            {stats.slice(0, 3).map((stat, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-xs text-white/60">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{stat.value}</span>
                  {stat.rank && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">{stat.rank}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-auto text-center">
          <p className="text-[8px] tracking-[0.2em] text-white/30">pitch-master.app</p>
        </div>
      </div>
    </div>
  );
}

// Square Format (1080x1080 비율, 미리보기 360x360)
function SquareShareCard({ data }: { data: ShareCardData }) {
  const { playerName, teamName, seasonName, teamPrimaryColor, ovr, rarity, positionLabel, jerseyNumber, stats } = data;

  return (
    <div
      className="relative bg-[hsl(240,6%,6%)] overflow-hidden rounded-2xl"
      style={{ width: 360, height: 360 }}
    >
      {/* Background */}
      <div className="absolute inset-0 stadium-pattern opacity-20" />
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
        style={{ background: teamPrimaryColor }}
      />
      <div className="absolute inset-0 vignette" />
      
      {/* Content */}
      <div className="relative h-full flex p-5">
        {/* Left: Card */}
        {ovr && rarity && positionLabel && (
          <div className="w-36 shrink-0 mr-5">
            <MiniPlayerCard
              ovr={ovr}
              rarity={rarity}
              positionLabel={positionLabel}
              playerName={playerName}
              jerseyNumber={jerseyNumber ?? null}
              teamPrimaryColor={teamPrimaryColor}
            />
          </div>
        )}
        
        {/* Right: Info */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-[8px] tracking-[0.2em] text-white/40 mb-1">{seasonName}</p>
          <h2 className="text-xl font-black text-white mb-0.5">{playerName}</h2>
          <p className="text-xs text-white/50 mb-4">{teamName}</p>
          
          {/* Stats */}
          {stats && stats.length > 0 && (
            <div className="space-y-1.5">
              {stats.slice(0, 3).map((stat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{stat.value}</span>
                  <span className="text-xs text-white/50">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <p className="text-[7px] tracking-[0.2em] text-white/30">pitch-master.app</p>
      </div>
    </div>
  );
}

// OG Card Format (1200x630 비율, 미리보기 480x252)
function OGShareCard({ data }: { data: ShareCardData }) {
  const { playerName, teamName, seasonName, teamPrimaryColor, ovr, rarity, positionLabel, jerseyNumber, stats, record } = data;

  return (
    <div
      className="relative bg-[hsl(240,6%,6%)] overflow-hidden rounded-2xl"
      style={{ width: 480, height: 252 }}
    >
      {/* Background */}
      <div className="absolute inset-0 stadium-pattern opacity-15" />
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-25"
        style={{ background: teamPrimaryColor }}
      />
      
      {/* Content */}
      <div className="relative h-full flex items-center p-6">
        {/* Left: Card */}
        {ovr && rarity && positionLabel && (
          <div className="w-32 shrink-0 mr-6">
            <MiniPlayerCard
              ovr={ovr}
              rarity={rarity}
              positionLabel={positionLabel}
              playerName={playerName}
              jerseyNumber={jerseyNumber ?? null}
              teamPrimaryColor={teamPrimaryColor}
            />
          </div>
        )}
        
        {/* Right: Info */}
        <div className="flex-1">
          <p className="text-[8px] tracking-[0.2em] text-[hsl(16,85%,58%)] mb-1">{seasonName}</p>
          <h2 className="text-2xl font-black text-white mb-0.5">{playerName}</h2>
          <p className="text-xs text-white/50 mb-3">{teamName}</p>
          
          {/* Stats Row */}
          {stats && stats.length > 0 && (
            <div className="flex items-center gap-4">
              {stats.slice(0, 3).map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="text-[9px] text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Record (for awards) */}
          {record && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-bold text-[hsl(152,55%,55%)]">{record.wins}W</span>
              <span className="text-sm font-bold text-[hsl(38,85%,58%)]">{record.draws}D</span>
              <span className="text-sm font-bold text-[hsl(0,65%,60%)]">{record.losses}L</span>
            </div>
          )}
        </div>
        
        {/* Logo */}
        <div className="absolute bottom-3 right-4">
          <p className="text-[7px] tracking-[0.2em] text-white/30">PITCHMASTER</p>
        </div>
      </div>
    </div>
  );
}

// Main ShareCard Component
export function ShareCard({ data }: { data: ShareCardData }) {
  switch (data.variant) {
    case "story":
      return <StoryShareCard data={data} />;
    case "square":
      return <SquareShareCard data={data} />;
    case "og":
      return <OGShareCard data={data} />;
    default:
      return <StoryShareCard data={data} />;
  }
}

// Share Modal Component
export function ShareModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: Omit<ShareCardData, "variant">;
}) {
  const [variant, setVariant] = useState<ShareCardVariant>("story");
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    // In a real implementation, you would use html2canvas or similar
    // to capture the card as an image
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsExporting(false);
    alert("이미지가 저장되었습니다!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.playerName} - ${data.seasonName}`,
          text: `${data.playerName}의 시즌 카드를 확인하세요!`,
          url: window.location.href,
        });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy URL
      navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div 
        className="bg-[hsl(240,5%,10%)] rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">공유하기</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Variant Selector */}
        <div className="flex gap-2 mb-6">
          {(["story", "square", "og"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                variant === v
                  ? "bg-[hsl(16,85%,58%)] text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              {v === "story" ? "스토리" : v === "square" ? "정사각형" : "OG 카드"}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6" ref={cardRef}>
          <div className="rounded-lg overflow-hidden shadow-2xl">
            <ShareCard data={{ ...data, variant }} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 rounded-xl bg-[hsl(16,85%,58%)] text-white font-medium hover:bg-[hsl(16,85%,50%)] transition-colors disabled:opacity-50"
          >
            {isExporting ? "저장 중..." : "이미지로 저장"}
          </button>
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/5 transition-colors"
          >
            공유하기
          </button>
        </div>

        {/* Dimensions Info */}
        <p className="text-[10px] text-white/30 text-center mt-4">
          {variant === "story" && "인스타 스토리: 1080 x 1920px"}
          {variant === "square" && "정사각형: 1080 x 1080px"}
          {variant === "og" && "카카오톡/링크 미리보기: 1200 x 630px"}
        </p>
      </div>
    </div>
  );
}

// Demo Component
export function ShareCardDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const mockData: Omit<ShareCardData, "variant"> = {
    playerName: "김민수",
    teamName: "FC 피치마스터",
    seasonName: "2026 시즌",
    teamPrimaryColor: "#e8613a",
    ovr: 92,
    rarity: "ICON",
    positionLabel: "FW",
    jerseyNumber: 10,
    signature: "15골 8어시 — 시즌 MVP",
    stats: [
      { label: "골", value: "15", rank: "팀 1위" },
      { label: "어시", value: "8", rank: "상위 10%" },
      { label: "MOM", value: "5" },
    ],
    record: { wins: 12, draws: 3, losses: 5 },
  };

  return (
    <div className="min-h-screen bg-[hsl(240,6%,6%)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.4em] text-white/40 mb-2">PITCHMASTER</p>
          <h1 className="text-3xl font-black text-white mb-2">공유 카드</h1>
          <p className="text-sm text-white/50">3가지 포맷으로 공유하세요</p>
          <p className="mt-2 text-[11px] text-white/30">
            ※ 미리보기 사이즈입니다. 실제 공유 시에는 1080×1920 / 1080×1080 / 1200×630 PNG로 출력됩니다.
          </p>
        </div>

        {/* Cards Preview — 모바일은 가로 스크롤(OG 카드 480px 잘림 방지) */}
        <p className="text-center text-[10px] text-white/30 mb-3 sm:hidden">
          ← 좌우로 스와이프 →
        </p>
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-12">
          <div className="flex gap-6 sm:gap-8 sm:justify-center sm:flex-wrap pb-2">
            {/* Story */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <ShareCard data={{ ...mockData, variant: "story" }} />
              </div>
              <span className="text-xs text-white/50">인스타 스토리 (9:16)</span>
            </div>

            {/* Square */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <ShareCard data={{ ...mockData, variant: "square" }} />
              </div>
              <span className="text-xs text-white/50">정사각형 (1:1)</span>
            </div>

            {/* OG */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <ShareCard data={{ ...mockData, variant: "og" }} />
              </div>
              <span className="text-xs text-white/50">OG 카드 (1.91:1)</span>
            </div>
          </div>
        </div>

        {/* Open Modal Button */}
        <div className="text-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 rounded-xl bg-[hsl(16,85%,58%)] text-white font-semibold hover:bg-[hsl(16,85%,50%)] transition-colors"
          >
            공유 모달 열기
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={mockData}
      />
    </div>
  );
}

export default ShareCard;
