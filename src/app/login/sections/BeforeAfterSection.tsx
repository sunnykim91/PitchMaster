"use client";

/**
 * BeforeAfterSection (v5)
 *
 * Goal: 총무의 고통 3가지 → PitchMaster의 해결을 정면 충돌 비교.
 * Visual contract:
 *   - Headline: "총무 1시간 20분 → 1분 34초" (red→coral, Bebas accent)
 *   - 3 rows · 각 row = Before card / arrow / After card
 *   - 카드 = head (icon + category + tag) · 큰 인용 · 우측 큰 시간 숫자(Bebas)
 *   - Before: desaturated · 살짝 어둡게 (filter: saturate(0.7) + opacity 0.92)
 *   - After:  full saturation · coral hint border + soft glow
 *   - Center arrow: red→coral 그라디언트 + hover 발광 · 모바일 90deg 회전
 *   - Summary box: "1시간 20분 → 1분 34초 · 한 잔 마실 시간이 생깁니다"
 *
 * Tokens (project globals.css):
 *   --background, --foreground, --muted, --muted-foreground, --border
 *   --primary (coral), --destructive, --success, --info, --accent
 *
 * No props · standalone block · drop into login/sections.
 */

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type CSSProperties, type ReactNode } from "react";

/* ───────────────────────── data ───────────────────────── */

type Side = "before" | "after";
type Pair = { quote: string; time: string };
type Item = { id: string; category: string; before: Pair; after: Pair };

const ITEMS: Item[] = [
  {
    id: "attendance",
    category: "참석 확인",
    before: { quote: "카톡에 물어보고, 읽씹, 결국 갠톡", time: "30분" },
    after:  { quote: "링크 하나 → 실시간 자동 집계",    time: "30초" },
  },
  {
    id: "dues",
    category: "회비 정산",
    before: { quote: "통장 캡쳐 → 엑셀 → 이름 대조",    time: "40분" },
    after:  { quote: "캡쳐 올리면 AI가 자동 인식·매칭",  time: "40초" },
  },
  {
    id: "lineup",
    category: "선수 배치",
    before: { quote: "종이에 끄적, 현장에서 다시 뒤집기",  time: "10분" },
    after:  { quote: "포지션·전적 기반 자동 라인업",       time: "24초" },
  },
];

/* ───────────────────────── icons ───────────────────────── */

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function CardHead({ category, variant }: { category: string; variant: Side }) {
  const isBefore = variant === "before";
  const tone = isBefore ? "destructive" : "success";
  return (
    <div className="ba5-card-head">
      <span className="ba5-cat-icon" style={{
        background: `hsl(var(--${tone}) / 0.14)`,
        color: `hsl(var(--${tone}))`,
        border: `1px solid hsl(var(--${tone}) / 0.28)`,
      }}>
        {isBefore ? <ChatIcon /> : <SparkIcon />}
      </span>
      <div className="ba5-cat-text">
        <span className="ba5-cat-label">{category}</span>
        <span className="ba5-tag" style={{
          background: `hsl(var(--${tone}) / ${isBefore ? 0.12 : 0.14})`,
          color: `hsl(var(--${tone}))`,
          border: `1px solid hsl(var(--${tone}) / ${isBefore ? 0.32 : 0.36})`,
        }}>
          {isBefore ? "BEFORE" : "AFTER"}
        </span>
      </div>
    </div>
  );
}

function ArrowConnector() {
  return (
    <div className="ba5-arrow" aria-hidden>
      <svg className="ba5-arrow-svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
        {/* 정중앙 chevron — viewBox 24x24, 컨텐츠 x=8~16 (center=12) 완벽 대칭 */}
        <path
          d="M6 4 L18 12 L6 20"
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ComparisonRow({ item, idx }: { item: Item; idx: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <div className="ba5-row-wrapper" ref={ref}>
      {/* 모바일 전용 카테고리 헤더 — 데스크톱에서 숨김 */}
      <div className="ba5-mobile-header">
        <span className="ba5-mobile-cat-icon" aria-hidden>
          <ChatIcon />
        </span>
        {item.category}
      </div>
      <div className="ba5-row">
        <motion.div
          className="ba5-card ba5-card-before"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={inView ? { opacity: 0.92, y: 0 } : undefined}
          transition={{ duration: 0.55, delay: 0.06 * idx, ease: [0.16, 1, 0.3, 1] }}
        >
          <CardHead category={item.category} variant="before" />
          <p className="ba5-quote">{item.before.quote}</p>
          <div className="ba5-time ba5-time-before">{item.before.time}</div>
          <div className="ba5-time-label">소요 시간</div>
        </motion.div>

        <ArrowConnector />

        <motion.div
          className="ba5-card ba5-card-after"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.55, delay: 0.06 * idx + 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <CardHead category={item.category} variant="after" />
          <p className="ba5-quote">{item.after.quote}</p>
          <div className="ba5-time ba5-time-after">{item.after.time}</div>
          <div className="ba5-time-label">소요 시간</div>
        </motion.div>
      </div>
    </div>
  );
}

/* ───────────────────────── section ───────────────────────── */

export default function BeforeAfterSection() {
  const sumRef = useRef<HTMLDivElement>(null);
  const sumIn = useInView(sumRef, { once: true, margin: "-60px 0px" });
  const reduced = useReducedMotion();

  return (
    <section className="ba5-section" aria-labelledby="ba5-title">
      {/* faint kakao-bubble watermark */}
<div className="ba5-inner">
        <span className="ba5-eyebrow">
          <span className="ba5-eyebrow-dot" />
          총무의 현실
        </span>
        <h2 id="ba5-title" className="ba5-headline">
          <span className="ba5-from">총무 1시간 20분</span>
          <span className="ba5-arr">→</span>
          <span className="ba5-to">1분 34초</span>
        </h2>
        <p className="ba5-lead">
          카톡 단톡방, 갠톡, 통장 캡쳐, 새벽 엑셀 정리 — 이거 하나로 끝납니다.
        </p>

        <div className="ba5-rows">
          {ITEMS.map((item, i) => (
            <ComparisonRow key={item.id} item={item} idx={i} />
          ))}
        </div>

        <motion.div
          ref={sumRef}
          className="ba5-summary"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={sumIn ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ba5-sum-grid">
            <div className="ba5-sum-col">
              <span className="ba5-sum-label">매주 쓰던 시간</span>
              <span className="ba5-sum-from">1시간 20분</span>
            </div>
            <svg className="ba5-sum-arr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden>
              <path
                d="M6 4 L18 12 L6 20"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="ba5-sum-col">
              <span className="ba5-sum-label">PitchMaster 사용 후</span>
              <span className="ba5-sum-to">1분 34초</span>
            </div>
          </div>
          <p className="ba5-sum-sub">
            운영에 쓰던 <b>매주 1시간 18분</b>, 그라운드 위 우리 팀에 더 쓰세요.
          </p>
        </motion.div>
      </div>

      <Styles />
    </section>
  );
}

/* ───────────────────────── styles ───────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      .ba5-section {
        position: relative;
        padding: 80px 20px 80px;
        overflow: hidden;
        background:
          radial-gradient(800px 400px at 20% 10%, hsl(var(--destructive) / 0.06), transparent 60%),
          radial-gradient(700px 380px at 85% 95%, hsl(var(--primary) / 0.07), transparent 60%),
          hsl(var(--background));
      }
      @media (min-width: 1024px) {
        .ba5-section { padding: 112px 56px 112px; }
      }

      .ba5-bg-bubbles {
        position: absolute; inset: 0;
        pointer-events: none;
        opacity: 0.05;
        overflow: hidden;
      }
      .ba5-bg-bubble {
        position: absolute;
        border-radius: 16px 16px 16px 4px;
        background: hsl(0 0% 100%);
        color: hsl(0 0% 0% / 0.6);
        font-size: 12px;
        padding: 8px 12px;
        white-space: nowrap;
      }
      .ba5-bg-bubble-r { border-radius: 16px 16px 4px 16px; }
      .ba5-bg-bubble:nth-child(1) { top: 8%;  left: 6%; }
      .ba5-bg-bubble:nth-child(2) { top: 22%; right: 8%; }
      .ba5-bg-bubble:nth-child(3) { top: 60%; left: 4%; }
      .ba5-bg-bubble:nth-child(4) { top: 80%; right: 12%; }

      .ba5-inner { position: relative; max-width: 1180px; margin: 0 auto; }

      .ba5-eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        background: hsl(var(--destructive) / 0.12);
        border: 1px solid hsl(var(--destructive) / 0.30);
        color: hsl(var(--destructive));
        font-family: var(--font-bebas, "Bebas Neue"), system-ui, sans-serif;
        font-size: 13px;
        letter-spacing: 0.16em;
        white-space: nowrap;
      }
      .ba5-eyebrow-dot {
        width: 6px; height: 6px; border-radius: 999px;
        background: hsl(var(--destructive));
        box-shadow: 0 0 0 4px hsl(var(--destructive) / 0.18);
      }

      .ba5-headline {
        margin: 16px 0 14px;
        font-size: clamp(28px, 5vw, 52px);
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.12;
        text-wrap: balance;
      }
      .ba5-from { color: hsl(var(--destructive)); }
      .ba5-to   { color: hsl(var(--success)); }
      .ba5-arr {
        display: inline-block;
        color: hsl(var(--muted-foreground));
        font-weight: 700;
        margin: 0 8px;
        transform: translateY(-2px);
      }
      .ba5-lead {
        color: hsl(var(--muted-foreground));
        font-size: clamp(15px, 1.6vw, 18px);
        line-height: 1.6;
        max-width: 720px;
        margin: 0 0 56px;
      }

      .ba5-rows { display: flex; flex-direction: column; gap: 14px; }
      @media (min-width: 1024px) { .ba5-rows { gap: 28px; } }

      /* 모바일: 한 row가 한 카드 (안에 카테고리 헤더 + Before·화살표·After 2-col) */
      .ba5-row-wrapper {
        border-radius: 18px;
        background: hsl(220 12% 11%);
        border: 1px solid hsl(var(--border) / 0.5);
        padding: 14px;
      }
      @media (min-width: 1024px) {
        .ba5-row-wrapper {
          background: transparent;
          border: none;
          padding: 0;
        }
      }

      .ba5-mobile-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: hsl(var(--foreground));
        margin-bottom: 10px;
        letter-spacing: -0.01em;
      }
      .ba5-mobile-cat-icon {
        width: 22px; height: 22px;
        border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        background: hsl(var(--primary) / 0.14);
        color: hsl(var(--primary));
        border: 1px solid hsl(var(--primary) / 0.28);
        flex-shrink: 0;
      }
      .ba5-mobile-cat-icon svg { width: 12px; height: 12px; }
      @media (min-width: 1024px) {
        .ba5-mobile-header { display: none; }
      }

      .ba5-row {
        display: grid;
        grid-template-columns: 1fr 36px 1fr;
        gap: 6px;
        align-items: stretch;
      }
      @media (min-width: 1024px) {
        .ba5-row { grid-template-columns: 1fr 76px 1fr; gap: 0; }
      }

      .ba5-card {
        position: relative;
        border-radius: 14px;
        padding: 12px;
        border: 1px solid hsl(var(--border) / 0.08);
        background: hsl(var(--muted) / 0.45);
        backdrop-filter: blur(6px);
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto auto;
        column-gap: 10px;
        row-gap: 6px;
        min-height: 0;
        transition:
          transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
          filter 0.4s ease,
          opacity 0.4s ease,
          border-color 0.3s ease,
          box-shadow 0.3s ease;
      }
      @media (min-width: 1024px) {
        .ba5-card {
          padding: 22px 24px;
          min-height: 184px;
          column-gap: 22px;
          border-radius: 18px;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto 1fr auto;
          row-gap: 12px;
        }
      }

      .ba5-card-before {
        background:
          linear-gradient(135deg, hsl(var(--destructive) / 0.05), transparent 60%),
          hsl(220 12% 11%);
        border-color: hsl(var(--destructive) / 0.16);
        filter: saturate(0.7);
      }
      .ba5-card-before:hover { filter: saturate(1); opacity: 1 !important; }

      .ba5-card-after {
        background:
          linear-gradient(135deg, hsl(var(--success) / 0.08), transparent 55%),
          linear-gradient(180deg, hsl(220 14% 13%), hsl(220 14% 10%));
        border-color: hsl(var(--success) / 0.32);
        box-shadow:
          0 1px 0 0 hsl(var(--success) / 0.10) inset,
          0 24px 40px -28px hsl(var(--success) / 0.40),
          0 0 0 1px hsl(var(--success) / 0.06);
      }
      .ba5-card-after:hover {
        transform: translateY(-2px);
        border-color: hsl(var(--success) / 0.45);
      }

      .ba5-card-head {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .ba5-cat-icon {
        width: 30px; height: 30px;
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .ba5-cat-text {
        display: flex; align-items: center; gap: 10px;
        min-width: 0;
      }
      .ba5-cat-label {
        display: none; /* 모바일: wrapper header에서 표시. 데스크톱은 아래 미디어쿼리에서 inline */
        font-size: 13px; font-weight: 600;
        color: hsl(var(--foreground) / 0.86);
        letter-spacing: -0.01em;
        white-space: nowrap;
      }
      @media (min-width: 1024px) {
        .ba5-cat-label { display: inline; }
      }
      /* 모바일: 카테고리 아이콘도 숨김 (wrapper header에서 표시) */
      @media (max-width: 1023px) {
        .ba5-cat-icon { display: none; }
      }
      .ba5-tag {
        font-family: var(--font-bebas, "Bebas Neue"), system-ui, sans-serif;
        font-size: 11px;
        letter-spacing: 0.16em;
        padding: 2px 8px;
        border-radius: 999px;
        line-height: 1.4;
        white-space: nowrap;
      }

      .ba5-quote {
        position: relative;
        grid-column: 1;
        grid-row: 2;
        align-self: center;
        margin: 0;
        padding-left: 18px;
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.42;
        letter-spacing: -0.018em;
        color: hsl(var(--foreground));
        text-wrap: pretty;
        word-break: keep-all;
      }
      @media (min-width: 1024px) {
        .ba5-quote { font-size: 24px; line-height: 1.34; padding-left: 30px; }
      }
      .ba5-quote::before {
        content: "“";
        position: absolute;
        left: -2px; top: 4px;
        font-family: var(--font-bebas, "Bebas Neue"), Georgia, serif;
        font-size: 28px;
        line-height: 1;
        color: hsl(var(--foreground) / 0.22);
        pointer-events: none;
      }
      @media (min-width: 1024px) {
        .ba5-quote::before { font-size: 48px; top: 0; }
      }
      .ba5-card-before .ba5-quote::before { color: hsl(var(--destructive) / 0.32); }
      .ba5-card-after  .ba5-quote::before { color: hsl(var(--success) / 0.42); }

      .ba5-time {
        grid-column: 1;
        grid-row: 3;
        align-self: end;
        justify-self: start;
        text-align: left;
        line-height: 0.9;
        font-family: var(--font-bebas, "Bebas Neue"), system-ui, sans-serif;
        font-size: 28px;
        letter-spacing: 0.01em;
        font-feature-settings: "tnum" 1;
        margin-top: 6px;
      }
      .ba5-time-before { color: hsl(var(--destructive)); }
      .ba5-time-after  { color: hsl(var(--success)); }
      @media (min-width: 1024px) {
        .ba5-time {
          grid-column: 2;
          grid-row: 2 / 4;
          align-self: end;
          justify-self: end;
          text-align: right;
          font-size: clamp(48px, 7vw, 56px);
          margin-top: 0;
        }
      }
      .ba5-time-label {
        grid-column: 1;
        grid-row: 4;
        align-self: start;
        justify-self: start;
        font-size: 9px;
        letter-spacing: 0.12em;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        margin-top: 0;
      }
      @media (min-width: 1024px) {
        .ba5-time-label {
          grid-column: 2;
          grid-row: 4;
          justify-self: end;
          font-size: 11px;
          margin-top: 2px;
        }
      }

      .ba5-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      .ba5-arrow-svg {
        width: 22px; height: 22px;
        flex-shrink: 0;
        transform: rotate(0deg);
        transition: filter 0.3s ease;
      }
      @media (min-width: 1024px) {
        .ba5-arrow-svg { width: 36px; height: 36px; }
      }
      .ba5-row:hover .ba5-arrow-svg {
        filter: drop-shadow(0 0 12px hsl(var(--success) / 0.6));
      }

      .ba5-summary {
        margin-top: 28px;
        padding: 24px 20px;
        border-radius: 20px;
        border: 1px solid hsl(var(--success) / 0.28);
        background:
          radial-gradient(600px 200px at 50% 0%, hsl(var(--success) / 0.10), transparent 70%),
          hsl(220 14% 11%);
        text-align: center;
        overflow: hidden;
        position: relative;
      }
      @media (min-width: 1024px) { .ba5-summary { margin-top: 56px; padding: 36px 28px; } }

      /* 누적 박스 그리드 — 모바일: 세로 stack + 아래 화살표 / 데스크톱: 가로 + 오른 화살표 */
      .ba5-sum-grid {
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: auto;
        gap: 12px;
        align-items: center;
        justify-items: center;
        font-feature-settings: "tnum" 1;
      }
      @media (min-width: 768px) {
        .ba5-sum-grid {
          grid-template-columns: 1fr auto 1fr;
          gap: 16px 24px;
        }
      }

      .ba5-sum-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .ba5-sum-label {
        font-family: "Pretendard", system-ui, sans-serif;
        font-size: 12.5px;
        color: hsl(var(--muted-foreground));
        letter-spacing: -0.01em;
        font-weight: 500;
      }
      .ba5-sum-from {
        color: hsl(var(--destructive));
        font-size: clamp(36px, 6vw, 56px);
        font-family: var(--font-bebas, "Bebas Neue"), system-ui, sans-serif;
        line-height: 1;
        letter-spacing: 0.01em;
      }
      .ba5-sum-to {
        color: hsl(var(--success));
        font-size: clamp(44px, 7vw, 64px);
        font-family: var(--font-bebas, "Bebas Neue"), system-ui, sans-serif;
        line-height: 1;
        letter-spacing: 0.01em;
      }
      .ba5-sum-arr {
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        transform: rotate(90deg); /* 모바일: 세로 stack이라 ↓ */
      }
      @media (min-width: 768px) {
        .ba5-sum-arr {
          width: 36px;
          height: 36px;
          transform: rotate(0deg); /* 데스크톱: 가로 → */
        }
      }

      .ba5-sum-sub {
        margin: 14px 0 0;
        font-family: "Pretendard", system-ui, sans-serif;
        font-size: clamp(13px, 1.4vw, 15px);
        color: hsl(var(--muted-foreground));
        line-height: 1.55;
      }
      .ba5-sum-sub b { color: hsl(var(--foreground)); font-weight: 700; }
    `}</style>
  );
}
