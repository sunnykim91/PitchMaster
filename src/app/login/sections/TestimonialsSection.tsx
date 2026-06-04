"use client";

/**
 * TestimonialsSection — 사용자 후기
 *
 * 익명 이니셜 처리된 7개 후기를 좌측으로 자동 스크롤되는 마퀴로 노출.
 * Hero v2의 AvatarStack과 동일한 그라데이션 톤.
 */

import { useRef, useState } from "react";
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
    quote: "회비 정리하느라 매주 1시간씩 쓰던 게 통장 캡처 한 장으로 끝나요",
    initials: "FK", name: "F.K.R 총무", age: 42, years: 7,
    gradient: "linear-gradient(135deg, hsl(var(--info)), hsl(220 70% 40%))",
  },
  {
    quote: "AI가 짜주는게 얼마나 맞겠어 했는데, 포지션 설정한거랑 잘 맞고 무엇보다 공정하게 잘짜주는게 너무 좋아서 회원들이 불만이 줄었어요",
    initials: "KR", name: "F.K.R 회장", age: 39, years: 5,
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(280 60% 40%))",
  },
  {
    quote: "경기기록이라던가 회비라던가 하나의 앱에서 편하게 관리되고 한눈에 볼 수 있어서 너무 좋은것같아요!!",
    initials: "SF", name: "S.F.C 회장", age: 40, years: 4,
    gradient: "linear-gradient(135deg, hsl(var(--success)), hsl(160 60% 30%))",
  },
  {
    quote: "움직임을 항상 말로만 설명할려니까 답답했는데, 포지션별로 역할 가이드도 나오고, 영상까지 만들어서 팀원들에게 공유할 수 있는점이 진짜 좋은 것 같습니다 ㅎㅎㅎ",
    initials: "TF", name: "T.F.C 운영진", age: 36, years: 4,
    gradient: "linear-gradient(135deg, hsl(var(--accent)), hsl(20 85% 50%))",
  },
  {
    quote: "데모로 미리 보고 결정했어요. 가입 없이 다 보여줘서 안심됐어요",
    initials: "MZ", name: "F.M.Z 풋살 회장", age: 33, years: 2,
    gradient: "linear-gradient(135deg, hsl(40 95% 60%), hsl(20 85% 50%))",
  },
  {
    quote: "축구만 되는줄 알았는데, 풋살도 되더라구요. 사실 축구팀이나 풋살팀이나 인원만 다른건데 풋살팀도 거의 완벽하게 지원해주셔가지고 잘쓰고있습니다~^^",
    initials: "PF", name: "P.F.C 풋살 회장", age: 34, years: 3,
    gradient: "linear-gradient(135deg, hsl(40 95% 60%), hsl(140 70% 40%))",
  },
  {
    quote: "풋살에서도 항상 보면 전술이 있는데 영상을 만들어서 팀원들에게 공유하다보니 팀원들도 영상을 잘 이해하고 따라오다보니 경기에서 그런장면 나올때마다 재밌는것 같습니다 ㅎㅎ",
    initials: "JF", name: "J.F.C 풋살 운영진", age: 38, years: 5,
    gradient: "linear-gradient(135deg, hsl(var(--success)), hsl(var(--accent)))",
  },
  {
    quote: "휴면·부상 회원 면제 자동 처리, 이게 진짜 끝판왕이에요",
    initials: "ST", name: "F.S.T 총무", age: 45, years: 8,
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
  },
  {
    quote: "아침에 PC로 라인업 짜고 폰으로 공유, 흐름이 자연스러워요",
    initials: "NF", name: "N.F.C 회장", age: 37, years: 6,
    gradient: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--success)))",
  },
];

export type TestimonialsSectionProps = {
  teamCount: number;
  memberCount: number;
};

export default function TestimonialsSection({
  teamCount,
  memberCount,
}: TestimonialsSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  // duplicate for seamless marquee
  const loop = [...T, ...T];

  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setPaused(true);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setPaused(false);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") setPaused(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") setPaused(false);
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") setPaused(false);
  };

  return (
    <section
      ref={ref}
      id="testimonials"
      className="relative overflow-hidden py-20 lg:py-28"
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
          사용자 후기
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
          직접 써본 <span style={{ color: "hsl(var(--success))" }}>운영진</span>분들의 이야기
        </motion.h2>
        <p
          className="text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[680px]"
          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
        >
          이미 {teamCount}개 팀, {memberCount.toLocaleString("ko-KR")}+명이 함께하고 있어요.
        </p>
      </div>

      {/* Marquee */}
      <div
        className="relative mt-12 lg:mt-14"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
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
            animationPlayState: paused ? "paused" : "running",
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
                    className="text-[12.5px]"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {t.age}세 · {t.years}년차
                  </div>
                </div>
                <span
                  className="font-display text-[12px] tracking-[0.18em] px-2 py-0.5 rounded-full whitespace-nowrap"
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
        `}</style>
      </div>
    </section>
  );
}
