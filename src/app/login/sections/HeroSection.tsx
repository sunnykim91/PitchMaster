"use client";

/**
 * HeroSection v2 — premium polish
 *
 * Motion choreography (matches v2 demo, indices in ms):
 *    0   pill slide-down + fade
 *   80   word "매주 카톡 투표" lift+blur in
 *  160   "이제"
 *  240   "앱 한번이면" (gradient text)
 *  320   "끝."
 *  600   strikethrough draws L→R (0.5s)
 *  700   sub copy
 *  850   CTA pair
 * 1000   social proof + count-up starts
 * 1100   visual column slide-in + floating cards
 *
 * All animations honor `prefers-reduced-motion: reduce` via framer-motion's
 * <MotionConfig reducedMotion="user"> + CSS guards.
 */

import {
  motion,
  MotionConfig,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { KakaoLoginLink } from "@/components/KakaoLoginLink";
import DemoButton from "../DemoButton";

/* ------------------------------------------------------------------ *
 * Sub-hooks
 * ------------------------------------------------------------------ */

function usePointerTilt(max = 8) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const rx = useSpring(ty, { stiffness: 120, damping: 18, mass: 0.4 });
  const ry = useSpring(tx, { stiffness: 120, damping: 18, mass: 0.4 });

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tx.set(px * max);
      ty.set(-py * max);
    },
    [tx, ty, max]
  );
  const onLeave = useCallback(() => {
    tx.set(0);
    ty.set(0);
  }, [tx, ty]);

  return { wrapRef, rx, ry, onMove, onLeave };
}

function useCountUp(target: number, durationMs = 1500, startDelayMs = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setN(target);
      return;
    }
    let raf = 0;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, startDelayMs);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, startDelayMs]);
  return n;
}

function useRipple() {
  return useCallback((e: React.PointerEvent<HTMLElement>) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = "pm-ripple";
    const size = Math.max(r.width, r.height) * 1.2;
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - r.left - size / 2}px`;
    span.style.top = `${e.clientY - r.top - size / 2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 650);
  }, []);
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.08 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

const visualVariants: Variants = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export type HeroSectionProps = {
  teamCount: number;
  memberCount: number;
  teamSampleNames?: string[];
  dashboardSrc?: string;
  primaryCtaCopy?: string;
  kakaoEnabled: boolean;
  kakaoHref: string;
};

export default function HeroSection({
  teamCount,
  memberCount,
  teamSampleNames = ["FCMZ", "FC서순", "FK Rebirth", "시즌FC", "FCMZ 풋살"],
  dashboardSrc = "/screenshots/01-dashboard.png",
  primaryCtaCopy = "카카오로 무료 시작",
  kakaoEnabled,
  kakaoHref,
}: HeroSectionProps) {
  const { wrapRef, rx, ry, onMove, onLeave } = usePointerTilt(8);

  const { scrollY } = useScroll();
  const deviceScrollTilt = useTransform(scrollY, [0, 600], [0, -4]);
  const cardLineupY = useTransform(scrollY, [0, 600], [0, -24]);
  const cardCashY = useTransform(scrollY, [0, 600], [0, 16]);
  const cardMvpY = useTransform(scrollY, [0, 600], [0, -8]);

  const teamN = useCountUp(teamCount, 1500, 900);
  const memberN = useCountUp(memberCount, 1500, 900);

  const [cashTarget, setCashTarget] = useState(1_240_000);
  const cashN = useCountUp(cashTarget, 1800, 1300);

  const ripple = useRipple();

  return (
    <MotionConfig reducedMotion="user">
      <style jsx global>{`
        .pm-ripple {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          background: hsl(var(--kakao-foreground) / 0.15);
          transform: scale(0);
          animation: pm-ripple 600ms ease-out;
        }
        @keyframes pm-ripple {
          to { transform: scale(4); opacity: 0; }
        }
        @keyframes pm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes pm-grad-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pm-conic-rotate { to { transform: rotate(360deg); } }
        @keyframes pm-orb-float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-40px, 30px); }
          66% { transform: translate(30px, -20px); }
        }
        @keyframes pm-float-a {
          0%, 100% { transform: rotate(4deg) translate(0, 0); }
          50% { transform: rotate(4deg) translate(-6px, -10px); }
        }
        @keyframes pm-float-b {
          0%, 100% { transform: rotate(-4deg) translate(0, 0); }
          50% { transform: rotate(-4deg) translate(8px, -12px); }
        }
        @keyframes pm-float-c {
          0%, 100% { transform: rotate(-2deg) translate(0, 0); }
          50% { transform: rotate(-2deg) translate(-4px, 8px); }
        }
        @keyframes pm-pl-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes pm-ball-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .pm-anim { animation: none !important; }
        }
      `}</style>

      <section
        id="hero"
        className="relative min-h-screen flex items-center px-5 pt-24 pb-14 lg:px-14 lg:pt-32 lg:pb-20"
      >
        {/* ── background atmosphere ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -inset-[10%]"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 18% 12%, hsl(var(--primary) / 0.20), transparent 60%)," +
                "radial-gradient(ellipse 50% 50% at 85% 35%, hsl(var(--info) / 0.10), transparent 60%)," +
                "radial-gradient(ellipse 60% 40% at 50% 110%, hsl(152 40% 28% / 0.18), transparent 65%)," +
                "linear-gradient(180deg, hsl(240 8% 5%) 0%, hsl(var(--background)) 50%, hsl(240 10% 4%) 100%)",
            }}
          />
          <div
            className="absolute top-[10%] left-[8%] w-[520px] h-[520px] rounded-full blur-[40px] opacity-50"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 60%)",
            }}
          />
          <div
            className="pm-anim absolute top-[35%] -right-[8%] w-[520px] h-[520px] rounded-full blur-[40px] opacity-50"
            style={{
              background: "radial-gradient(circle, hsl(var(--info) / 0.30), transparent 60%)",
              animation: "pm-orb-float 14s ease-in-out infinite",
            }}
          />
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.05] text-foreground"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden
          >
            <circle cx="720" cy="450" r="92" />
            <circle cx="720" cy="450" r="2" fill="currentColor" />
            <line x1="720" y1="40" x2="720" y2="860" />
            <rect x="0" y="280" width="160" height="340" />
            <rect x="0" y="370" width="60" height="160" />
            <rect x="1280" y="280" width="160" height="340" />
            <rect x="1380" y="370" width="60" height="160" />
          </svg>
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="w-full max-w-[1280px] mx-auto grid gap-10 lg:gap-14 lg:grid-cols-[1.05fr_1fr] items-center">
          {/* ── TEXT COLUMN ── */}
          <div>
            <motion.span
              variants={fadeUp}
              custom={0}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-[7px] h-[30px] px-3 rounded-full text-xs font-bold mb-[18px] backdrop-blur-md"
              style={{
                background: "hsl(var(--primary) / 0.13)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.28)",
              }}
            >
              <span
                className="pm-anim w-1.5 h-1.5 rounded-full"
                style={{
                  background: "hsl(var(--primary))",
                  boxShadow: "0 0 0 3px hsl(var(--primary) / 0.2)",
                  animation: "pm-pulse 1.5s ease-in-out infinite",
                }}
              />
              조기축구 5년차 회장이 직접 만든 앱
            </motion.span>

            <h1
              className="font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance mb-[18px] m-0"
              style={{ fontSize: "clamp(36px, 8.4vw, 72px)" }}
            >
              <span className="block">
                <motion.span
                  className="relative inline-block whitespace-nowrap px-0.5 text-muted-foreground"
                  variants={wordVariants}
                  custom={0}
                  initial="hidden"
                  animate="show"
                >
                  매주 카톡 투표
                  <motion.span
                    aria-hidden
                    className="absolute left-0 right-0 rounded-[3px] origin-left"
                    style={{
                      top: "54%",
                      height: 4,
                      background: "hsl(var(--primary))",
                      boxShadow: "0 0 8px hsl(var(--primary) / 0.5)",
                      rotate: -3,
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.5, ease: [0.65, 0.05, 0.36, 1] }}
                  />
                </motion.span>{" "}
                <motion.span
                  variants={wordVariants}
                  custom={1}
                  initial="hidden"
                  animate="show"
                  className="inline-block align-baseline -mb-1 mr-1"
                  aria-hidden
                >
                  <span
                    className="pm-anim inline-block"
                    style={{ animation: "pm-ball-spin 12s linear infinite" }}
                  >
                    <SoccerBall />
                  </span>
                </motion.span>
              </span>
              <motion.span
                variants={wordVariants}
                custom={2}
                initial="hidden"
                animate="show"
                className="block"
                style={{ wordBreak: "keep-all" }}
              >
                이제{" "}
                <span
                  className="pm-anim bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(40 95% 60%) 60%, hsl(48 100% 65%) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "pm-grad-flow 6s ease-in-out infinite",
                    WebkitBackgroundClip: "text",
                    display: "inline-block",
                    whiteSpace: "nowrap",
                  }}
                >
                  앱 한번이면
                </span>{" "}
                끝.
              </motion.span>
            </h1>
            {/* SEO 보조 h2 */}
            <h2 className="sr-only">
              피치마스터 PitchMaster — 조기축구 · 풋살 팀 관리 웹앱. 참석 투표, 회비 관리, AI 라인업 자동 배치, 전술판, 경기 기록, MVP 투표를 한 곳에서.
            </h2>

            <motion.p
              variants={fadeUp}
              custom={0.7}
              initial="hidden"
              animate="show"
              className="text-muted-foreground text-[15.5px] lg:text-[18.5px] leading-[1.55] m-0 mb-[14px] max-w-[520px] text-pretty"
              style={{ wordBreak: "keep-all" }}
            >
              투표·회비·라인업·기록까지 자동화.{" "}
              <b className="font-bold text-foreground">
                {teamN}개 팀 {memberN.toLocaleString("ko-KR")}명
              </b>
              이 매주 카톡 대신 PitchMaster를 켭니다.
            </motion.p>

            {/* 무료 트러스트 라인 — 카드 등록·결제 진입장벽 사전 해소 */}
            <motion.div
              variants={fadeUp}
              custom={0.78}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-2 mb-[22px] px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
              style={{
                background: "hsl(var(--success) / 0.10)",
                border: "1px solid hsl(var(--success) / 0.32)",
                color: "hsl(var(--success))",
              }}
            >
              <span aria-hidden className="text-[14px]">✓</span>
              <span>
                <b className="font-extrabold">₩0</b> · 광고·결제 없이 시작 — 먼저 함께한 팀 보호 약속
              </span>
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              custom={0.85}
              initial="hidden"
              animate="show"
              className="flex flex-col sm:flex-row gap-2.5 mb-[22px] max-w-[460px]"
            >
              <KakaoCta
                kakaoEnabled={kakaoEnabled}
                kakaoHref={kakaoHref}
                onPointerDown={ripple}
              >
                {primaryCtaCopy}
              </KakaoCta>
              <Suspense fallback={<div className="h-14" />}>
                <DemoButton />
              </Suspense>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="flex flex-wrap items-center gap-x-3 gap-y-2.5 text-[13px] text-muted-foreground"
              style={{ wordBreak: "keep-all" }}
            >
              <AvatarStack />
              <span>
                현재{" "}
                <NumTip label={`${teamCount}개 팀`} tip={`${teamSampleNames.join(" · ")} · …외 ${Math.max(0, teamCount - teamSampleNames.length)}팀`} />{" "}
                · <b className="font-bold text-foreground">{memberCount.toLocaleString("ko-KR")}명</b>이 사용 중
              </span>
              <LiveBadge />
            </motion.div>
          </div>

          {/* ── VISUAL COLUMN ── */}
          <motion.div
            ref={wrapRef}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            variants={visualVariants}
            initial="hidden"
            animate="show"
            className="relative h-[560px] lg:h-[680px] flex items-center justify-center"
            style={{ perspective: 1400 }}
          >
            <motion.div
              className="relative w-[280px] lg:w-[320px]"
              style={{
                rotateX: rx,
                rotateY: ry,
                transformStyle: "preserve-3d",
              }}
            >
              <motion.div
                className="w-full overflow-hidden relative rounded-[38px] border bg-background"
                style={{
                  aspectRatio: "320/640",
                  borderColor: "hsl(var(--border))",
                  boxShadow:
                    "0 40px 80px -30px hsl(var(--primary) / 0.4), 0 80px 120px -50px rgba(0,0,0,0.7), inset 0 0 0 1px hsl(0 0% 100% / 0.04)",
                  rotate: deviceScrollTilt,
                }}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-6 bg-black rounded-full z-[3]" />
                <Image
                  src={dashboardSrc}
                  alt="PitchMaster 대시보드"
                  width={640}
                  height={1280}
                  priority
                  className="w-full h-auto block"
                />
              </motion.div>

              <motion.div style={{ y: cardLineupY }}>
                <FloatingCard
                  className="top-[4%] -right-[10%] w-[232px] group"
                  rotate={4}
                  floatAnim="pm-float-a 8s ease-in-out infinite"
                >
                  <CardLabel>AI 라인업 · 자동 편성</CardLabel>
                  <FCRow>1쿼터: GK 김 · DF 박,이</FCRow>
                  <FCRow>2쿼터: GK 최 · DF 한,서</FCRow>
                  <FCRow tone="warn">3쿼터: 분배 완료</FCRow>
                  <MiniFormation />
                </FloatingCard>
              </motion.div>

              <motion.div style={{ y: cardCashY }}>
                <FloatingCard
                  className="bottom-[12%] -left-[14%] w-[200px]"
                  rotate={-4}
                  floatAnim="pm-float-b 9s ease-in-out infinite -2s"
                  onMouseEnter={() => setCashTarget((c) => c + 40000)}
                >
                  <CardLabel>이번 달 회비</CardLabel>
                  <div
                    className="pm-anim font-display tabular-nums tracking-[0.02em] leading-none my-1.5"
                    style={{ fontSize: 32, color: "hsl(var(--primary))" }}
                  >
                    ₩{cashN.toLocaleString("ko-KR")}
                  </div>
                  <div
                    className="text-[10.5px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: "hsl(var(--success))" }}
                  >
                    통장 캡처 → 자동 정리
                  </div>
                </FloatingCard>
              </motion.div>

              <motion.div style={{ y: cardMvpY }}>
                <FloatingCard
                  className="top-[38%] -left-[16%] w-[188px] group"
                  rotate={-2}
                  floatAnim="pm-float-c 7.5s ease-in-out infinite -4s"
                >
                  <MvpToast />
                  <CardLabel>MVP 푸시</CardLabel>
                  <FCRow plain>
                    경기 종료 직후
                    <br />팀 전체 알림 자동 전송
                  </FCRow>
                </FloatingCard>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ *
 * Sub-components
 * ------------------------------------------------------------------ */

function SoccerBall() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="hsl(40 30% 96%)" stroke="#1a1a1a" strokeWidth="1.2" />
      <path d="M16 5 L21 9 L19 15 L13 15 L11 9 Z" fill="#1a1a1a" />
      <path
        d="M16 5 L11 9 M16 5 L21 9 M19 15 L24 17 M13 15 L8 17 M11 9 L5 12 M21 9 L27 12"
        stroke="#1a1a1a"
        strokeWidth="1"
      />
    </svg>
  );
}

function KakaoCta({
  children,
  onPointerDown,
  kakaoEnabled,
  kakaoHref,
}: {
  children: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  kakaoEnabled: boolean;
  kakaoHref: string;
}) {
  const baseClass =
    "group relative inline-flex items-center justify-center gap-2 h-14 px-6 rounded-2xl font-extrabold text-[15.5px] tracking-[-0.01em] cursor-pointer overflow-hidden transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.97] no-underline";
  const baseStyle: React.CSSProperties = {
    background: "hsl(var(--kakao))",
    color: "hsl(var(--kakao-foreground))",
    boxShadow: "0 8px 24px -8px hsl(var(--kakao) / 0.45)",
    isolation: "isolate",
  };

  const inner = (
    <>
      <span
        aria-hidden
        className="pm-anim absolute -inset-[2px] rounded-[18px] -z-10 opacity-55"
        style={{
          padding: 2,
          background:
            "conic-gradient(from 0deg, hsl(var(--primary)) 0deg, hsl(40 95% 60%) 90deg, hsl(48 100% 65%) 180deg, hsl(var(--primary)) 270deg, hsl(var(--primary)) 360deg)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "pm-conic-rotate 6s linear infinite",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5"
        aria-hidden
      >
        <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
      </svg>
      {children}
    </>
  );

  if (!kakaoEnabled) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} opacity-60 cursor-not-allowed`}
        style={baseStyle}
      >
        {inner}
      </button>
    );
  }

  return (
    <KakaoLoginLink
      href={kakaoHref}
      source="hero"
      className={baseClass}
      onPointerDown={onPointerDown}
      style={baseStyle}
    >
      {inner}
    </KakaoLoginLink>
  );
}

function AvatarStack() {
  const grads = [
    "linear-gradient(135deg, #c97a4f, #6b4d3a)",
    "linear-gradient(135deg, #5a8a6b, #2d4a35)",
    "linear-gradient(135deg, #8a6c4a, #4d3a26)",
    "linear-gradient(135deg, #6b8a8a, #3a4a4d)",
    "hsl(var(--primary))",
  ];
  return (
    <div className="flex">
      {grads.map((bg, i) => (
        <span
          key={i}
          className="w-[26px] h-[26px] rounded-full -ml-2 first:ml-0"
          style={{
            background: bg,
            border: "2px solid hsl(var(--background))",
          }}
        />
      ))}
    </div>
  );
}

function NumTip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="relative inline-block group cursor-pointer text-foreground font-bold border-b border-dashed" style={{ borderColor: "hsl(var(--muted-foreground) / 0.5)" }}>
      {label}
      <span
        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+10px)] -translate-x-1/2 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 px-3.5 py-2.5 rounded-xl text-[12px] font-medium whitespace-nowrap shadow-2xl"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
        }}
      >
        {tip}
      </span>
    </span>
  );
}

function LiveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-bold text-[11.5px] tracking-[0.06em]"
      style={{ color: "hsl(var(--success))" }}
    >
      <span
        className="pm-anim w-1.5 h-1.5 rounded-full"
        style={{
          background: "hsl(var(--success))",
          boxShadow: "0 0 0 3px hsl(var(--success) / 0.2)",
          animation: "pm-pulse 1.5s ease-in-out infinite",
        }}
      />
      LIVE
    </span>
  );
}

function FloatingCard({
  children,
  className = "",
  rotate = 0,
  floatAnim,
  onMouseEnter,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  floatAnim?: string;
  onMouseEnter?: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      className={`pm-anim absolute z-[4] cursor-pointer transition-[transform,box-shadow] duration-300 hover:!scale-[1.04] ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: "hsl(var(--card) / 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid hsl(var(--border))",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 24px 48px -16px rgba(0,0,0,0.5)",
        animation: floatAnim,
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-display mb-2"
      style={{
        fontSize: 11,
        letterSpacing: "0.14em",
        color: "hsl(var(--primary))",
      }}
    >
      {children}
    </div>
  );
}

function FCRow({
  children,
  tone,
  plain,
}: {
  children: React.ReactNode;
  tone?: "warn";
  plain?: boolean;
}) {
  if (plain) {
    return (
      <div className="text-[11.5px] leading-[1.45]" style={{ color: "hsl(var(--foreground))" }}>
        {children}
      </div>
    );
  }
  const bullet = tone === "warn" ? "hsl(var(--accent))" : "hsl(var(--success))";
  return (
    <div
      className="flex items-center gap-[7px] text-[12px] leading-[1.45] mt-[5px] first:mt-0"
      style={{ color: "hsl(var(--foreground))" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: bullet }}
      />
      <span>{children}</span>
    </div>
  );
}

function MiniFormation() {
  const positions = [
    { l: "10%", t: "80%", d: 0 },
    { l: "25%", t: "65%", d: 200 },
    { l: "25%", t: "35%", d: 400 },
    { l: "25%", t: "20%", d: 600 },
    { l: "50%", t: "50%", d: 800 },
    { l: "70%", t: "30%", d: 1000 },
    { l: "70%", t: "70%", d: 1200 },
  ];
  return (
    <div
      className="mt-2 max-h-0 opacity-0 overflow-hidden transition-[max-height,opacity] duration-400 group-hover:max-h-20 group-hover:opacity-100 relative rounded-lg"
      style={{
        height: 56,
        background: "linear-gradient(180deg, hsl(152 40% 22%), hsl(152 40% 16%))",
      }}
    >
      <span
        className="absolute left-0 right-0"
        style={{ top: "50%", height: 1, background: "hsl(0 0% 100% / 0.18)" }}
      />
      <span
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          width: 16,
          height: 16,
          border: "1px solid hsl(0 0% 100% / 0.3)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {positions.map((p, i) => (
        <span
          key={i}
          className="pm-anim absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: p.l,
            top: p.t,
            background: "hsl(var(--primary))",
            boxShadow: "0 0 6px hsl(var(--primary))",
            animation: `pm-pl-blink 1.6s ease-in-out infinite ${p.d}ms`,
          }}
        />
      ))}
    </div>
  );
}

function MvpToast() {
  return (
    <div
      className="absolute left-3 right-3 -top-[42px] flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250 pointer-events-none"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--primary) / 0.4)",
        color: "hsl(var(--foreground))",
        boxShadow: "0 8px 16px -4px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ fontSize: 14 }}>🏆</span>
      FCMZ · 김OO MVP 등극
    </div>
  );
}
