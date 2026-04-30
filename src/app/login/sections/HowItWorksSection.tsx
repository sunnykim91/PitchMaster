"use client";

/**
 * HowItWorksSection
 *
 * 3-step onboarding proof: "세팅은 1분이면 끝납니다"
 *
 * Tone: 5년차 회장이 만든 앱이라 진입장벽 낮춰뒀다는 보이스
 *
 * Visual signature:
 *  - Big Bebas Neue step numbers (01/02/03) with diagonal gradient
 *  - lucide-react icons (LogIn / UserPlus / Rocket)
 *  - Connector path (desktop) drawn left→right via SVG pathLength on enter (1.5s)
 *  - Two pulse-dots traveling along the path on infinite loop (offset-path)
 *  - Vertical gradient bars between cards on mobile
 *  - Cards: stagger fade-up (200ms gap) when in view (Framer Motion useInView)
 *  - Card hover: lift -4px + icon shake + border tint
 *  - Bottom CTA strip with conic-gradient kakao button
 *
 * Tokens consumed (globals.css HSL vars):
 *   --primary, --info, --accent, --success
 *   --kakao, --kakao-foreground
 *   --background, --foreground, --card, --secondary, --border, --muted-foreground
 *
 * Accessibility: <MotionConfig reducedMotion="user"> + CSS guards on infinite loops.
 *
 * Deps: framer-motion@^11, lucide-react
 */

import { motion, MotionConfig, useInView } from "framer-motion";
import { Check, Clock, LogIn, Rocket, UserPlus } from "lucide-react";
import { useRef } from "react";

const STEPS = [
  {
    n: "01",
    title: "카카오로 로그인",
    body: "별도 회원가입·이메일 인증 없습니다. 평소 쓰던 카카오 계정으로 그대로 들어오세요. 비밀번호 하나 더 외울 일 없습니다.",
    chip: "10초",
    Icon: LogIn,
    tone: "primary" as const,
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
  },
  {
    n: "02",
    title: "팀 만들기 또는 초대 코드",
    body: "회장·총무라면 새 팀 생성, 멤버라면 단톡방에 공유된 초대 링크로 합류. 팀 이름과 로고만 정하면 끝입니다.",
    chip: "30초",
    Icon: UserPlus,
    tone: "info" as const,
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--info)))",
  },
  {
    n: "03",
    title: "운영 시작",
    body: "일정 등록 → 카톡에 투표 링크 한 줄 → AI가 라인업까지. 첫 경기까지 채우는 데 1분이면 충분합니다.",
    chip: "1분",
    Icon: Rocket,
    tone: "accent" as const,
    gradient: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--success)))",
  },
];

const TONE_BG: Record<string, string> = {
  primary: "hsl(var(--primary) / 0.12)",
  info: "hsl(var(--info) / 0.12)",
  accent: "hsl(var(--accent) / 0.14)",
};
const TONE_BORDER: Record<string, string> = {
  primary: "hsl(var(--primary) / 0.30)",
  info: "hsl(var(--info) / 0.30)",
  accent: "hsl(var(--accent) / 0.32)",
};
const TONE_FG: Record<string, string> = {
  primary: "hsl(var(--primary))",
  info: "hsl(var(--info))",
  accent: "hsl(var(--accent))",
};

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const scrollToHero = () => {
    if (typeof window === "undefined") return;
    const hero = document.getElementById("hero") ?? document.body;
    hero.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <style jsx global>{`
        @keyframes hiw-pulse-along {
          0% { opacity: 0; offset-distance: 0%; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; offset-distance: 100%; }
        }
        @keyframes hiw-spin { to { transform: rotate(360deg); } }
        @keyframes hiw-icon-shake {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(-6deg) scale(1.05); }
          40% { transform: rotate(5deg) scale(1.05); }
          60% { transform: rotate(-3deg); }
          80% { transform: rotate(2deg); }
        }
        .hiw-card:hover .hiw-icon { animation: hiw-icon-shake 0.6s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .hiw-anim { animation: none !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="how-it-works"
        className="relative py-16 lg:py-24 px-5 lg:px-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.10), transparent 60%)," +
            "radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--info) / 0.08), transparent 60%)," +
            "hsl(var(--background))",
        }}
      >
        <div className="max-w-[1280px] mx-auto" style={{ wordBreak: "keep-all" }}>
          {/* Eyebrow */}
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] tracking-[0.18em]"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              background: "hsl(var(--primary) / 0.13)",
              border: "1px solid hsl(var(--primary) / 0.30)",
              color: "hsl(var(--primary))",
            }}
          >
            <span
              className="hiw-anim w-1.5 h-1.5 rounded-full"
              style={{
                background: "hsl(var(--primary))",
                boxShadow: "0 0 0 3px hsl(var(--primary) / 0.2)",
              }}
            />
            사용 방법
          </span>

          {/* Headline */}
          <h2
            className="font-extrabold leading-[1.1] tracking-[-0.03em] text-balance text-foreground mt-[18px] mb-3.5"
            style={{ fontSize: "clamp(32px, 6vw, 56px)" }}
          >
            세팅은{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                WebkitBackgroundClip: "text",
              }}
            >
              1분이면
            </span>{" "}
            끝납니다
          </h2>

          <p
            className="text-muted-foreground text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[560px] text-pretty m-0"
          >
            카톡으로 5년 운영해온 회장이 만든 앱이라 진입장벽을 가장 신경 썼습니다.
            회원가입·결제·세팅 빼고, 바로 운영부터 시작하시면 됩니다.
          </p>

          {/* Steps grid */}
          <div className="relative mt-14 grid gap-5 lg:gap-7 grid-cols-1 lg:grid-cols-3">
            {/* Connector — desktop only */}
            <svg
              className="hidden lg:block absolute inset-0 pointer-events-none z-0"
              viewBox="0 0 1280 360"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="hiw-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(16 85% 58%)" />
                  <stop offset="50%" stopColor="hsl(210 70% 60%)" />
                  <stop offset="100%" stopColor="hsl(40 60% 55%)" />
                </linearGradient>
              </defs>
              <motion.path
                d="M 200 80 C 320 20, 440 140, 640 80 S 960 20, 1080 80"
                fill="none"
                stroke="url(#hiw-line)"
                strokeWidth={2}
                strokeLinecap="round"
                pathLength={1}
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.5, delay: 0.4, ease: [0.65, 0.05, 0.36, 1] }}
              />
              {/* pulse dots traveling along the path */}
              {[0, 3].map((delay, i) => (
                <circle
                  key={i}
                  r={i === 0 ? 4 : 3}
                  fill={i === 0 ? "hsl(16 85% 58%)" : "hsl(210 70% 60%)"}
                  className="hiw-anim"
                  style={{
                    offsetPath:
                      "path('M 200 80 C 320 20, 440 140, 640 80 S 960 20, 1080 80')",
                    animation: `hiw-pulse-along 4s ease-in-out infinite ${delay + 1.6}s`,
                    opacity: 0,
                  }}
                />
              ))}
            </svg>

            {STEPS.map((s, i) => (
              <div key={s.n} className="contents">
                <motion.article
                  className="hiw-card relative z-[1] rounded-[22px] p-6 lg:p-7 lg:min-h-[360px] lg:flex lg:flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)]"
                  style={{
                    background: "hsl(var(--card) / 0.7)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    border: "1px solid hsl(var(--border))",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* head: number + time chip */}
                  <div className="flex items-center justify-between mb-[18px]">
                    <span
                      className="text-transparent bg-clip-text"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(64px, 6vw, 80px)",
                        lineHeight: 0.85,
                        letterSpacing: "0.04em",
                        backgroundImage: s.gradient,
                        WebkitBackgroundClip: "text",
                      }}
                    >
                      {s.n}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-semibold tabular-nums"
                      style={{
                        background: "hsl(var(--secondary) / 0.6)",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      <Clock className="w-3 h-3 opacity-70" />
                      {s.chip}
                    </span>
                  </div>

                  {/* icon */}
                  <div
                    className="hiw-icon w-14 h-14 rounded-2xl flex items-center justify-center mb-[18px]"
                    style={{
                      background: TONE_BG[s.tone],
                      border: `1px solid ${TONE_BORDER[s.tone]}`,
                      color: TONE_FG[s.tone],
                    }}
                  >
                    <s.Icon className="w-[26px] h-[26px]" strokeWidth={2} />
                  </div>

                  <h3 className="text-[22px] lg:text-[24px] font-bold tracking-[-0.02em] leading-[1.25] m-0 mb-2.5">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-[14.5px] leading-[1.55] m-0 lg:flex-1">
                    {s.body}
                  </p>

                  {/* mini visual per step */}
                  <StepMini index={i} />
                </motion.article>

                {/* Mobile vertical connector between cards */}
                {i < STEPS.length - 1 && (
                  <div className="lg:hidden relative h-7 flex justify-center">
                    <span
                      className="block w-0.5 h-full rounded-[2px]"
                      style={{
                        background:
                          i === 0
                            ? "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--info)))"
                            : "linear-gradient(180deg, hsl(var(--info)), hsl(var(--accent)))",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA strip */}
          <motion.div
            className="mt-12 px-6 py-[22px] lg:px-8 lg:py-6 rounded-[20px] flex flex-col gap-3.5 items-start sm:flex-row sm:items-center sm:justify-between"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--info) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.25)",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-foreground text-[15px] leading-[1.5]">
              총합 <b className="font-bold">1분 40초</b> · 카드 등록·결제 없이 무료로 1팀 운영 시작.
            </div>
            <FirstGameButton onClick={scrollToHero} />
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

/* ----- step-specific mini visuals ----- */

function StepMini({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div
        className="mt-[18px] px-3.5 py-3 rounded-xl flex items-center gap-2.5 text-[12.5px] text-muted-foreground"
        style={{
          background: "hsl(var(--background) / 0.5)",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11.5px]"
          style={{ background: "hsl(var(--kakao))", color: "hsl(var(--kakao-foreground))" }}
        >
          <KakaoIcon />
          카카오로 시작
        </span>
        <span className="ml-auto text-[11.5px]">탭 1번</span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div
        className="mt-[18px] px-3.5 py-3 rounded-xl flex items-center gap-2.5 text-[12.5px] text-muted-foreground"
        style={{
          background: "hsl(var(--background) / 0.5)",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <span className="text-[11.5px]">초대 코드</span>
        <span
          className="px-2.5 py-[3px] rounded-md text-[17px]"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.22em",
            color: "hsl(var(--info))",
            background: "hsl(var(--info) / 0.08)",
            border: "1px dashed hsl(var(--info) / 0.5)",
          }}
        >
          FCMZ-2026
        </span>
        <span className="ml-auto text-[11.5px]" style={{ color: "hsl(var(--success))" }}>
          ✓ 클립보드 복사
        </span>
      </div>
    );
  }
  return (
    <div
      className="mt-[18px] px-3.5 py-3 rounded-xl flex flex-col gap-1.5"
      style={{
        background: "hsl(var(--background) / 0.5)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {[
        <span key="0">
          <b className="font-semibold text-foreground">토 09:00</b> 경기 등록
        </span>,
        <>참석 투표 14/16</>,
        <>스마트 라인업 4-3-3</>,
        <>득점 기록·MVP</>,
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span
            className="w-[14px] h-[14px] rounded-[4px] flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--success) / 0.18)", color: "hsl(var(--success))" }}
          >
            <Check className="w-[9px] h-[9px]" strokeWidth={3} />
          </span>
          {row}
        </div>
      ))}
    </div>
  );
}

function FirstGameButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-2 px-[22px] h-[50px] rounded-[14px] font-extrabold text-[14.5px] cursor-pointer overflow-hidden transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.97]"
      style={{
        background: "hsl(var(--kakao))",
        color: "hsl(var(--kakao-foreground))",
        boxShadow: "0 8px 22px -8px hsl(var(--kakao) / 0.45)",
        border: 0,
        isolation: "isolate",
      }}
    >
      <span
        aria-hidden
        className="hiw-anim absolute -inset-[2px] rounded-[16px] -z-10 opacity-55"
        style={{
          padding: 2,
          background:
            "conic-gradient(from 0deg, hsl(var(--primary)) 0deg, hsl(40 95% 60%) 120deg, hsl(48 100% 65%) 240deg, hsl(var(--primary)) 360deg)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "hiw-spin 6s linear infinite",
        }}
      />
      <KakaoIcon />
      첫 경기 등록하기
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function KakaoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
    </svg>
  );
}
