"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { MessageSquare, Calculator, Wallet, ScrollText, ArrowRight } from "lucide-react";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const opsItems = [
  { icon: MessageSquare, label: "출석", detail: "카톡 투표 매주 새로" },
  { icon: Calculator, label: "쿼터", detail: "엑셀로 분배 계산" },
  { icon: Wallet, label: "회비", detail: "엑셀 + 단톡방 추적" },
  { icon: ScrollText, label: "기록", detail: "흩어진 거 모아 정리" },
];

function NoiseFilter() {
  return (
    <svg className="absolute w-0 h-0">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={4} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </svg>
  );
}

function AuroraOrb() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
      style={{
        background: "radial-gradient(circle, hsl(16 85% 58% / 0.15), transparent 70%)",
        filter: "blur(80px)",
      }}
      animate={prefersReducedMotion ? {} : {
        x: [0, 50, -30, 0],
        y: [0, -40, 30, 0],
      }}
      transition={{
        duration: 40,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function SpotlightCard({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [prefersReducedMotion]);

  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-[24px] overflow-hidden ${className}`}
      style={{
        background: "hsl(240 4% 16% / 0.5)",
        backdropFilter: "blur(12px)",
        border: "1px solid hsl(240 4% 30%)",
        boxShadow: "inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 24px 48px -16px hsl(0 0% 0% / 0.6)",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={prefersReducedMotion ? {} : {
        y: -4,
        borderColor: "hsl(16 85% 58% / 0.4)",
      }}
      transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
    >
      {isHovered && !prefersReducedMotion && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            left: mousePos.x - 200,
            top: mousePos.y - 200,
            background: "radial-gradient(circle, hsl(16 85% 58% / 0.15), transparent 60%)",
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

function WordReveal({
  text,
  className = "",
  delay = 0,
  staggerDelay = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(" ");

  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{
            duration: 0.6,
            delay: delay + i * staggerDelay,
            ease: EASE_OUT_EXPO,
          }}
        >
          {word}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  );
}

/* coral → amber → coral (no pink) — breathing iridescent */
function IridescentText({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{
        background: "linear-gradient(90deg, hsl(16 85% 58%), hsl(40 60% 55%), hsl(16 85% 58%))",
        backgroundSize: "300% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        ...style,
      }}
      animate={prefersReducedMotion ? {} : {
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}

function PillHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "hsl(16 85% 58% / 0.10)",
        color: "hsl(16 85% 58%)",
        padding: "0 8px 2px",
        borderRadius: "6px",
        fontFamily: "'Bebas Neue', sans-serif",
        letterSpacing: "0.04em",
        fontSize: "0.92em",
        transform: "translateY(-0.04em)",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function TimeKPI() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div ref={ref} className="flex flex-col items-center gap-2.5">
      <motion.span
        className="font-extrabold"
        style={{
          fontSize: "clamp(30px, 4vw, 38px)",
          color: "hsl(40 5% 62%)",
          opacity: 0.7,
          letterSpacing: "-0.01em",
        }}
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 0.7, y: 0 } : {}}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      >
        1시간 20분
      </motion.span>

      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT_EXPO }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "hsl(16 85% 58%)" }}
        >
          <motion.path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={isInView && !prefersReducedMotion ? { pathLength: 1 } : { pathLength: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT_EXPO }}
          />
        </svg>
      </motion.div>

      <motion.span
        className="font-extrabold relative"
        style={{
          fontSize: "clamp(44px, 6vw, 56px)",
          background: "linear-gradient(90deg, hsl(16 85% 58%), hsl(40 60% 55%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.02em",
        }}
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.5, ease: EASE_OUT_EXPO }}
      >
        <motion.span
          className="absolute inset-0 blur-lg"
          style={{
            background: "linear-gradient(90deg, hsl(16 85% 58%), hsl(40 60% 55%))",
            opacity: 0.35,
          }}
          animate={prefersReducedMotion ? {} : {
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        1분 34초
      </motion.span>
    </div>
  );
}

function PulsingBar() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
      style={{ background: "hsl(16 85% 58%)" }}
      animate={prefersReducedMotion ? {} : {
        boxShadow: [
          "0 0 12px hsl(16 85% 58% / 0.6)",
          "0 0 4px hsl(16 85% 58% / 0.2)",
          "0 0 12px hsl(16 85% 58% / 0.6)",
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* Ops item — label + detail (어떤 게 불편한지 부연) */
function OpsItem({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof MessageSquare;
  label: string;
  detail: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex items-start gap-3 p-3.5 rounded-xl cursor-default"
      style={{
        background: "hsl(0 0% 100% / 0.03)",
        border: isHovered ? "1px solid hsl(16 85% 58% / 0.4)" : "1px solid hsl(240 4% 30%)",
        transition: "border-color 0.22s ease, background 0.22s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="flex items-center justify-center shrink-0 mt-0.5"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "hsl(240 5% 14%)",
          border: "1px solid hsl(240 4% 28%)",
          color: "hsl(40 7% 70%)",
        }}
        animate={isHovered && !prefersReducedMotion ? { scale: 1.08 } : { scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <Icon size={18} />
      </motion.div>
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: "14.5px",
            fontWeight: 700,
            color: "hsl(40 10% 92%)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "hsl(40 7% 68%)",
            marginTop: "3px",
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
          }}
        >
          {detail}
        </div>
      </div>
    </motion.div>
  );
}

/* placeholder removed — ConnectingLine 코랄 대각선 라인 제거 */

/* small credential item for footer row */
function CredItem({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        fontSize: "12.5px",
        color: "hsl(40 7% 70%)",
        fontWeight: 500,
        letterSpacing: "-0.005em",
      }}
    >
      {label}
    </span>
  );
}

function CredDot() {
  return (
    <span
      aria-hidden
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        background: "hsl(240 4% 40%)",
        display: "inline-block",
      }}
    />
  );
}

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: "hsl(240 6% 6%)" }}
    >
      <NoiseFilter />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ filter: "url(#noise)" }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, hsl(240 6% 2%) 100%)",
        }}
      />

      <AuroraOrb />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-14">
        <div className="mb-12 md:mb-16">
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-[0.20em]"
              style={{
                background: "hsl(16 85% 58% / 0.13)",
                border: "1px solid hsl(16 85% 58% / 0.30)",
                color: "hsl(16 85% 58%)",
                fontFamily: "'Bebas Neue', sans-serif",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(16 85% 58%)" }}
              />
              회장 이야기
            </span>
          </motion.div>

          <h2
            className="font-extrabold tracking-[-0.03em] mb-4"
            style={{
              fontSize: "clamp(30px, 5.4vw, 52px)",
              color: "hsl(40 10% 92%)",
              lineHeight: 1.05,
              fontWeight: 900,
            }}
          >
            <span
              style={{
                textDecoration: "underline",
                textDecorationColor: "hsl(16 85% 58%)",
                textDecorationThickness: "3px",
                textUnderlineOffset: "8px",
              }}
            >
              5년
            </span>{" "}
            <WordReveal text="회장이 직접" delay={0.2} />{" "}
            <IridescentText>갈아넣었습니다.</IridescentText>
          </h2>

          <motion.p
            style={{
              color: "hsl(40 5% 62%)",
              fontSize: "clamp(15.5px, 1.4vw, 17px)",
              lineHeight: 1.6,
              maxWidth: "640px",
              textWrap: "pretty",
              letterSpacing: "-0.005em",
            }}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE_OUT_EXPO }}
          >
            다른 앱이 절대 따라할 수 없는 정통성 — 5년 동안 매주 직접 부딪힌 결과물입니다.
          </motion.p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          <motion.div
            className="lg:col-span-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT_EXPO }}
          >
            <SpotlightCard className="h-full p-6 md:p-8 flex flex-col">
              <div
                className="relative text-xl md:text-2xl font-semibold leading-relaxed mb-6"
                style={{ color: "hsl(40 10% 92%)", letterSpacing: "-0.01em" }}
              >
                <PillHighlight>매주 사라지는</PillHighlight> 회장의 운영 시간 — 다들 한 번쯤 느끼셨을 겁니다.
              </div>

              <div className="grid grid-cols-2 gap-3 mb-7">
                {opsItems.map((item) => (
                  <OpsItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    detail={item.detail}
                  />
                ))}
              </div>

              <p
                className="mb-6"
                style={{ color: "hsl(40 10% 92%)" }}
              >
                <span
                  className="font-extrabold"
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  그래서
                </span>
                <ArrowRight
                  size={24}
                  className="inline mx-3"
                  style={{
                    color: "hsl(16 85% 58%)",
                    verticalAlign: "middle",
                  }}
                />
                <span
                  className="font-extrabold"
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  직접{" "}
                </span>
                <IridescentText
                  className="font-extrabold"
                  style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.02em" }}
                >
                  만들었습니다.
                </IridescentText>
              </p>

              {/* 강조 박스 — 한 줄 inline 형식 (간결화, 보더 약하게) */}
              <div
                className="mb-5 px-5 py-3.5 rounded-2xl"
                style={{
                  background: "hsl(16 85% 58% / 0.05)",
                  border: "1px solid hsl(16 85% 58% / 0.10)",
                }}
              >
                <p
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.55,
                    color: "hsl(40 7% 82%)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  단톡방의 답답함이 만든 기능들 —{" "}
                  <strong style={{ color: "hsl(16 85% 58%)", fontWeight: 700 }}>
                    회비 OCR · AI 라인업 · 자동 경기 후기
                  </strong>
                </p>
              </div>

              {/* 보조 카피 — 한 줄 (간결화) */}
              <p
                className="mb-5"
                style={{
                  fontSize: "14px",
                  color: "hsl(40 7% 72%)",
                  letterSpacing: "-0.005em",
                  lineHeight: 1.55,
                }}
              >
                회장이 만든 앱이라, 회장이 진짜 필요한 것만 들어 있어요.
              </p>

              {/* spacer push footer to bottom */}
              <div className="flex-1 min-h-[8px]" />

              {/* Footer — credential row만 (선 제거, 자연 spacing) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <CredItem label="조기축구 5년" />
                <CredDot />
                <CredItem label="회장직 직접 운영" />
                <CredDot />
                <CredItem label="매주 업데이트" />
              </div>
            </SpotlightCard>
          </motion.div>

          <div className="lg:col-span-4 flex flex-col gap-5 relative z-10">
            {/* Time KPI — 시간 단축 */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_EXPO }}
            >
              <SpotlightCard className="p-6 relative">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-[0.20em] mb-6"
                  style={{
                    background: "hsl(240 5% 10% / 0.6)",
                    border: "1px solid hsl(240 4% 30%)",
                    color: "hsl(40 10% 92%)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "hsl(38 85% 58%)" }}
                  />
                  주간 운영 시간
                </span>

                <TimeKPI />

                <p
                  className="text-sm mt-5 text-center"
                  style={{ color: "hsl(40 5% 62%)" }}
                >
                  회장 업무시간이{" "}
                  <span style={{ color: "hsl(16 85% 58%)" }}>단축</span>
                  됐습니다.
                </p>
              </SpotlightCard>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT_EXPO }}
            >
              <SpotlightCard className="p-6 pl-8 relative">
                <PulsingBar />

                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-[0.20em] mb-5"
                  style={{
                    background: "hsl(240 5% 10% / 0.6)",
                    border: "1px solid hsl(240 4% 30%)",
                    color: "hsl(40 10% 92%)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "hsl(16 85% 58%)" }}
                  />
                  약속
                </span>

                <p
                  className="text-base font-medium leading-relaxed mb-4"
                  style={{ color: "hsl(40 10% 92%)" }}
                >
                  불필요한 기능은{" "}
                  <span
                    style={{
                      textDecoration: "underline",
                      textDecorationColor: "hsl(16 85% 58%)",
                      textDecorationThickness: "3px",
                      textUnderlineOffset: "6px",
                    }}
                  >
                    하나도 없습니다.
                  </span>
                </p>

                <p
                  className="leading-relaxed"
                  style={{
                    color: "hsl(40 7% 78%)",
                    fontSize: "14.5px",
                    letterSpacing: "-0.005em",
                  }}
                >
                  <span
                    style={{
                      textDecoration: "underline",
                      textDecorationColor: "hsl(16 85% 58%)",
                      textDecorationThickness: "3px",
                      textUnderlineOffset: "6px",
                    }}
                  >
                    조기축구·풋살에만
                  </span>{" "}
                  — 5년 동안 매주 직접 손으로 하던 모든 운영 노동을 다 담았습니다.
                </p>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
