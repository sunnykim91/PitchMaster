"use client";

/**
 * TestimonialsSection — 사용자 후기
 *
 * 익명 이니셜 처리된 7개 후기를 좌측으로 자동 스크롤되는 마퀴로 노출.
 * Hero v2의 AvatarStack과 동일한 그라데이션 톤.
 */

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";

type Testimonial = {
  quote: string;
  initials: string;
  name: string;        // F.M.Z 회장
  age: number;
  years: number;
  gradient: string;
};

const T: Testimonial[] = [
  {
    quote: "단톡방에서 갠톡으로 출석 일일이 묻던 시간이 사라졌어요",
    initials: "FZ", name: "F.M.Z 회장", age: 35, years: 5,
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(16 70% 44%))",
  },
  {
    quote: "회비 정리하느라 매주 1시간 쓰던 게 통장 캡처 한 장으로 끝남",
    initials: "FK", name: "F.K.R 총무", age: 42, years: 7,
    gradient: "linear-gradient(135deg, hsl(var(--info)), hsl(220 70% 40%))",
  },
  {
    quote: "AI가 전술 짜준 거 보고 진짜 놀랐음. 우리 기록까지 다 보더라",
    initials: "CS", name: "F.C.S 운영진", age: 38, years: 3,
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(280 60% 40%))",
  },
  {
    quote: "팀원이 30명인데 다 모이는 일정 잡기가 처음으로 됐다",
    initials: "SF", name: "S.F.C 회장", age: 40, years: 4,
    gradient: "linear-gradient(135deg, hsl(var(--success)), hsl(160 60% 30%))",
  },
  {
    quote: "데모로 미리 보고 결정. 가입 없이 다 보여줘서 안심됐음",
    initials: "MZ", name: "F.M.Z 풋살 회장", age: 33, years: 2,
    gradient: "linear-gradient(135deg, hsl(40 95% 60%), hsl(20 85% 50%))",
  },
  {
    quote: "휴면·부상 회원 면제 자동 처리, 이게 진짜 끝판왕",
    initials: "ST", name: "F.S.T 총무", age: 45, years: 8,
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
  },
  {
    quote: "아침에 PC로 라인업 짜고 폰으로 공유, 흐름이 자연스러움",
    initials: "NF", name: "N.F.C 회장", age: 37, years: 6,
    gradient: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--success)))",
  },
];

export default function TestimonialsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();

  // duplicate for seamless marquee
  const loop = [...T, ...T];

  return (
    <section
      ref={ref}
      id="testimonials"
      className="relative overflow-hidden py-24 lg:py-32"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--success) / 0.10), transparent 60%), hsl(var(--background))",
        wordBreak: "keep-all",
      }}
    >
      <div className="px-5 lg:px-14 max-w-[1280px] mx-auto">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
          style={{
            background: "hsl(var(--success) / 0.13)",
            border: "1px solid hsl(var(--success) / 0.32)",
            color: "hsl(var(--success))",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          TESTIMONIALS
        </span>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-extrabold leading-[1.12] mt-4 mb-3"
          style={{
            fontSize: "clamp(30px, 5.4vw, 52px)",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          직접 써본 <span style={{ color: "hsl(var(--success))" }}>총무들</span>의 이야기
        </motion.h2>
        <p
          className="text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[680px]"
          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
        >
          이미 80개 팀, 640+명이 매주 PitchMaster를 켭니다.
        </p>
      </div>

      {/* Marquee */}
      <div
        className="relative mt-12 lg:mt-14"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%)",
        }}
      >
        <div
          className="flex gap-5 lg:gap-6 marquee-track"
          style={{
            width: "max-content",
            animation: reduced ? undefined : "tm-marquee 60s linear infinite",
          }}
        >
          {loop.map((t, i) => (
            <article
              key={i}
              className="relative w-[320px] lg:w-[380px] shrink-0 p-6 lg:p-7 rounded-[20px] transition-transform duration-300 hover:-translate-y-1 group"
              style={{
                background: "hsl(var(--card) / 0.7)",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
            >
              {/* big quote glyph */}
              <span
                className="absolute top-3 right-5 font-display text-5xl leading-none transition-opacity duration-300 group-hover:opacity-90"
                style={{
                  color: "hsl(var(--primary) / 0.35)",
                }}
                aria-hidden
              >
                &ldquo;
              </span>

              {/* stars */}
              <div className="flex gap-0.5 mb-3" aria-label="5 stars">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star
                    key={s}
                    className="w-3.5 h-3.5"
                    style={{ color: "hsl(40 95% 60%)", fill: "hsl(40 95% 60%)" }}
                  />
                ))}
              </div>

              <p
                className="text-[15px] lg:text-[15.5px] font-medium leading-[1.55] mb-5 min-h-[68px]"
                style={{ color: "hsl(var(--foreground))", textWrap: "pretty" }}
              >
                {t.quote}
              </p>

              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[13px] tracking-[0.04em]"
                  style={{
                    background: t.gradient,
                    color: "white",
                    boxShadow: "inset 0 0 0 1px hsl(0 0% 100% / 0.18)",
                  }}
                >
                  {t.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13.5px] font-bold truncate"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-[11.5px]"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {t.age}세 · {t.years}년차
                  </div>
                </div>
                <span
                  className="font-display text-[10px] tracking-[0.18em] px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    background: "hsl(var(--primary) / 0.13)",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.30)",
                  }}
                >
                  실사용 5개월
                </span>
              </div>
            </article>
          ))}
        </div>

        <style jsx>{`
          @keyframes tm-marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>
      </div>
    </section>
  );
}
