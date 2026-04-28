"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Clock, MessageSquare, CreditCard, LayoutGrid } from "lucide-react";

const comparisons = [
  {
    icon: MessageSquare,
    title: "참석 확인",
    before: { text: "카톡에 물어보고, 읽씹, 결국 갠톡", time: "30분" },
    after: { text: "링크 하나 → 실시간 자동 집계", time: "30초" },
  },
  {
    icon: CreditCard,
    title: "회비 정산",
    before: { text: "통장 캡쳐 → 엑셀 → 이름 대조", time: "30분" },
    after: { text: "캡쳐 올리면 AI가 자동 인식·매칭", time: "1분" },
  },
  {
    icon: LayoutGrid,
    title: "선수 배치",
    before: { text: "경기장 도착 후 즉석 편성 + '왜 나만 수비?' 클레임", time: "20분" },
    after: { text: "선호 포지션 기반 자동 배치 + AI 감독 코칭", time: "3초" },
  },
];

export default function BeforeAfterSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-destructive">총무의 현실</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            이렇게 <span className="text-gradient">바뀝니다</span>
          </h2>
        </div>

        <div className="space-y-6">
          {comparisons.map((item, i) => (
            <div
              key={item.title}
              className={`relative grid gap-4 md:grid-cols-[1fr_auto_1fr] ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {/* Before */}
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 sm:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20">
                    <item.icon className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-destructive">Before</span>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                  </div>
                </div>
                <p className="mb-4 text-sm text-foreground/80 sm:text-base">{item.before.text}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-3.5 py-1.5 text-sm font-bold text-destructive">
                  <Clock className="h-4 w-4" />{item.before.time}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center md:px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--success))] shadow-xl shadow-[hsl(var(--success))]/40">
                  <ArrowDown className="h-5 w-5 text-white md:-rotate-90" />
                </div>
              </div>

              {/* After */}
              <div className="rounded-2xl border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/10 p-6 sm:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--success))]/20">
                    <item.icon className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--success))]">After</span>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                  </div>
                </div>
                <p className="mb-4 text-sm text-foreground/80 sm:text-base">{item.after.text}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--success))] px-4 py-2 text-base font-bold text-[hsl(var(--success-foreground))] shadow-lg shadow-[hsl(var(--success))]/40">
                  <Clock className="h-4 w-4" />{item.after.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={`mt-14 text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "600ms" }}>
          <div className="inline-flex items-center gap-5 rounded-2xl border border-border bg-card px-7 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive sm:text-3xl">1시간 20분</div>
              <div className="text-xs text-muted-foreground">이전 소요 시간</div>
            </div>
            <ArrowDown className="h-5 w-5 -rotate-90 text-muted-foreground" />
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--success))] sm:text-3xl">1분 34초</div>
              <div className="text-xs text-muted-foreground">현재 소요 시간</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
