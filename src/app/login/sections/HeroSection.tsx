"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Vote, CreditCard, LayoutGrid, ArrowDown, Smartphone, Dribbble, Sparkles, Monitor } from "lucide-react";
import AppScreenSlider from "../AppScreenSlider";

/* PhoneMockup removed — using AppScreenSlider with real screenshots instead */

export default function HeroSection({
  kakaoButton,
  demoButton,
  teamCount,
  memberCount,
}: {
  kakaoButton: ReactNode;
  demoButton: ReactNode;
  teamCount: number;
  memberCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-5 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">PM</span>
          </div>
          <span className="font-heading text-sm font-bold uppercase tracking-[0.2em]">PitchMaster</span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">기능</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">사용법</a>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 items-center px-5 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left */}
          <div className="text-center lg:text-left">
            <div className={`mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              </span>
              <span className="text-sm text-muted-foreground">{teamCount}개 팀 · {memberCount}+ 회원이 사용 중</span>
            </div>

            {/* Extra badges */}
            <div className={`mb-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "150ms" }}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI 감독 조수
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                앱 설치 없이 카카오톡으로 바로
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
                <Monitor className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
                PC·모바일 모두 지원
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
                <Dribbble className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                풋살 3~8인제 완전 지원
              </span>
            </div>

            <h1 className={`mb-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "100ms" }}>
              <span className="block">총무님, 아직도</span>
              <span className="block text-primary">카톡으로 운영하세요?</span>
            </h1>
            {/* SEO — 시각적으로 숨기지만 크롤러·스크린리더에는 노출되는 보조 h2 */}
            <h2 className="sr-only">
              피치마스터 PitchMaster — 조기축구 · 풋살 팀 관리 웹앱. 참석 투표, 회비 관리, AI 라인업 자동 배치, 전술판, 경기 기록, MVP 투표를 한 곳에서.
            </h2>

            <p className={`mx-auto mb-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "200ms" }}>
              참석 투표 · 회비 OCR · AI 전술 편성 · 자동 경기 후기
              <br className="hidden sm:block" />
              조기축구 · 풋살 팀 관리, 이제 한 곳에서 한 번에.
            </p>

            {/* CTA */}
            <div className={`mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
              {kakaoButton}
              {demoButton}
            </div>

            {/* Time badges */}
            <div className={`mb-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "400ms" }}>
              {[
                { icon: <Vote className="h-3.5 w-3.5" />, label: "참석 확인", from: "30분", to: "30초", color: "success" },
                { icon: <CreditCard className="h-3.5 w-3.5" />, label: "회비 정산", from: "30분", to: "1분", color: "info" },
                { icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "라인업", from: "20분", to: "3초", color: "accent" },
              ].map((b) => (
                <span key={b.label} className={`flex items-center gap-1.5 rounded-full bg-[hsl(var(--${b.color}))]/10 px-3 py-1.5 text-xs font-bold text-[hsl(var(--${b.color}))]`}>
                  {b.icon}
                  {b.label}
                  <span className="line-through opacity-50">{b.from}</span>
                  <ArrowDown className="h-3 w-3 opacity-50" />
                  <span className="text-sm">{b.to}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right: Real screenshots slider */}
          <div className={`mx-auto w-full max-w-sm flex-shrink-0 lg:mx-0 ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
            <AppScreenSlider />
          </div>
        </div>
      </div>
    </section>
  );
}
