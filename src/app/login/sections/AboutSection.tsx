"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  MessageSquare,
  Calculator,
  Wallet,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const itemAnim = (animate: boolean, i: number = 0) => ({
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: animate
    ? { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE, delay: 0.05 + i * 0.08 } }
    : { opacity: 0, y: 18, scale: 0.97 },
});

/* ── Inline emphasis ── */

function BebasTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block align-baseline"
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        letterSpacing: "0.04em",
        padding: "0 8px 2px",
        borderRadius: 6,
        background: "hsl(var(--primary) / 0.10)",
        color: "hsl(var(--primary))",
        lineHeight: 1.1,
        fontSize: "0.92em",
        transform: "translateY(-0.04em)",
      }}
    >
      {children}
    </span>
  );
}

function CoralUL({
  children,
  thick = 2,
  offset = 6,
}: {
  children: React.ReactNode;
  thick?: number;
  offset?: number;
}) {
  return (
    <span
      style={{
        textDecoration: "underline",
        textDecorationColor: "hsl(var(--primary))",
        textDecorationThickness: thick,
        textUnderlineOffset: offset,
      }}
    >
      {children}
    </span>
  );
}

/* ── Inline ops list (inside MAIN) ── */

function OpsItem({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        className="h-[14px] w-[14px] shrink-0"
        style={{ color: "hsl(var(--primary) / 0.7)" }}
      />
      <span
        style={{
          color: "hsl(var(--foreground))",
          fontSize: "clamp(14px, 1.3vw, 15px)",
          wordBreak: "keep-all",
        }}
      >
        {label}
      </span>
    </span>
  );
}

/* ── TIME card ── */

function TimeCard({ animate, idx = 0 }: { animate: boolean; idx?: number }) {
  return (
    <motion.div
      {...itemAnim(animate, idx)}
      className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] p-7"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--card) / 0.6) 0%, hsl(var(--primary) / 0.10) 100%)",
        border: "1px solid hsl(var(--primary) / 0.40)",
        boxShadow: "0 8px 32px -16px hsl(var(--primary) / 0.30)",
      }}
    >
      {/* eyebrow */}
      <div className="flex items-center gap-2">
        <motion.span
          aria-hidden
          animate={
            animate
              ? { opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }
              : undefined
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "hsl(var(--primary))",
            boxShadow: "0 0 8px hsl(var(--primary) / 0.7)",
          }}
        />
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.22em",
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
          }}
        >
          WEEKLY OPERATING TIME
        </span>
      </div>

      {/* before */}
      <div className="mt-7 flex flex-col gap-2">
        <span
          className="leading-none whitespace-nowrap"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(38px, 5.2vw, 56px)",
            color: "hsl(var(--muted-foreground))",
            opacity: 0.55,
            filter: "saturate(0.6)",
            letterSpacing: 0,
            fontWeight: 800,
          }}
        >
          1
          <span
            style={{
              fontFamily: "'Pretendard', ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.4em",
              fontWeight: 600,
              marginLeft: "0.18em",
              marginRight: "0.32em",
            }}
          >
            시간
          </span>
          20
          <span
            style={{
              fontFamily: "'Pretendard', ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.4em",
              fontWeight: 600,
              marginLeft: "0.18em",
            }}
          >
            분
          </span>
        </span>
        <div
          className="relative h-[6px] w-full overflow-hidden rounded-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--muted) / 0.4) 0%, hsl(var(--muted-foreground) / 0.5) 50%, hsl(var(--muted) / 0.4) 100%)",
            opacity: 1,
          }}
        >
          <motion.div
            initial={animate ? { width: "0%" } : false}
            animate={
              animate
                ? {
                    width: "100%",
                    transition: { duration: 0.7, ease: EASE, delay: 0.4 },
                  }
                : { width: "100%" }
            }
            className="h-full"
            style={{
              background:
                "repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.20) 0 4px, transparent 4px 8px)",
            }}
          />
        </div>
      </div>

      {/* hand-drawn arrow */}
      <div className="mt-3 flex items-center">
        <svg
          aria-hidden
          width="44"
          height="14"
          viewBox="0 0 44 14"
          fill="none"
        >
          <defs>
            <linearGradient
              id="arrow-grad"
              x1="0"
              y1="0"
              x2="44"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="hsl(var(--primary))" />
              <stop offset="1" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path
            d="M2 8 C 12 2, 24 12, 38 6"
            stroke="url(#arrow-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M32 2 L 39 6 L 33 11"
            stroke="url(#arrow-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* after */}
      <div className="mt-3 flex items-center gap-3">
        <motion.span
          initial={animate ? { opacity: 0, scale: 0.85 } : false}
          animate={
            animate
              ? {
                  opacity: 1,
                  scale: [0.85, 1.05, 1],
                  transition: {
                    delay: 0.65,
                    duration: 0.6,
                    ease: EASE,
                    times: [0, 0.6, 1],
                  },
                }
              : { opacity: 1, scale: 1 }
          }
          className="bg-clip-text text-transparent leading-none whitespace-nowrap"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(46px, 6.6vw, 72px)",
            fontWeight: 800,
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            letterSpacing: 0,
          }}
        >
          1
          <span
            style={{
              fontFamily: "'Pretendard', ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.42em",
              fontWeight: 700,
              marginLeft: "0.18em",
              marginRight: "0.32em",
            }}
          >
            분
          </span>
          34
          <span
            style={{
              fontFamily: "'Pretendard', ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.42em",
              fontWeight: 700,
              marginLeft: "0.18em",
            }}
          >
            초
          </span>
        </motion.span>

        <span
          className="relative inline-flex shrink-0 rounded-full"
          style={{ width: 14, height: 6 }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
          <span
            className="relative inline-block h-full w-full rounded-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              boxShadow: "0 0 14px hsl(var(--primary) / 0.7)",
            }}
          />
        </span>
      </div>

      {/* footer label */}
      <p
        className="mt-6"
        style={{
          fontSize: "clamp(13px, 1.2vw, 13.5px)",
          color: "hsl(var(--muted-foreground))",
          fontWeight: 500,
          wordBreak: "keep-all",
        }}
      >
        회장 업무시간이{" "}
        <span style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>
          단축
        </span>
        됐습니다.
      </p>
    </motion.div>
  );
}

/* ── PROMISE card ── */

function PromiseCard({ animate, idx = 0 }: { animate: boolean; idx?: number }) {
  return (
    <motion.div
      {...itemAnim(animate, idx)}
      className="relative h-full overflow-hidden rounded-[20px] p-7"
      style={{
        background: "hsl(var(--card) / 0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <motion.span
        aria-hidden
        className="absolute left-0 top-0 rounded-r-full"
        style={{ width: 3, background: "hsl(var(--primary))" }}
        initial={animate ? { height: "0%" } : false}
        animate={
          animate
            ? {
                height: "100%",
                transition: { duration: 0.7, ease: EASE, delay: 0.4 },
              }
            : { height: "100%" }
        }
      />
      <div className="relative">
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.22em",
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
          }}
        >
          THE PROMISE
        </span>
        <p
          className="mt-3 font-bold"
          style={{
            fontSize: "clamp(16px, 1.5vw, 17px)",
            lineHeight: 1.55,
            color: "hsl(var(--foreground))",
            wordBreak: "keep-all",
            textWrap: "pretty" as React.CSSProperties["textWrap"],
          }}
        >
          불필요한 기능은 <CoralUL thick={2}>하나도 없습니다</CoralUL>.
        </p>
        <p
          className="mt-3 font-medium"
          style={{
            fontSize: "clamp(16px, 1.5vw, 17px)",
            lineHeight: 1.6,
            color: "hsl(var(--foreground))",
            wordBreak: "keep-all",
            textWrap: "pretty" as React.CSSProperties["textWrap"],
          }}
        >
          <CoralUL thick={2}>조기축구·풋살에만</CoralUL> — 5년 동안 매주 직접
          손으로 하던 모든 운영 노동을 다 담았습니다.
        </p>
      </div>
    </motion.div>
  );
}

/* ── MAIN card (Big editorial quote) ── */

function MainCard({ animate, idx = 0 }: { animate: boolean; idx?: number }) {
  return (
    <motion.figure
      {...itemAnim(animate, idx)}
      className="relative h-full overflow-hidden rounded-[20px] p-7 lg:p-8"
      style={{
        background: "hsl(var(--card) / 0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 8px 40px -16px hsl(var(--background))",
      }}
    >
      {/* corner deco — coral quarter circle */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: -30,
          bottom: -30,
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle at 100% 100%, hsl(var(--primary) / 0.30), transparent 65%)",
          opacity: 0.9,
        }}
      />

      <div className="relative flex h-full flex-col">
        {/* big open quote */}
        <span
          aria-hidden
          className="leading-none select-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 80,
            color: "hsl(var(--primary) / 0.30)",
            fontWeight: 800,
            marginLeft: -4,
            marginBottom: -8,
          }}
        >
          “
        </span>

        {/* pull quote */}
        <p
          className="font-medium"
          style={{
            fontSize: "clamp(20px, 2.6vw, 28px)",
            lineHeight: 1.45,
            letterSpacing: "-0.01em",
            color: "hsl(var(--foreground))",
            wordBreak: "keep-all",
            textWrap: "balance" as React.CSSProperties["textWrap"],
          }}
        >
          <BebasTag>5년</BebasTag> 동안 조기축구 회장 하면서,{" "}
          <BebasTag>매주 몇 시간씩</BebasTag> 사라졌습니다.
        </p>

        {/* inline ops list */}
        <div
          className="mt-5 flex flex-wrap items-center"
          style={{
            color: "hsl(var(--muted-foreground))",
            columnGap: 18,
            rowGap: 10,
          }}
        >
          <OpsItem icon={MessageSquare} label="출석 — 카톡 투표 매번 생성" />
          <span
            aria-hidden
            style={{ color: "hsl(var(--border))", fontSize: 13 }}
          >
            ·
          </span>
          <OpsItem icon={Calculator} label="쿼터 — 엑셀로 분배 계산" />
          <span
            aria-hidden
            style={{ color: "hsl(var(--border))", fontSize: 13 }}
          >
            ·
          </span>
          <OpsItem icon={Wallet} label="회비 — 엑셀 + 단톡방" />
          <span
            aria-hidden
            style={{ color: "hsl(var(--border))", fontSize: 13 }}
          >
            ·
          </span>
          <OpsItem icon={ScrollText} label="기록 — 흩어진 거 다시 엑셀" />
        </div>

        {/* divider */}
        <hr
          className="mt-7 border-0"
          style={{
            height: 1,
            width: "80%",
            background: "hsl(var(--border))",
          }}
        />

        {/* magazine bold callout */}
        <div className="mt-6 flex items-baseline gap-3 flex-wrap">
          <span
            className="font-extrabold"
            style={{
              fontSize: "clamp(22px, 3vw, 32px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
              wordBreak: "keep-all",
            }}
          >
            그래서
          </span>
          <svg
            aria-hidden
            width="44"
            height="10"
            viewBox="0 0 44 10"
            fill="none"
            style={{ alignSelf: "center" }}
          >
            <defs>
              <linearGradient
                id="dash-grad"
                x1="0"
                y1="0"
                x2="44"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="hsl(var(--primary))" />
                <stop offset="1" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path
              d="M2 5 C 14 1, 30 9, 42 5"
              stroke="url(#dash-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span
            className="font-extrabold"
            style={{
              fontSize: "clamp(22px, 3vw, 32px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
              wordBreak: "keep-all",
            }}
          >
            <CoralUL thick={3} offset={6}>
              직접
            </CoralUL>{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              만들었습니다
            </span>
            .
          </span>
        </div>

        <div className="flex-1" />

        {/* signature */}
        <figcaption
          className="mt-6 flex items-center justify-end gap-3"
          style={{
            fontSize: 13,
            color: "hsl(var(--muted-foreground))",
            wordBreak: "keep-all",
          }}
        >
          <svg
            aria-hidden
            width="40"
            height="8"
            viewBox="0 0 40 8"
            fill="none"
          >
            <defs>
              <linearGradient
                id="sig-grad"
                x1="0"
                y1="0"
                x2="40"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset="0"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0"
                />
                <stop offset="1" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <path
              d="M1 5 C 8 1, 14 7, 22 3 S 34 6, 39 2"
              stroke="url(#sig-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span style={{ transform: "rotate(-1deg)", display: "inline-block" }}>
            — PitchMaster 만든 사람 / 조기축구 5년 운영
          </span>
        </figcaption>
      </div>
    </motion.figure>
  );
}

/* ── Section ── */

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const animate = reduce ? true : inView;

  return (
    <section
      ref={ref}
      id="about"
      className="relative w-full overflow-hidden py-20 lg:py-28"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 80% 30%, hsl(var(--primary) / 0.04), transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card) / 0.15) 50%, hsl(var(--background)) 100%)",
      }}
    >
      <div className="relative mx-auto w-full max-w-[1080px] px-5 lg:px-14">
        <div className="flex flex-col">
          {/* Row A — eyebrow / headline / subline */}
          <motion.div
            {...itemAnim(animate, 0)}
            className="flex items-center gap-3"
          >
            <span
              aria-hidden
              style={{
                width: 24,
                height: 1,
                background: "hsl(var(--primary))",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: "0.20em",
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              WHO BUILT IT
            </span>
          </motion.div>

          <motion.h2
            {...itemAnim(animate, 1)}
            className="mt-4 font-extrabold"
            style={{
              fontSize: "clamp(30px, 5.4vw, 52px)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "hsl(var(--foreground))",
              wordBreak: "keep-all",
              textWrap: "balance" as React.CSSProperties["textWrap"],
            }}
          >
            <span
              style={{
                textDecoration: "underline",
                textDecorationColor: "hsl(var(--primary))",
                textDecorationThickness: 3,
                textUnderlineOffset: 8,
              }}
            >
              5년
            </span>{" "}
            회장이 직접{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              갈아넣었습니다
            </span>
            .
          </motion.h2>

          <motion.p
            {...itemAnim(animate, 2)}
            className="mt-4 max-w-[640px]"
            style={{
              fontSize: "clamp(16px, 1.4vw, 17px)",
              lineHeight: 1.6,
              color: "hsl(var(--muted-foreground))",
              wordBreak: "keep-all",
              textWrap: "pretty" as React.CSSProperties["textWrap"],
            }}
          >
            다른 앱이 절대 따라할 수 없는 정통성 — 5년 동안 매주 직접 부딪힌
            결과물입니다.
          </motion.p>

          {/* Row B — Bento grid (asymmetric: right column self-start) */}
          <div className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-8">
              <MainCard animate={animate} idx={3} />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3 lg:gap-5 self-start">
              <TimeCard animate={animate} idx={4} />
              <PromiseCard animate={animate} idx={5} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
