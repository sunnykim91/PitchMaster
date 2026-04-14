"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Vote, CreditCard, LayoutGrid, Check, Award, Crown, TrendingUp } from "lucide-react";
import { PlayerCard, type PlayerCardProps } from "@/components/pitchmaster/PlayerCard";

function VoteVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs text-primary">실시간 동기화 중</span>
      </div>
      {[
        { label: "참석", pct: 62, count: 8, color: "bg-[hsl(var(--success))]", text: "text-[hsl(var(--success))]" },
        { label: "불참", pct: 23, count: 3, color: "bg-destructive", text: "text-destructive" },
        { label: "미정", pct: 15, count: 2, color: "bg-foreground/30", text: "text-foreground/40" },
      ].map((v) => (
        <div key={v.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className={v.text}>{v.label}</span>
            <span className="text-foreground/60">{v.count}명 ({v.pct}%)</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div className={`h-full rounded-full ${v.color}`} style={{ width: `${v.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 z-10 h-0.5 animate-scan bg-gradient-to-r from-transparent via-[hsl(var(--info))] to-transparent" style={{ boxShadow: "0 0 12px hsl(var(--info) / 0.4)" }} />
      {[
        { name: "김민수", amount: "30,000원", status: "완료", color: "text-[hsl(var(--success))]" },
        { name: "이준혁", amount: "30,000원", status: "완료", color: "text-[hsl(var(--success))]" },
        { name: "박지훈", amount: "30,000원", status: "대기", color: "text-[hsl(var(--accent))]" },
        { name: "정수민", amount: "30,000원", status: "미납", color: "text-destructive" },
      ].map((t) => (
        <div key={t.name} className="flex items-center justify-between border-b border-foreground/5 py-2.5 last:border-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--info))]/20 text-xs font-medium text-[hsl(var(--info))]">{t.name[0]}</div>
            <span className="text-sm">{t.name}</span>
          </div>
          <div className="text-right">
            <div className="text-sm">{t.amount}</div>
            <div className={`text-[10px] ${t.color}`}>{t.status}</div>
          </div>
        </div>
      ))}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--info))]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--info))]">
          <Check className="h-2.5 w-2.5" /> 카카오뱅크 엑셀 업로드
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Naver Clova OCR
        </span>
      </div>
    </div>
  );
}

function LineupVisual() {
  return (
    <div className="overflow-hidden rounded-lg border border-foreground/10">
      <Image src="/screenshots/autoposition.png" alt="자동 포메이션 편성" width={400} height={700} className="w-full object-cover" quality={85} />
    </div>
  );
}

// 전술판 — 실제 서비스 스크린샷 사용
function TacticsBoard() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`mx-auto w-full max-w-sm transition-all duration-700 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
      <div className="overflow-hidden rounded-2xl border-2 border-foreground/10 shadow-2xl shadow-black/40">
        <Image
          src="/screenshots/tactisboard.png"
          alt="PitchMaster 전술판 — 4-3-3 포메이션 자동 배치"
          width={400}
          height={500}
          className="w-full object-cover"
          quality={85}
        />
      </div>
    </div>
  );
}

// 랜딩 데모용 4단계 등급 카드 — 실제 등급 차이를 한눈에
const landingIconCard: PlayerCardProps = {
  ovr: 96,
  rarity: "ICON",
  positionLabel: "FW",
  positionCategory: "FW",
  playerName: "홍길동",
  jerseyNumber: 10,
  teamName: "FC 피치마스터",
  teamPrimaryColor: "#e8613a",
  seasonName: "2026 시즌",
  signature: "32골 18어시 — 시즌 압도적 MVP",
  stats: [
    { label: "골", value: "32", rank: "🏆 팀 1위", isHero: true },
    { label: "어시", value: "18", rank: "🏆 팀 1위" },
    { label: "공격P", value: "50", streak: "🔥 9경기 연속" },
    { label: "MOM", value: "12", rank: "🏆 팀 1위" },
    { label: "출석률", value: "96%" },
    { label: "승률", value: "82%" },
  ],
};

const landingHeroCard: PlayerCardProps = {
  ovr: 87,
  rarity: "HERO",
  positionLabel: "MID",
  positionCategory: "MID",
  playerName: "강민호",
  jerseyNumber: 8,
  teamName: "FC 피치마스터",
  teamPrimaryColor: "#e8613a",
  seasonName: "2026 시즌",
  signature: "5경기 연속 MOM에 빛난 미드필더",
  stats: [
    { label: "어시", value: "15", rank: "🏆 팀 1위", isHero: true },
    { label: "골", value: "7" },
    { label: "MOM", value: "6", streak: "🔥 5연속" },
    { label: "출석률", value: "91%" },
    { label: "승률", value: "72%" },
    { label: "경기", value: "20" },
  ],
};

const landingRareCard: PlayerCardProps = {
  ovr: 78,
  rarity: "RARE",
  positionLabel: "DEF",
  positionCategory: "DEF",
  playerName: "박성진",
  jerseyNumber: 4,
  teamName: "FC 피치마스터",
  teamPrimaryColor: "#e8613a",
  seasonName: "2026 시즌",
  signature: "22경기 출장 · 클린시트 9회",
  stats: [
    { label: "클린시트", value: "9", rank: "🏆 팀 1위", isHero: true },
    { label: "승률", value: "78%" },
    { label: "출석률", value: "95%", streak: "🔥 13연속" },
    { label: "MOM", value: "3" },
    { label: "실점", value: "0.6" },
    { label: "경기", value: "22" },
  ],
};

const landingCommonCard: PlayerCardProps = {
  ovr: 64,
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
    { label: "클린시트", value: "4", isHero: true },
    { label: "실점", value: "1.2" },
    { label: "승률", value: "55%" },
    { label: "출석률", value: "75%" },
    { label: "MOM", value: "1" },
    { label: "경기", value: "12" },
  ],
};

const features = [
  {
    icon: Vote, label: "참석 투표", tagline: "링크 하나면 끝",
    desc: "경기 생성하면 마감일 자동 설정 + 실시간 자동 집계. 읽씹 걱정 제로",
    color: "primary", visual: "vote",
  },
  {
    icon: CreditCard, label: "회비 정산", tagline: "엑셀·캡쳐면 끝",
    desc: "카카오뱅크 엑셀 일괄 업로드 + Naver Clova OCR로 입금자·금액 자동 매칭",
    color: "info", visual: "payment",
  },
  {
    icon: LayoutGrid, label: "스마트 라인업", tagline: "버튼 한 번이면 끝",
    desc: "선호 포지션과 실력 데이터 기반으로 쿼터별 라인업을 자동 생성",
    color: "accent", visual: "lineup",
  },
];

export default function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="features" className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">핵심 기능</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            총무가 매주 하는 일,<br /><span className="text-muted-foreground">세 가지로 끝.</span>
          </h2>
        </div>

        {/* 3 Feature Cards */}
        <div className="mb-20 grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`group relative overflow-hidden rounded-2xl border border-[hsl(var(--${f.color}))]/20 bg-[hsl(var(--${f.color}))]/5 p-7 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <p className={`mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--${f.color}))]`}>{f.label}</p>
              <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--${f.color}))]/20`}>
                <f.icon className={`h-5 w-5 text-[hsl(var(--${f.color}))]`} />
              </div>
              <h3 className="mb-1 text-lg font-semibold">&ldquo;{f.tagline}&rdquo;</h3>
              <p className="mb-7 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="border-t border-foreground/10 pt-5">
                {f.visual === "vote" && <VoteVisual />}
                {f.visual === "payment" && <PaymentVisual />}
                {f.visual === "lineup" && <LineupVisual />}
              </div>
            </div>
          ))}
        </div>

        {/* Tactics Board + Auto Formation */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[hsl(var(--accent))]">Smart Lineup</p>
          <h3 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">
            버튼 한 번으로 완성하는 전술 보드
          </h3>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            참석자 명단을 바탕으로 최적의 포지션을 자동 배치하고, 드래그로 손쉽게 수정하세요.
          </p>
        </div>
        <TacticsBoard />

        {/* Player Card & Season Awards */}
        <div className="mt-24 mb-10 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[hsl(var(--warning))]">Player Card & Awards</p>
          <h3 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">
            경기 끝나면 카드가 만들어집니다
          </h3>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            FIFA 스타일 선수 카드와 시즌 어워드. 카톡 한 번에 자랑하세요.
          </p>
        </div>

        {/* Live PlayerCard demo — 4단계 등급 비교 */}
        <div className="rounded-3xl bg-[hsl(240,6%,6%)] py-10 px-4 sm:py-14 sm:px-6">
          <div className="max-w-6xl mx-auto">
            {/* 헤드 + 상단 인터랙션 힌트 */}
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-[10px] tracking-[0.3em] text-yellow-400/80 font-bold mb-3">TAP THE CARD · 홀로그래픽 라이브</p>
              <h4 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                4단계 등급, 포지션별 스탯, 자동 시그니처
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-white/55">
                골·어시·MOM·출석률을 기반으로 ICON / HERO / RARE / COMMON 자동 결정
              </p>
            </div>

            {/* 4장 카드 그리드 */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              {[landingIconCard, landingHeroCard, landingRareCard, landingCommonCard].map((card) => (
                <div key={card.playerName} className="flex flex-col items-center gap-2">
                  <div className="w-full max-w-[260px]">
                    <PlayerCard {...card} />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] font-bold text-white/40">
                    {card.rarity} · OVR {card.ovr}
                  </span>
                </div>
              ))}
            </div>

            {/* 추가 어워드/프로필 설명 */}
            <div className="grid gap-3 sm:grid-cols-3 max-w-4xl mx-auto pt-4 border-t border-white/10">
              {[
                { icon: Crown, label: "MOM 어워드", desc: "참석자 70%+ 투표로 신뢰도 높은 MVP 선정" },
                { icon: Award, label: "시즌 시상 7종", desc: "득점왕·도움왕·철벽·개근·올라운더 자동" },
                { icon: TrendingUp, label: "커리어 프로필", desc: "베스트 모먼트·시즌 누적·랭킹 한 페이지" },
              ].map((f) => (
                <div key={f.label} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--warning))]/15">
                    <f.icon className="h-4.5 w-4.5 text-[hsl(var(--warning))]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-semibold text-white">{f.label}</h5>
                    <p className="text-xs text-white/55 leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
