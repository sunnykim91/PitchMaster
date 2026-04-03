"use client";

import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    quote: "매주 금요일 저녁마다 한 명씩 전화하던 게, 링크 하나 보내고 끝이에요. 진짜 인생 바뀜.",
    name: "K총무", role: "조기축구 총무 4년차 · 25명 팀",
    highlight: "전화 25통 → 링크 1개", color: "primary",
  },
  {
    quote: "통장 캡쳐 올렸더니 회비가 자동으로 정리되더라고요. 엑셀 파일 삭제했습니다.",
    name: "P회장", role: "평일 풋살팀 회장 · 18명",
    highlight: "엑셀 삭제 완료", color: "info",
  },
  {
    quote: "경기장 도착 전에 라인업이 카톡으로 공유되니까 다들 좋아해요. 특히 쿼터별 균등 배분이 공정해서.",
    name: "L운영진", role: "주말 축구팀 · 35명 운영",
    highlight: "라인업 갈등 해소", color: "accent",
  },
];

export default function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative border-t border-border/30 bg-card/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">User Reviews</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">실제 사용 후기</h2>
          <p className="mt-2 text-muted-foreground">현재 활동 중인 팀 총무님들의 이야기</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`hover-lift relative rounded-2xl border border-border bg-card p-6 border-l-4 border-l-[hsl(var(--${t.color}))] sm:p-7 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <span className={`mb-5 inline-block rounded-full bg-[hsl(var(--${t.color}))]/15 px-3 py-1.5 text-xs font-bold text-[hsl(var(--${t.color}))]`}>
                {t.highlight}
              </span>
              <blockquote className="mb-6 text-base leading-relaxed text-foreground/80">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 border-t border-border pt-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--${t.color}))]/15 text-sm font-bold text-[hsl(var(--${t.color}))]`}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
