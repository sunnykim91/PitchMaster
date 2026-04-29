"use client";

/**
 * FinalCtaSection — 페이지 끝, 전환 마무리.
 *
 * "이번 주 금요일, 갠톡 5통 대신 링크 하나"
 * - 코랄 메쉬 그라디언트 + 떠다니는 hint 카드
 * - "금요일" 그라데이션 흐름 무한 반복
 * - 5개 카톡 말풍선 → 1개 링크로 합쳐지는 모션 (1회, 1.5s)
 * - 80팀 워드마크 배경 좌→우 50s
 * - CTA hover 시 conic flowing border (Hero CTA 결)
 */

import { ReactNode, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Link2 } from "lucide-react";

export type FinalCtaSectionProps = {
  kakaoButton: ReactNode;
  demoButton: ReactNode;
};

const TEAM_WORDMARKS = [
  "FCMZ", "FK Rebirth", "FC서순", "시즌FC", "N.F.C", "F.S.T",
  "FC더베스트", "조기축구1팀", "리버풀FC", "토요FC", "S.F.C",
  "FC양천", "FC강남", "FC송파", "FC도원", "F.M.Z", "FC서초",
];

export default function FinalCtaSection({
  kakaoButton,
  demoButton,
}: FinalCtaSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();

  return (
    <section
      ref={ref}
      id="final-cta"
      className="relative overflow-hidden py-28 lg:py-40 px-5 lg:px-14"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 22% 18%, hsl(var(--primary) / 0.22), transparent 60%)," +
          "radial-gradient(ellipse 50% 50% at 85% 35%, hsl(40 95% 60% / 0.12), transparent 60%)," +
          "radial-gradient(ellipse 60% 40% at 50% 110%, hsl(var(--accent) / 0.18), transparent 65%)," +
          "linear-gradient(180deg, hsl(240 8% 5%) 0%, hsl(var(--background)) 50%, hsl(240 10% 4%) 100%)",
        wordBreak: "keep-all",
      }}
    >
      {/* Wordmark flowing background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[8%] left-0 flex gap-10 whitespace-nowrap font-display text-[clamp(40px,6vw,80px)] tracking-[0.04em] opacity-[0.04]"
          style={{
            color: "hsl(var(--foreground))",
            animation: reduced ? undefined : "fc-marquee 50s linear infinite",
          }}
        >
          {[...TEAM_WORDMARKS, ...TEAM_WORDMARKS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div
          className="absolute bottom-[10%] left-0 flex gap-10 whitespace-nowrap font-display text-[clamp(40px,6vw,80px)] tracking-[0.04em] opacity-[0.04]"
          style={{
            color: "hsl(var(--foreground))",
            animation: reduced ? undefined : "fc-marquee-rev 70s linear infinite",
          }}
        >
          {[...TEAM_WORDMARKS, ...TEAM_WORDMARKS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      {/* Floating hint cards */}
      <FloatingChip
        text="✓ 참석 투표 18/22"
        className="hidden lg:flex absolute top-[18%] left-[8%]"
        delay={0.6}
        reduced={!!reduced}
      />
      <FloatingChip
        text="🏆 MVP 푸시 전송됨"
        className="hidden lg:flex absolute bottom-[20%] right-[10%]"
        delay={0.9}
        reduced={!!reduced}
      />

      <div className="relative max-w-[1080px] mx-auto text-center">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
          style={{
            background: "hsl(var(--primary) / 0.13)",
            border: "1px solid hsl(var(--primary) / 0.30)",
            color: "hsl(var(--primary))",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          GET STARTED
        </span>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-extrabold leading-[1.06] mt-5"
          style={{
            fontSize: "clamp(36px, 6.5vw, 76px)",
            letterSpacing: "-0.035em",
            textWrap: "balance",
          }}
        >
          이번 주{" "}
          <span
            className="bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(90deg, hsl(var(--primary)), hsl(40 95% 60%), hsl(var(--primary)))",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: reduced ? undefined : "fc-grad-flow 4s ease-in-out infinite",
            }}
          >
            금요일,
          </span>
          <br />
          갠톡 <span style={{ color: "hsl(var(--destructive))" }}>5통</span> 대신{" "}
          <span style={{ color: "hsl(var(--primary))" }}>링크 하나</span>
        </motion.h2>

        {/* 5→1 visual */}
        <FiveToOne inView={inView} reduced={!!reduced} />

        <p
          className="mt-6 text-[16px] lg:text-[18px] leading-[1.6] mx-auto"
          style={{
            color: "hsl(var(--muted-foreground))",
            maxWidth: 620,
            textWrap: "pretty",
          }}
        >
          조기축구 5년차 총무가 직접 만들어 쓰는 앱.
          <br />
          현재 무료, 팀원 초대도 링크 하나면 끝.
        </p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={reduced ? { duration: 0 } : { duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <CtaShell primary>{kakaoButton}</CtaShell>
          <CtaShell>{demoButton}</CtaShell>
        </motion.div>

        {/* Reassurance */}
        <p
          className="mt-6 text-[12.5px] tracking-[0.04em]"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          무료 · 광고 없음 · 카카오 계정으로 바로 시작
        </p>

        {/* Maker signature */}
        <div
          className="mt-12 inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
          style={{
            background: "hsl(var(--card) / 0.55)",
            border: "1px solid hsl(var(--border))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center font-display text-[10px]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(16 70% 44%))",
              color: "white",
            }}
          >
            김
          </span>
          <span
            className="text-[12.5px]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Made by{" "}
            <b style={{ color: "hsl(var(--foreground))", fontWeight: 700 }}>김선휘</b>
            <span className="opacity-60"> · 조기축구 5년차 회장</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fc-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fc-marquee-rev {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes fc-grad-flow {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fc-orbit-conic {
          to { --fc-a: 360deg; }
        }
      `}</style>
    </section>
  );
}

/* ── 5 KaTok bubbles → 1 link ── */
function FiveToOne({ inView, reduced }: { inView: boolean; reduced: boolean }) {
  // 5 bubbles fan out, then converge into the link chip in the center.
  const bubbles = [
    { x: -200, y: -20, label: "참석?" },
    { x: -110, y:  18, label: "갠톡" },
    { x:    0, y: -28, label: "지훈?" },
    { x:  110, y:  18, label: "확인" },
    { x:  200, y: -10, label: "ㅇㅋ" },
  ];

  return (
    <div className="relative mx-auto mt-10 h-[100px] lg:h-[110px]" style={{ maxWidth: 620 }}>
      {bubbles.map((b, i) => (
        <motion.span
          key={i}
          initial={{
            x: b.x,
            y: b.y,
            opacity: 0,
            scale: 0.85,
          }}
          animate={
            reduced
              ? { x: 0, y: 0, opacity: 0, scale: 0.85 }
              : inView
              ? { x: [b.x, b.x, 0], y: [b.y, b.y, 0], opacity: [0, 1, 0], scale: [0.85, 1, 0.6] }
              : { x: b.x, y: b.y, opacity: 0, scale: 0.85 }
          }
          transition={{
            duration: 1.6,
            delay: 0.3 + i * 0.05,
            times: [0, 0.45, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-2xl text-[12.5px] font-bold whitespace-nowrap"
          style={{
            background: "hsl(50 95% 60% / 0.92)",
            color: "hsl(240 10% 12%)",
            boxShadow: "0 6px 18px -8px hsl(50 95% 60% / 0.5)",
          }}
        >
          {b.label}
        </motion.span>
      ))}

      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={
          reduced
            ? { scale: 1, opacity: 1 }
            : inView
            ? { scale: [0.4, 0.4, 1.08, 1], opacity: [0, 0, 1, 1] }
            : { scale: 0.4, opacity: 0 }
        }
        transition={{
          duration: 1.6,
          delay: 0.3,
          times: [0, 0.55, 0.85, 1],
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold whitespace-nowrap"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)), hsl(16 70% 44%))",
          color: "hsl(var(--primary-foreground))",
          fontSize: 14,
          boxShadow:
            "0 12px 30px -10px hsl(var(--primary) / 0.55), inset 0 0 0 1px hsl(0 0% 100% / 0.18)",
        }}
      >
        <Link2 className="w-4 h-4" strokeWidth={2.5} />
        pitch-master.app/team/FCMZ
      </motion.span>
    </div>
  );
}

/* ── shells ── */
function CtaShell({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <div
      className="relative inline-flex group"
      style={{
        ["--fc-a" as string]: "0deg",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          padding: 1.5,
          background: primary
            ? "conic-gradient(from var(--fc-a, 0deg), hsl(var(--primary)), hsl(40 95% 60%), hsl(var(--accent)), hsl(var(--primary)))"
            : "conic-gradient(from var(--fc-a, 0deg), hsl(var(--info)), hsl(var(--primary)), hsl(var(--info)))",
          WebkitMask:
            "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "fc-orbit-conic 4s linear infinite",
        }}
      />
      <span className="relative">{children}</span>
    </div>
  );
}

function FloatingChip({
  text,
  className,
  delay,
  reduced,
}: {
  text: string;
  className?: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              opacity: { duration: 0.6, delay },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
            }
      }
      className={`${className ?? ""} items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-bold backdrop-blur-md`}
      style={{
        background: "hsl(var(--card) / 0.7)",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--foreground))",
        boxShadow: "0 8px 24px -10px hsl(0 0% 0% / 0.4)",
      }}
    >
      {text}
    </motion.div>
  );
}
