"use client";

/**
 * BeforeAfterSection
 *
 * 카톡으로 운영하던 총무의 고통 3가지를 PitchMaster가 어떻게 바꿨는지
 * Before(destructive) ↔ After(success) 강한 시각적 충돌·대비로 보여줌.
 * Hero 바로 아래, HowItWorks 위에 배치.
 */

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  MessageSquare,
  CreditCard,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";

const ITEMS = [
  {
    icon: MessageSquare,
    category: "참석 확인",
    before: { quote: "카톡에 물어보고, 읽씹, 결국 갠톡", time: "30분" },
    after:  { quote: "링크 하나 → 실시간 자동 집계",       time: "30초" },
  },
  {
    icon: CreditCard,
    category: "회비 정산",
    before: { quote: "통장 캡쳐 → 엑셀 → 이름 대조",        time: "30분" },
    after:  { quote: "캡쳐 올리면 AI가 자동 인식·매칭",      time: "1분" },
  },
  {
    icon: LayoutGrid,
    category: "선수 배치",
    before: { quote: "경기장 도착 후 즉석 편성 + \"왜 나만 수비?\" 클레임", time: "20분" },
    after:  { quote: "선호 포지션 기반 자동 배치 + AI 감독 코칭",          time: "3초" },
  },
];

const BUBBLES = [
  { text: "지훈아 너 토요일 와?",   pos: { top: "12%", left: "4%"  }, rot: -3 },
  { text: "ㅇㅇ",                    pos: { top: "24%", right: "6%" }, rot:  2 },
  { text: "지훈이는 아직 답이 없어요", pos: { top: "52%", left: "8%"  }, rot: -1 },
  { text: "3만원 입금했습니다",      pos: { top: "68%", right: "4%" }, rot:  3 },
  { text: "왜 또 나만 수비예요…",    pos: { bottom: "8%", left: "18%" }, rot: -2 },
];

export default function BeforeAfterSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = useReducedMotion();

  const itemAnim = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: reduced
      ? { duration: 0 }
      : { duration: 0.6, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] },
  });

  const cumAnim = {
    initial: { opacity: 0, y: 20 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: reduced
      ? { duration: 0 }
      : { duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <section
      ref={ref}
      id="before-after"
      className="relative overflow-hidden py-24 lg:py-32 px-5 lg:px-14"
      style={{
        background: `
          radial-gradient(ellipse 80% 40% at 20% 0%, hsl(var(--destructive) / 0.10), transparent 60%),
          radial-gradient(ellipse 80% 40% at 80% 100%, hsl(var(--success) / 0.10), transparent 60%),
          hsl(var(--background))
        `,
        wordBreak: "keep-all",
      }}
    >
      {/* faint kakao-style chat bubbles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="absolute hidden sm:block px-3.5 py-2 rounded-2xl text-[13px] whitespace-nowrap"
            style={{
              ...b.pos,
              transform: `rotate(${b.rot}deg)`,
              background: "hsl(var(--foreground) / 0.05)",
              border: "1px solid hsl(var(--foreground) / 0.06)",
              color: "hsl(var(--foreground))",
              opacity: 0.55,
              display: i === 1 || i === 3 ? undefined : "block",
            }}
          >
            {b.text}
          </div>
        ))}
      </div>

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
          style={{
            background: "hsl(var(--destructive) / 0.13)",
            border: "1px solid hsl(var(--destructive) / 0.32)",
            color: "hsl(var(--destructive))",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          총무의 현실
        </span>

        <h2
          className="font-extrabold leading-[1.12] my-4"
          style={{
            fontSize: "clamp(30px, 5.4vw, 52px)",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          이렇게{" "}
          <span
            style={{
              background: "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--success)))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            바뀝니다
          </span>
        </h2>

        <p
          className="text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[680px] m-0"
          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
        >
          카톡 단톡방, 갠톡, 통장 캡처, 새벽 엑셀 정리 — 이거 하나로 끝납니다.
        </p>

        <div className="mt-14 flex flex-col gap-[22px]">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={i}
                {...itemAnim(i)}
                className="grid grid-cols-1 lg:grid-cols-[1fr_64px_1fr] gap-3.5 lg:gap-4 items-stretch"
              >
                <BACard tone="before" Icon={Icon} category={it.category} {...it.before} />
                <ArrowCol inView={inView} reduced={!!reduced} />
                <BACard tone="after"  Icon={Icon} category={it.category} {...it.after} />
              </motion.div>
            );
          })}
        </div>

        {/* Cumulative box w/ flowing conic border */}
        <motion.div
          {...cumAnim}
          className="relative mt-14 rounded-[22px] overflow-hidden p-7"
          style={{
            background: "hsl(var(--card) / 0.72)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <ConicBorder reduced={!!reduced} />
          <div className="relative z-[1] grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-5 sm:gap-6 items-center">
            <div className="flex flex-col items-start">
              <span
                className="font-display text-[11px] tracking-[0.22em] mb-1.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                매주 총무가 쓰던 시간
              </span>
              <span
                className="font-display leading-[0.9]"
                style={{
                  fontSize: "clamp(40px, 6vw, 72px)",
                  color: "hsl(var(--destructive))",
                  textDecoration: "line-through",
                  textDecorationThickness: 2,
                  textDecorationColor: "hsl(var(--destructive) / 0.6)",
                }}
              >
                1시간 20분
              </span>
            </div>

            <div
              className="flex items-center justify-center sm:rotate-0 rotate-90"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <ArrowRight className="w-7 h-7 opacity-70" />
            </div>

            <div className="flex flex-col items-start">
              <span
                className="font-display text-[11px] tracking-[0.22em] mb-1.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                PitchMaster 사용 후
              </span>
              <span
                className="font-display leading-[0.9]"
                style={{
                  fontSize: "clamp(40px, 6vw, 72px)",
                  background: "linear-gradient(90deg, hsl(var(--success)), hsl(var(--info)))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                1분 34초
              </span>
            </div>

            <p
              className="text-sm leading-[1.5] m-0 self-end pb-1.5"
              style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
            >
              이제{" "}
              <b style={{ color: "hsl(var(--foreground))", fontWeight: 700 }}>
                한 잔 마실 시간
              </b>
              이 생깁니다.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── sub-components ── */

function BACard({
  tone,
  Icon,
  category,
  quote,
  time,
}: {
  tone: "before" | "after";
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  category: string;
  quote: string;
  time: string;
}) {
  const isBefore = tone === "before";
  const c = isBefore ? "destructive" : "success";
  return (
    <div
      className="relative p-5 lg:p-[22px] pb-5 rounded-[18px] flex flex-col transition-all duration-[280ms]"
      style={{
        background: `
          linear-gradient(180deg, hsl(var(--${c}) / 0.08), hsl(var(--${c}) / 0.02)),
          hsl(var(--card) / 0.7)
        `,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid hsl(var(--${c}) / 0.30)`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <span
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background: `hsl(var(--${c}) / 0.14)`,
            border: `1px solid hsl(var(--${c}) / 0.30)`,
            color: `hsl(var(--${c}))`,
          }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </span>
        <div>
          <div
            className="text-sm font-bold tracking-[0.02em]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {category}
          </div>
          <span
            className="font-display text-[11px] tracking-[0.20em] px-2.5 py-0.5 rounded-full whitespace-nowrap inline-block mt-1"
            style={{
              background: `hsl(var(--${c}) / 0.16)`,
              color: `hsl(var(--${c}))`,
              border: `1px solid hsl(var(--${c}) / 0.40)`,
            }}
          >
            {tone.toUpperCase()}
          </span>
        </div>
      </div>

      <p
        className="text-base font-bold leading-[1.45] my-1 mb-[18px]"
        style={{
          letterSpacing: "-0.01em",
          color: "hsl(var(--foreground))",
          textWrap: "pretty",
        }}
      >
        “{quote}”
      </p>

      <div className="mt-auto flex items-baseline gap-2">
        <span
          className="font-display text-[11px] tracking-[0.20em] uppercase"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          소요 시간
        </span>
        <span
          className="font-display ml-auto leading-[0.95]"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            letterSpacing: "0.01em",
            color: `hsl(var(--${c}))`,
            textShadow: `0 0 24px hsl(var(--${c}) / ${isBefore ? 0.25 : 0.30})`,
          }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}

function ArrowCol({ inView, reduced }: { inView: boolean; reduced: boolean }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      <motion.div
        initial={{ opacity: 0.2, x: -6 }}
        animate={
          reduced
            ? { opacity: 0.55, x: 0 }
            : inView
            ? { opacity: [0.2, 1, 0.55], x: [-6, 0, 0], color: ["hsl(var(--muted-foreground))", "hsl(var(--success))", "hsl(var(--muted-foreground))"] }
            : { opacity: 0.2, x: -6 }
        }
        transition={{ duration: 1.4, delay: 0.4, ease: "easeInOut" }}
        className="lg:rotate-0 rotate-90"
      >
        <ArrowRight className="w-7 h-7" />
      </motion.div>
    </div>
  );
}

function ConicBorder({ reduced }: { reduced: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[22px]"
      style={{
        padding: 1.5,
        background:
          "conic-gradient(from var(--a, 0deg), hsl(var(--destructive)) 0%, hsl(var(--accent)) 30%, hsl(var(--success)) 60%, hsl(var(--info)) 90%, hsl(var(--destructive)) 100%)",
        WebkitMask:
          "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animation: reduced ? undefined : "ba-conic-spin 8s linear infinite",
      }}
    >
      <style jsx>{`
        @property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes ba-conic-spin { to { --a: 360deg; } }
      `}</style>
    </div>
  );
}
