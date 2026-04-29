"use client";

/**
 * ComparisonSection — "왜 PitchMaster인가요?"
 *
 * 카카오톡/밴드/타 운영 앱 대비 명확한 차별점 8행을
 * "PM(코랄/체크) vs 타 앱(회색/X)" 단일 컬럼 비교로.
 * 모바일은 PM 우선 + 타 앱은 작은 sub-line.
 */

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Check, X, Sparkles } from "lucide-react";

type Row = {
  feature: string;
  pm: string;
  other: string | null; // null 또는 "❌"
  highlight?: boolean;  // ONLY HERE 강조 여부
};

const ROWS: Row[] = [
  {
    feature: "참석 투표",
    pm: "링크 1개 → 다음 6경기 한 번에 응답 + 마감 자동 알림",
    other: "경기마다 새 투표 / 갠톡 추적",
  },
  {
    feature: "AI 라인업·전술 편성",
    pm: "팀 기록·상대팀 이력·참석자 분석해 포메이션 추천",
    other: null,
    highlight: true,
  },
  {
    feature: "AI 감독 코칭",
    pm: "편성 근거·고비 쿼터·공격 루트 자동 브리핑",
    other: null,
    highlight: true,
  },
  {
    feature: "공정 쿼터 로테이션",
    pm: "벤치 편중 자동 분배, 출전 시간 균형",
    other: null,
  },
  {
    feature: "회비 OCR + 휴면 면제",
    pm: "은행 앱 캡처 자동 매칭 + 휴면·부상 자동 면제",
    other: "엑셀 / 메모 수기",
    highlight: true,
  },
  {
    feature: "자동 경기 후기",
    pm: "경기 종료 즉시 한 문장 후기 자동 생성",
    other: null,
  },
  {
    feature: "선수 카드 & 시즌 어워드",
    pm: "FIFA 스타일 카드 + 7종 자동 시상",
    other: null,
  },
  {
    feature: "PC·모바일",
    pm: "브라우저로 어디서나, 설치 없이",
    other: "앱 전용",
  },
];

export default function ComparisonSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = useReducedMotion();

  return (
    <section
      ref={ref}
      id="comparison"
      className="relative overflow-hidden py-24 lg:py-32 px-5 lg:px-14"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.10), transparent 60%), hsl(var(--background))",
        wordBreak: "keep-all",
      }}
    >
      <div className="relative max-w-[1080px] mx-auto">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
          style={{
            background: "hsl(var(--primary) / 0.13)",
            border: "1px solid hsl(var(--primary) / 0.30)",
            color: "hsl(var(--primary))",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          COMPARISON
        </span>

        <h2
          className="font-extrabold leading-[1.12] mt-4 mb-3"
          style={{
            fontSize: "clamp(30px, 5.4vw, 52px)",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          왜 <span style={{ color: "hsl(var(--primary))" }}>PitchMaster</span>인가요?
        </h2>
        <p
          className="text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[680px]"
          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
        >
          조기축구 5년차 회장이 직접 만든, 운영에 진짜 필요한 기능들.
        </p>

        {/* Header row (desktop only) */}
        <div
          className="hidden md:grid mt-12 grid-cols-[1.1fr_1.5fr_1.2fr] gap-4 px-5 pb-3 text-[11px] font-display tracking-[0.22em]"
          style={{ color: "hsl(var(--muted-foreground))", borderBottom: "1px solid hsl(var(--border))" }}
        >
          <div>FEATURE</div>
          <div style={{ color: "hsl(var(--primary))" }}>PITCHMASTER</div>
          <div>다른 운영 / 카톡</div>
        </div>

        <div className="mt-4 md:mt-2 flex flex-col gap-2">
          {ROWS.map((r, i) => (
            <motion.div
              key={r.feature}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }
              }
              className="group relative grid md:grid-cols-[1.1fr_1.5fr_1.2fr] grid-cols-1 gap-2 md:gap-4 items-start md:items-center p-5 md:px-5 md:py-4 rounded-[14px] transition-colors duration-200"
              style={{
                background: r.highlight
                  ? "linear-gradient(90deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.04) 60%, transparent)"
                  : "hsl(var(--secondary) / 0.4)",
                border: r.highlight
                  ? "1px solid hsl(var(--primary) / 0.32)"
                  : "1px solid hsl(var(--border))",
              }}
            >
              {/* Feature name */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[15px] lg:text-base font-bold"
                  style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
                >
                  {r.feature}
                </span>
                {r.highlight && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display tracking-[0.18em] whitespace-nowrap"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.16))",
                      color: "hsl(var(--primary))",
                      border: "1px solid hsl(var(--primary) / 0.40)",
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    ONLY HERE
                  </span>
                )}
              </div>

              {/* PM column */}
              <div className="flex items-start gap-2.5">
                <motion.span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full mt-0.5 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(16 70% 44%))",
                    color: "hsl(var(--primary-foreground))",
                    boxShadow: "0 4px 10px -3px hsl(var(--primary) / 0.55)",
                  }}
                  whileHover={reduced ? undefined : { scale: 1.15 }}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </motion.span>
                <span
                  className="text-[14px] lg:text-[14.5px] leading-[1.5]"
                  style={{ color: "hsl(var(--foreground))", textWrap: "pretty" }}
                >
                  {r.pm}
                </span>
              </div>

              {/* Other column */}
              <div className="flex items-start gap-2.5">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full mt-0.5 shrink-0"
                  style={{
                    background: "hsl(var(--muted) / 0.6)",
                    color: "hsl(var(--muted-foreground))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </span>
                <span
                  className="text-[13px] lg:text-[14px] leading-[1.5]"
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    textWrap: "pretty",
                    fontStyle: r.other ? "normal" : "italic",
                  }}
                >
                  {r.other ?? "지원 안함"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
