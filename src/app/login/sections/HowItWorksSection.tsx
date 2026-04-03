"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, UserPlus, Rocket } from "lucide-react";

const steps = [
  { number: "01", icon: LogIn, title: "카카오로 로그인", desc: "별도 회원가입 없이 카카오 계정으로 바로 시작" },
  { number: "02", icon: UserPlus, title: "팀 만들기 or 초대코드", desc: "새 팀을 만들거나 초대 링크로 기존 팀에 합류" },
  { number: "03", icon: Rocket, title: "운영 시작", desc: "일정 등록 → 투표 → 스마트 라인업 → 득점 기록" },
];

export default function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="how-it-works" className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">How It Works</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            세팅은 1분이면 끝납니다
          </h2>
        </div>

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-12">
          {/* Connecting line */}
          <div className="absolute left-[20%] right-[20%] top-16 hidden h-0.5 bg-gradient-to-r from-primary/50 via-[hsl(var(--info))]/50 to-[hsl(var(--accent))]/50 md:block" aria-hidden="true" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.number}
                className={`relative text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="relative mx-auto mb-5">
                  <div className="relative z-10 mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-border bg-secondary sm:h-32 sm:w-32">
                    <Icon className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
                  </div>
                  <div className="absolute -right-1 -top-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.number}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold sm:text-xl">{s.title}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
