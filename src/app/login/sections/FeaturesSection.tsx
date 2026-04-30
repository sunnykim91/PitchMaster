"use client";

/**
 * FeaturesSection
 *
 * 4 sub-sections of feature showcase:
 *   1) 핵심 기능 3종 (참석 투표 / 회비 정산 / AI 전술 편성)
 *   2) Smart Lineup — 전술 보드 hero image (/screenshots/tactisboard.png)
 *   3) Role Guide — 24 포지션 × 10 포메이션 카드 3개
 *   4) Player Card & Season Awards — 4-tier FIFA-style cards + 3 award chips
 *
 * Visual signature:
 *  - Each sub-section has its own eyebrow tone (primary / accent / info / warning)
 *  - Sub 1: live-data feel (LIVE pulse, AI OCR chip, count-up vote bars, scan line on settle source)
 *  - Sub 2: hero image scales 0.95 → 1 + opacity 0 → 1 on enter (700ms)
 *  - Sub 4: darker bg (hsl 240 6% 4%), 4-tier cards, hover holographic shimmer
 *
 * PlayerCard: imports the existing project component and forwards props as-is.
 *
 * Tokens consumed (globals.css HSL vars):
 *   --primary, --accent, --info, --success, --warning
 *   --background, --foreground, --card, --secondary, --border, --muted-foreground
 *
 * Accessibility: <MotionConfig reducedMotion="user"> + reduced-motion CSS guards.
 *
 * Deps: framer-motion@^11, lucide-react
 *       Internal: @/components/pitchmaster/PlayerCard
 */

import { motion, MotionConfig, useInView } from "framer-motion";
import {
  Award,
  Bell,
  CheckSquare,
  Crown,
  CreditCard,
  FileSpreadsheet,
  Link as LinkIcon,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlayerCard, type PlayerCardProps } from "@/components/pitchmaster/PlayerCard";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const VOTE_DATA = [
  { label: "참석", pct: 62, kind: "go" as const },
  { label: "불참", pct: 23, kind: "no" as const },
  { label: "미정", pct: 15, kind: "maybe" as const },
];

const SETTLERS = [
  { name: "김민수", amt: 30000 },
  { name: "이준혁", amt: 30000 },
  { name: "박지훈", amt: 30000 },
  { name: "정수민", amt: 30000 },
];

const ROLES = [
  {
    quarter: "Q2 · 4-3-3",
    formation: "4-3-3",
    pos: "RCB",
    title: "라인 유지가 핵심",
    bullets: [
      "우측 풀백과 5m 간격 유지",
      "오프사이드 라인 선점",
      "클리어는 중앙 피하고 사이드로",
    ],
  },
  {
    quarter: "Q1 · Q3 · 4-2-3-1",
    formation: "4-2-3-1",
    pos: "CAM",
    title: "ST 뒤에서 해결사",
    bullets: [
      "페널티박스 아크 반박자 패스",
      "DM 옆 빈 공간 차지",
      "세트피스 2차 슛 노리기",
    ],
  },
  {
    quarter: "전 쿼터 · 3-5-2",
    formation: "3-5-2",
    pos: "LWB",
    title: "체력 분배 잊지 말기",
    bullets: [
      "오버래핑 후 빠른 복귀",
      "얼리 크로스 우선",
      "전반엔 70% 출력만 유지",
    ],
  },
];

// 실제 PlayerCard 컴포넌트 풀 props — 랜딩 데모용 4단계 등급 카드
const PLAYER_CARDS: PlayerCardProps[] = [
  {
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
    ],
  },
  {
    ovr: 73,
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
      { label: "어시", value: "12", rank: "🏆 팀 1위", isHero: true },
      { label: "골", value: "5" },
      { label: "MOM", value: "5", streak: "🔥 5연속" },
      { label: "출석률", value: "88%" },
      { label: "경기", value: "20" },
    ],
  },
  {
    ovr: 64,
    rarity: "RARE",
    positionLabel: "DEF",
    positionCategory: "DEF",
    playerName: "박성진",
    jerseyNumber: 4,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "꾸준한 출석과 안정된 수비",
    stats: [
      { label: "클린시트", value: "5", rank: "🏆 팀 1위", isHero: true },
      { label: "승률", value: "65%" },
      { label: "출석률", value: "88%", streak: "🔥 8연속" },
      { label: "MOM", value: "2" },
      { label: "실점", value: "1.0" },
    ],
  },
  {
    ovr: 55,
    rarity: "COMMON",
    positionLabel: "GK",
    positionCategory: "GK",
    playerName: "최영호",
    jerseyNumber: 1,
    teamName: "FC 피치마스터",
    teamPrimaryColor: "#e8613a",
    seasonName: "2026 시즌",
    signature: "성장 중인 골키퍼",
    stats: [
      { label: "클린시트", value: "1", isHero: true },
      { label: "실점", value: "2.0" },
      { label: "승률", value: "45%" },
      { label: "출석률", value: "62%" },
      { label: "MOM", value: "0" },
    ],
  },
];

const AWARDS = [
  {
    Icon: Crown,
    tone: "accent",
    title: "MOM 어워드",
    body: "참석자 70% 이상 투표로, 신뢰도 높은 MVP를 자동 선정합니다.",
  },
  {
    Icon: Award,
    tone: "info",
    title: "시즌 시상 7종",
    body: "득점왕·도움왕·철벽·개근·올라운더 등 7개 부문 자동 집계.",
  },
  {
    Icon: TrendingUp,
    tone: "success",
    title: "커리어 프로필",
    body: "베스트 모먼트 · 시즌 누적 · 랭킹을 한 페이지로 정리합니다.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      delay: i * 0.08,
    },
  }),
};

function useCountUp(target: number, start: boolean, duration = 1200) {
  const [val, setVal] = useState(start ? target : 0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return val;
}

/* ------------------------------------------------------------------ */
/* Sub-section wrappers                                                */
/* ------------------------------------------------------------------ */

type Tone = "primary" | "accent" | "info" | "warning";

function Eyebrow({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const map = {
    primary: ["hsl(var(--primary) / 0.13)", "hsl(var(--primary) / 0.30)", "hsl(var(--primary))"],
    accent: ["hsl(var(--accent) / 0.13)", "hsl(var(--accent) / 0.30)", "hsl(var(--accent))"],
    info: ["hsl(var(--info) / 0.13)", "hsl(var(--info) / 0.30)", "hsl(var(--info))"],
    warning: ["hsl(var(--warning) / 0.14)", "hsl(var(--warning) / 0.32)", "hsl(var(--warning))"],
  } as const;
  const [bg, border, fg] = map[tone];
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] tracking-[0.18em] whitespace-nowrap"
      style={{ fontFamily: "'Bebas Neue', sans-serif", background: bg, border: `1px solid ${border}`, color: fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: fg }} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sub 1 — Core 3                                                      */
/* ------------------------------------------------------------------ */

function VoteCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const v0 = useCountUp(VOTE_DATA[0].pct, inView);
  const v1 = useCountUp(VOTE_DATA[1].pct, inView);
  const v2 = useCountUp(VOTE_DATA[2].pct, inView);
  const counts = [v0, v1, v2];

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={0}
      className="fs-card relative rounded-[20px] p-[22px] lg:p-[26px] flex flex-col min-h-[380px] lg:min-h-[420px]"
      style={{
        background: "hsl(var(--card) / 0.7)",
        backdropFilter: "blur(14px)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.30)",
            color: "hsl(var(--primary))",
          }}
        >
          <CheckSquare className="w-[22px] h-[22px]" strokeWidth={2} />
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide whitespace-nowrap"
          style={{
            background: "hsl(var(--success) / 0.14)",
            border: "1px solid hsl(var(--success) / 0.30)",
            color: "hsl(var(--success))",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-current"
            style={{ animation: "fs-pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite" }}
          />
          LIVE
        </span>
      </div>
      <h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1.5">참석 투표</h3>
      <p className="text-muted-foreground text-[13.5px] leading-[1.55] mb-4">
        링크 한 번이면 끝. 다음 6경기까지 한 화면에서 한 번에 응답, 일정마다 투표 다시 올릴 일 X.
      </p>

      <div
        className="flex items-center gap-2 px-2.5 py-2 rounded-[10px] mb-3 overflow-hidden"
        style={{
          background: "hsl(var(--background) / 0.5)",
          border: "1px dashed hsl(var(--primary) / 0.4)",
          color: "hsl(var(--primary))",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "12px",
          letterSpacing: "0.1em",
        }}
      >
        <LinkIcon className="w-3 h-3 shrink-0" />
        <span className="truncate">pitchmst.kr/v/x9k2m4</span>
      </div>

      <div className="flex flex-col gap-2.5 mt-auto">
        {VOTE_DATA.map((row, i) => (
          <div key={row.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="w-14 font-semibold shrink-0">{row.label}</span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: "hsl(var(--secondary) / 0.6)" }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={inView ? { width: `${row.pct}%` } : {}}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                  background:
                    row.kind === "go"
                      ? "linear-gradient(90deg, hsl(var(--success)), hsl(var(--info)))"
                      : row.kind === "no"
                      ? "hsl(var(--warning) / 0.7)"
                      : "hsl(var(--muted-foreground) / 0.5)",
                }}
              />
            </div>
            <span
              className="w-10 text-right text-muted-foreground font-bold tabular-nums shrink-0"
            >
              {counts[i]}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SettleCard() {
  return (
    <motion.div
      variants={fadeUp}
      custom={1}
      className="fs-card relative rounded-[20px] p-[22px] lg:p-[26px] flex flex-col min-h-[380px] lg:min-h-[420px]"
      style={{
        background: "hsl(var(--card) / 0.7)",
        backdropFilter: "blur(14px)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "hsl(var(--info) / 0.12)",
            border: "1px solid hsl(var(--info) / 0.30)",
            color: "hsl(var(--info))",
          }}
        >
          <CreditCard className="w-[22px] h-[22px]" strokeWidth={2} />
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--info) / 0.18), hsl(var(--primary) / 0.16))",
            border: "1px solid hsl(var(--info) / 0.32)",
            color: "hsl(var(--info))",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.12em",
          }}
        >
          AI OCR
        </span>
      </div>
      <h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1.5">회비 정산</h3>
      <p className="text-muted-foreground text-[13.5px] leading-[1.55] mb-4">
        은행 앱 캡처 한 장이면 끝. AI가 입금자 자동 매칭, 휴면·부상 회원은 자동 면제까지.
      </p>

      <div className="flex flex-col gap-1.5 mb-3">
        {SETTLERS.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between px-2.5 py-2 rounded-[8px] text-[12.5px]"
            style={{
              background: "hsl(var(--background) / 0.4)",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="flex items-center min-w-0 flex-1">
              <span
                className="w-3.5 h-3.5 rounded mr-2 flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--success) / 0.18)", color: "hsl(var(--success))" }}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="font-semibold whitespace-nowrap">{s.name}</span>
            </div>
            <span style={{ color: "hsl(var(--success))", fontWeight: 700 }} className="tabular-nums whitespace-nowrap shrink-0 ml-2">
              +{s.amt.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div
        className="relative mt-auto flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--info) / 0.08), hsl(var(--primary) / 0.06))",
          border: "1px solid hsl(var(--info) / 0.25)",
          color: "hsl(var(--muted-foreground))",
          fontSize: "12px",
        }}
      >
        <span
          aria-hidden
          className="fs-scan absolute inset-y-0"
          style={{
            width: "30%",
            left: "-30%",
            background:
              "linear-gradient(90deg, transparent, hsl(var(--info) / 0.35), transparent)",
            animation: "fs-scan-anim 2.4s linear infinite",
            pointerEvents: "none",
          }}
        />
        <FileSpreadsheet className="w-[18px] h-[18px] shrink-0" style={{ color: "hsl(var(--info))" }} />
        <span>
          <b className="text-foreground font-semibold">카뱅 거래내역.xlsx</b> · 4건 자동 매칭됨
        </span>
      </div>
    </motion.div>
  );
}

function AutoLineupCard() {
  return (
    <motion.div
      variants={fadeUp}
      custom={2}
      className="fs-card relative rounded-[20px] p-[22px] lg:p-[26px] flex flex-col min-h-[380px] lg:min-h-[420px]"
      style={{
        background: "hsl(var(--card) / 0.7)",
        backdropFilter: "blur(14px)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "hsl(var(--accent) / 0.14)",
            border: "1px solid hsl(var(--accent) / 0.32)",
            color: "hsl(var(--accent))",
          }}
        >
          <Target className="w-[22px] h-[22px]" strokeWidth={2} />
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--info) / 0.18), hsl(var(--primary) / 0.16))",
            border: "1px solid hsl(var(--info) / 0.32)",
            color: "hsl(var(--info))",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.12em",
          }}
        >
          AI COACH
        </span>
      </div>
      <h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1.5">AI 전술 편성</h3>
      <p className="text-muted-foreground text-[13.5px] leading-[1.55] mb-4">
        또 하나의 전술 감독 AI. 우리 팀 기록·상대팀 이력·참석자를 분석해 포메이션 추천 + 공정 쿼터 로테이션까지.
      </p>

      {/* SVG 미니 피치 — 카드 균형용 */}
      <div
        className="relative mt-auto rounded-xl overflow-hidden"
        style={{
          aspectRatio: "16 / 11",
          background: "hsl(152 42% 30%)",
          backgroundImage: [
            "repeating-linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0) 16px, rgba(255,255,255,0.07) 16px, rgba(255,255,255,0.07) 32px)",
            "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
          ].join(", "),
          border: "1px solid hsl(var(--border))",
        }}
      >
        <span
          className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white"
          style={{
            background: "hsl(var(--info) / 0.85)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.1em",
            backdropFilter: "blur(4px)",
          }}
        >
          <Sparkles className="w-[9px] h-[9px]" />
          4-3-3 자동
        </span>
        {/* 외곽선 */}
        <span
          className="absolute"
          style={{ inset: "8px", border: "1.5px solid hsl(0 0% 100% / 0.55)", borderRadius: "4px" }}
        />
        {/* 센터라인 (가로 — 좌우 골 방향) */}
        <span
          className="absolute"
          style={{
            left: "50%",
            top: "8px",
            bottom: "8px",
            width: "1.5px",
            background: "hsl(0 0% 100% / 0.55)",
            transform: "translateX(-50%)",
          }}
        />
        {/* 센터서클 */}
        <span
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "26%",
            aspectRatio: "1",
            border: "1.5px solid hsl(0 0% 100% / 0.55)",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* 좌측 페널티 박스 */}
        <span
          className="absolute"
          style={{
            left: "8px",
            top: "30%",
            bottom: "30%",
            width: "12%",
            border: "1.5px solid hsl(0 0% 100% / 0.55)",
            borderLeft: "none",
          }}
        />
        {/* 우측 페널티 박스 */}
        <span
          className="absolute"
          style={{
            right: "8px",
            top: "30%",
            bottom: "30%",
            width: "12%",
            border: "1.5px solid hsl(0 0% 100% / 0.55)",
            borderRight: "none",
          }}
        />
        {[
          ["8%", "50%", "GK", 0.0],
          ["24%", "18%", "LB", 0.1],
          ["24%", "38%", "CB", 0.15],
          ["24%", "62%", "CB", 0.2],
          ["24%", "82%", "RB", 0.25],
          ["48%", "28%", "LM", 0.35],
          ["48%", "50%", "CM", 0.4],
          ["48%", "72%", "RM", 0.45],
          ["76%", "22%", "LW", 0.55],
          ["76%", "50%", "ST", 0.6],
          ["76%", "78%", "RW", 0.65],
        ].map(([l, t, label, d], i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: d as number }}
            className="absolute flex items-center justify-center font-extrabold text-white"
            style={{
              left: l as string,
              top: t as string,
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(16 70% 44%))",
              border: "2px solid hsl(var(--background))",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              fontSize: "10px",
              letterSpacing: "0.02em",
            }}
          >
            {label as string}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

function CoreFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <div className="mb-24 lg:mb-32">
      <motion.div initial="hidden" animate={inView ? "show" : "hidden"} variants={fadeUp} ref={ref}>
        <Eyebrow tone="primary">핵심 기능</Eyebrow>
      </motion.div>
      <motion.h2
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={1}
        className="font-extrabold leading-[1.12] tracking-[-0.03em] text-balance mt-[18px] mb-3.5"
        style={{ fontSize: "clamp(30px, 5.4vw, 52px)" }}
      >
        총무가 매주 하는 일,{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
        >
          세 가지로 끝.
        </span>
      </motion.h2>
      <motion.p
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={2}
        className="text-muted-foreground text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[620px] text-pretty m-0"
      >
        참석 투표 · 회비 정산 · 경기 편성. 세 가지 작업이 PitchMaster에서 어떻게 끝나는지 살펴보세요.
      </motion.p>

      <motion.div
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="mt-12 lg:mt-14 grid gap-[18px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
      >
        <VoteCard />
        <SettleCard />
        <AutoLineupCard />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub 2 — Smart Lineup hero                                           */
/* ------------------------------------------------------------------ */

function SmartLineup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-20% 0px" });

  return (
    <div className="mb-24 lg:mb-32" ref={ref}>
      <motion.div initial="hidden" animate={inView ? "show" : "hidden"} variants={fadeUp}>
        <Eyebrow tone="accent">AI 라인업</Eyebrow>
      </motion.div>

      <motion.div
        ref={heroRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={heroInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-7 rounded-[24px] overflow-hidden p-6 lg:p-10"
        style={{
          border: "1px solid hsl(var(--border))",
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--accent) / 0.06), transparent 60%), hsl(var(--card))",
        }}
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-10 lg:gap-14">
          {/* 좌측 텍스트 컬럼 */}
          <div>
            <motion.h2
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              variants={fadeUp}
              custom={1}
              className="font-extrabold leading-[1.12] tracking-[-0.03em] text-balance mb-4"
              style={{ fontSize: "clamp(28px, 4.8vw, 44px)" }}
            >
              버튼 한 번으로 완성하는{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--warning)))",
                }}
              >
                전술 보드
              </span>
            </motion.h2>
            <motion.p
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              variants={fadeUp}
              custom={2}
              className="text-muted-foreground text-[15px] lg:text-[16.5px] leading-[1.6] text-pretty m-0 mb-6"
            >
              AI가 우리 팀 기록·상대팀 이력·참석자를 분석해 포메이션 추천 + 11명 자동 배치.
              드래그로 재조정도 한 번이면 충분.
            </motion.p>

            {/* 핵심 포인트 3가지 */}
            <motion.ul
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="list-none p-0 m-0 flex flex-col gap-3"
            >
              {[
                { fg: "hsl(var(--success))", text: "🟢 표시 = 선호 포지션 자동 매칭" },
                { fg: "hsl(var(--accent))", text: "공정 쿼터 로테이션 (벤치 편중 X)" },
                { fg: "hsl(var(--info))", text: "상대팀 맞대결 이력 반영" },
              ].map((it) => (
                <motion.li
                  key={it.text}
                  variants={fadeUp}
                  className="flex items-center gap-2.5 text-[14px] text-foreground/85"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: it.fg, boxShadow: `0 0 6px ${it.fg}` }}
                  />
                  {it.text}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* 우측 전술판 — 모바일·PC 모두 셀 안에서 가운데 정렬 */}
          <div className="w-full max-w-[360px] mx-auto md:w-[340px] md:max-w-none">
            <TacticsBoardReplica />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TacticsBoardReplica — 실 앱 TacticsBoard 시각 복제 (portrait 4:5)    */
/* ------------------------------------------------------------------ */

const FORMATION_433: Array<{ x: number; y: number; pos: string; name: string; jerseyPrimary: string; jerseySecondary: string; isMatched: boolean }> = [
  // 4-3-3 — 전체 포메이션 -3% 왼쪽 시프트, 중앙선(ST/CM/GK) -4 추가
  { x: 44, y: 12, pos: "ST", name: "서진우", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 16, y: 22, pos: "LW", name: "신민혁", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 75, y: 22, pos: "RW", name: "오세훈", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: false },
  { x: 22, y: 44, pos: "LM", name: "최성진", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 44, y: 48, pos: "CM", name: "한도현", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 69, y: 44, pos: "RM", name: "임재호", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: false },
  { x: 8, y: 66, pos: "LB", name: "이준혁", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 32, y: 70, pos: "CB", name: "박지훈", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 56, y: 70, pos: "CB", name: "정수민", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: true },
  { x: 80, y: 66, pos: "RB", name: "강우진", jerseyPrimary: "#e8613a", jerseySecondary: "#ffffff", isMatched: false },
  { x: 44, y: 84, pos: "GK", name: "김민수", jerseyPrimary: "#fbbf24", jerseySecondary: "#1a1a1a", isMatched: true },
];

function Jersey({ primary, secondary, label }: { primary: string; secondary: string; label: string }) {
  // 완벽 대칭 단일 path t-shirt — 모든 좌표가 center 16 기준 거울상
  return (
    <svg viewBox="0 0 32 32" className="block w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <filter id="js-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#js-shadow)">
        {/* 단일 path t-shirt — 좌우 완전 대칭 (좌:우 = 4:28, 8:24, 11:21, 13:19) */}
        <path
          d="
            M 4 8
            L 11 5
            L 13 5
            L 14 7
            L 18 7
            L 19 5
            L 21 5
            L 28 8
            L 26 12
            L 22 11
            L 22 27
            Q 22 28 21 28
            L 11 28
            Q 10 28 10 27
            L 10 11
            L 6 12
            Z
          "
          fill={primary}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.4"
        />
        {/* 깃 V — 중앙 (13~19, center 16) */}
        <path d="M 13 5 L 16 8 L 19 5 Z" fill={secondary} opacity="0.85" />
      </g>
      {/* 포지션 라벨 — 본체 중앙 (y 6~27, center 16.5) */}
      <text
        x="16"
        y="19"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="7"
        fontWeight="800"
        fill={secondary}
        style={{ letterSpacing: "0.02em" }}
      >
        {label}
      </text>
    </svg>
  );
}

function TacticsBoardReplica() {
  return (
    <div className="relative w-full aspect-[4/5]">
      {/* 외곽 라운드 + 그림자 */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden border-2 border-white/20"
        style={{
          boxShadow: "0 24px 50px -20px rgba(0,0,0,0.6), 0 8px 20px -8px rgba(0,0,0,0.3)",
          background: "hsl(152 40% 28%)",
          backgroundImage: [
            "repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 28px, rgba(255,255,255,0.06) 28px, rgba(255,255,255,0.06) 56px)",
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 4px)",
            "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
          ].join(", "),
        }}
      >
        {/* 경기장 외곽선 */}
        <div className="absolute inset-3 rounded-sm border-2 border-white/50" />
        {/* 센터라인 */}
        <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-px bg-white/30" />
        {/* 센터서클 */}
        <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/50" />
        {/* 센터스팟 */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
        {/* 상단 페널티 박스 + 골 에어리어 + 페널티 아크 */}
        <div className="absolute inset-x-[20%] top-3 h-[16%] border-2 border-t-0 border-white/50" />
        <div className="absolute inset-x-[32%] top-3 h-[8%] border-2 border-t-0 border-white/50" />
        <div className="absolute left-1/2 top-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/50" />
        {/* 하단 페널티 박스 + 골 에어리어 + 페널티 아크 */}
        <div className="absolute inset-x-[20%] bottom-3 h-[16%] border-2 border-b-0 border-white/50" />
        <div className="absolute inset-x-[32%] bottom-3 h-[8%] border-2 border-b-0 border-white/50" />
        <div className="absolute left-1/2 bottom-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/50" />
        {/* 코너 아크 4개 */}
        <div className="absolute left-3 top-3 h-4 w-4 rounded-br-full border-b-2 border-r-2 border-white/50" />
        <div className="absolute right-3 top-3 h-4 w-4 rounded-bl-full border-b-2 border-l-2 border-white/50" />
        <div className="absolute bottom-3 left-3 h-4 w-4 rounded-tr-full border-r-2 border-t-2 border-white/50" />
        <div className="absolute bottom-3 right-3 h-4 w-4 rounded-tl-full border-l-2 border-t-2 border-white/50" />

        {/* 11명 jersey + 이름 */}
        {FORMATION_433.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.4, y: 6 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.1 + i * 0.07,
            }}
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
              width: "13%",
              minWidth: 36,
            }}
          >
            <div className="relative w-full aspect-square mx-auto">
              <Jersey primary={p.jerseyPrimary} secondary={p.jerseySecondary} label={p.pos} />
            </div>
            <span
              className="rounded text-white whitespace-nowrap text-center"
              style={{
                background: p.isMatched
                  ? "hsl(var(--success))"
                  : "rgba(0,0,0,0.65)",
                boxShadow: p.isMatched
                  ? "0 0 0 2px hsl(var(--success)), 0 0 10px hsl(var(--success) / 0.6)"
                  : "none",
                fontSize: 10.5,
                fontWeight: 800,
                lineHeight: 1.2,
                padding: "1px 5px",
                letterSpacing: "-0.02em",
                textShadow: p.isMatched ? "none" : "0 1px 2px rgba(0,0,0,0.5)",
              }}
              title={p.isMatched ? "선호 포지션과 일치" : undefined}
            >
              {p.name}
            </span>
          </motion.div>
        ))}

        {/* 상단 chip — 쿼터·포메이션 */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10.5px] font-bold">
          <span
            className="px-2 py-0.5 rounded text-white"
            style={{
              background: "hsl(0 0% 0% / 0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            2쿼터 · 4-3-3
          </span>
          <span className="text-white/40 text-[9px] tracking-[0.06em]">PitchMaster</span>
        </div>
      </div>

      {/* 좌하단 매칭 레전드 */}
      <div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--success) / 0.4)",
          boxShadow: "0 4px 12px -4px rgba(0,0,0,0.4)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "hsl(var(--success))" }}
        />
        <span className="text-[10.5px] font-semibold" style={{ color: "hsl(var(--success))" }}>
          🟢 = 선호 포지션 자동 매칭 · 7명
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub 3 — Role guide                                                  */
/* ------------------------------------------------------------------ */

function RoleGuide() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <div className="mb-24 lg:mb-32" ref={ref}>
      <motion.div initial="hidden" animate={inView ? "show" : "hidden"} variants={fadeUp}>
        <Eyebrow tone="info">역할 가이드</Eyebrow>
      </motion.div>
      <motion.h2
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={1}
        className="font-extrabold leading-[1.12] tracking-[-0.03em] text-balance mt-[18px] mb-3.5"
        style={{ fontSize: "clamp(30px, 5.4vw, 52px)" }}
      >
        "나 이 포지션인데{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--info)), hsl(var(--success)))" }}
        >
          뭐 해야 돼?
        </span>
        "
      </motion.h2>
      <motion.p
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={2}
        className="text-muted-foreground text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[620px] text-pretty m-0"
      >
        24 포지션 × 10 포메이션. 쿼터별 내 역할과 연결 플레이까지 한 카드로 정리됩니다.
      </motion.p>

      <motion.div
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="mt-14 grid gap-[18px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[22px]"
      >
        {ROLES.map((r, i) => (
          <motion.div
            key={r.pos + i}
            variants={fadeUp}
            custom={i}
            className="flex flex-col rounded-[18px] p-5 min-h-[240px] transition-[transform,border-color] duration-300"
            style={{
              background: "hsl(var(--card) / 0.7)",
              backdropFilter: "blur(14px)",
              border: "1px solid hsl(var(--info) / 0.25)",
            }}
          >
            <span
              className="self-start mb-2.5 px-2 py-1 rounded-md whitespace-nowrap"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.16em",
                color: "hsl(var(--info))",
                background: "hsl(var(--info) / 0.12)",
                border: "1px solid hsl(var(--info) / 0.30)",
              }}
            >
              {r.quarter}
            </span>
            <div className="flex items-baseline gap-2 mb-2 whitespace-nowrap">
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "18px",
                  color: "hsl(var(--muted-foreground))",
                  letterSpacing: "0.08em",
                }}
              >
                {r.formation}
              </span>
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "28px",
                  color: "hsl(var(--foreground))",
                  letterSpacing: "0.04em",
                }}
              >
                {r.pos}
              </span>
            </div>
            <h4 className="text-[16px] font-bold tracking-[-0.01em] mb-2.5">"{r.title}"</h4>
            <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
              {r.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-[13px] leading-[1.5] text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className="w-1 h-1 rounded-full shrink-0 mt-2"
                    style={{ background: "hsl(var(--info))" }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={4}
        className="mt-7 flex items-center gap-3 px-5 py-4 rounded-[14px] text-[14px]"
        style={{
          background: "linear-gradient(135deg, hsl(var(--info) / 0.10), hsl(var(--accent) / 0.08))",
          border: "1px solid hsl(var(--info) / 0.30)",
        }}
      >
        <Bell className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--info))" }} />
        <span>
          투표 마감되면 <b className="font-bold">당신의 예상 역할이 푸시로 도착</b>합니다.
        </span>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub 4 — Player Cards & Awards                                       */
/* ------------------------------------------------------------------ */

function PlayerCardsAndAwards() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <div ref={ref}>
      <motion.div initial="hidden" animate={inView ? "show" : "hidden"} variants={fadeUp}>
        <Eyebrow tone="warning">선수 카드</Eyebrow>
      </motion.div>
      <motion.h2
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={1}
        className="font-extrabold leading-[1.12] tracking-[-0.03em] text-balance mt-[18px] mb-3.5"
        style={{ fontSize: "clamp(30px, 5.4vw, 52px)" }}
      >
        경기 끝나면{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--warning)))" }}
        >
          카드가 만들어집니다
        </span>
      </motion.h2>
      <motion.p
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={2}
        className="text-muted-foreground text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[620px] text-pretty m-0"
      >
        자동 생성되는 시즌 카드 + 시상 7종. 동기 부여는 알아서 해결됩니다.
      </motion.p>

      <motion.div
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={fadeUp}
        custom={3}
        className="mt-14 px-6 py-12 lg:px-12 lg:py-16 rounded-[28px]"
        style={{
          background:
            "radial-gradient(ellipse at top, hsl(var(--accent) / 0.06), transparent 60%)," +
            "hsl(240 6% 4%)",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <span
          className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--accent) / 0.18), hsl(var(--warning) / 0.16))",
            border: "1px solid hsl(var(--accent) / 0.40)",
            color: "hsl(var(--accent))",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.18em",
          }}
        >
          <Sparkles className="w-3 h-3" />
          TAP THE CARD · 홀로그래픽 라이브
        </span>

        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {PLAYER_CARDS.map((c, i) => (
            <motion.div
              key={c.playerName}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-full max-w-[260px]">
                <PlayerCard {...c} />
              </div>
              <span className="text-[10px] tracking-[0.2em] font-bold text-white/40">
                {c.rarity} · OVR {c.ovr}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-3.5 grid-cols-1 sm:grid-cols-3">
          {AWARDS.map((a) => {
            const tone = a.tone;
            const colorMap: Record<string, [string, string, string]> = {
              accent: ["hsl(var(--accent) / 0.14)", "hsl(var(--accent) / 0.30)", "hsl(var(--accent))"],
              info: ["hsl(var(--info) / 0.14)", "hsl(var(--info) / 0.30)", "hsl(var(--info))"],
              success: ["hsl(var(--success) / 0.14)", "hsl(var(--success) / 0.30)", "hsl(var(--success))"],
            };
            const [bg, border, fg] = colorMap[tone];
            return (
              <div
                key={a.title}
                className="flex items-start gap-3 px-4.5 py-4 rounded-[14px] transition-colors duration-300"
                style={{
                  padding: "16px 18px",
                  background: "hsl(var(--card) / 0.6)",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div
                  className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: bg, border: `1px solid ${border}`, color: fg }}
                >
                  <a.Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h5 className="text-[14px] font-bold tracking-[-0.01em] m-0 mb-1">{a.title}</h5>
                  <p className="text-[12.5px] text-muted-foreground m-0 leading-[1.45]">{a.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section root                                                        */
/* ------------------------------------------------------------------ */

export default function FeaturesSection() {
  return (
    <MotionConfig reducedMotion="user">
      <style jsx global>{`
        @keyframes fs-pulse-ring {
          0% { box-shadow: 0 0 0 0 hsl(var(--success) / 0.5); }
          100% { box-shadow: 0 0 0 8px hsl(var(--success) / 0); }
        }
        @keyframes fs-pulse-dot {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fs-scan-anim {
          0% { left: -30%; }
          100% { left: 130%; }
        }
        .fs-card { transition: transform 320ms cubic-bezier(.16,1,.3,1), border-color 320ms, box-shadow 320ms; }
        .fs-card:hover { transform: translateY(-4px); border-color: hsl(var(--primary) / 0.40); box-shadow: 0 24px 60px -24px rgba(0,0,0,0.5); }
      `}</style>

      <section
        id="features"
        className="relative py-16 lg:py-24 px-5 lg:px-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, hsl(var(--primary) / 0.08), transparent 60%)," +
            "radial-gradient(ellipse 60% 30% at 50% 100%, hsl(var(--accent) / 0.06), transparent 60%)," +
            "hsl(var(--background))",
        }}
      >
        <div className="max-w-[1280px] mx-auto" style={{ wordBreak: "keep-all" }}>
          <CoreFeatures />
          <SmartLineup />
          <RoleGuide />
          <PlayerCardsAndAwards />
        </div>
      </section>
    </MotionConfig>
  );
}
