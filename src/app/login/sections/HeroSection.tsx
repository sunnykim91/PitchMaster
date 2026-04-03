"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Vote, CreditCard, LayoutGrid, ArrowDown, Bell, Calendar, Check, HelpCircle, X } from "lucide-react";

function PhoneMockup() {
  const [voteState, setVoteState] = useState({ yes: 8, no: 3, maybe: 2 });
  const total = voteState.yes + voteState.no + voteState.maybe;

  return (
    <div className="relative w-[280px] sm:w-[300px] md:w-[320px]">
      <div className="relative rounded-[44px] border-2 border-foreground/10 bg-background p-2.5 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-background" />

        <div className="relative overflow-hidden rounded-[36px] bg-card">
          <div className="px-4 pb-5 pt-10 min-h-[500px]">
            {/* Status bar */}
            <div className="mb-4 flex items-center justify-between px-1 text-[10px] text-foreground/40">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-6 rounded-sm border border-foreground/40 relative">
                  <div className="absolute inset-0.5 rounded-xs bg-[hsl(var(--success))]" style={{ width: "75%" }} />
                </div>
              </div>
            </div>

            {/* Team header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
                  <span className="text-xs font-bold text-primary-foreground">PM</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">FK Rebirth</div>
                  <div className="text-[10px] text-foreground/40">37명 멤버</div>
                </div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
                <Bell className="h-3.5 w-3.5 text-foreground/40" />
              </div>
            </div>

            {/* Next match card */}
            <div className="mb-3 rounded-2xl border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--info))]/30">
                    <Calendar className="h-3 w-3 text-[hsl(var(--info))]" />
                  </div>
                  <span className="text-xs font-semibold text-[hsl(var(--info))]">다음 경기</span>
                </div>
                <span className="rounded-full bg-[hsl(var(--info))]/30 px-2 py-0.5 text-xs font-bold text-foreground">D-3</span>
              </div>
              <div className="text-base font-bold text-foreground">수요일 저녁 8시</div>
              <div className="text-[11px] text-foreground/50">어린이대공원 축구장</div>
            </div>

            {/* Vote card */}
            <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/30">
                    <Vote className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary">참석 투표</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                  </span>
                  <span className="text-[10px] font-medium text-[hsl(var(--success))]">실시간</span>
                </div>
              </div>

              {/* Vote buttons */}
              <div className="mb-3 flex gap-1.5">
                <button
                  onClick={() => setVoteState((s) => ({ ...s, yes: s.yes + 1 }))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/20 py-2.5 text-xs font-semibold text-[hsl(var(--success))] transition-colors hover:bg-[hsl(var(--success))]/30"
                >
                  <Check className="h-3.5 w-3.5" />참석
                </button>
                <button
                  onClick={() => setVoteState((s) => ({ ...s, no: s.no + 1 }))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-destructive/30 bg-destructive/20 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/30"
                >
                  <X className="h-3.5 w-3.5" />불참
                </button>
                <button
                  onClick={() => setVoteState((s) => ({ ...s, maybe: s.maybe + 1 }))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-foreground/10 bg-foreground/10 py-2.5 text-xs font-semibold text-foreground/60 transition-colors hover:bg-foreground/15"
                >
                  <HelpCircle className="h-3.5 w-3.5" />미정
                </button>
              </div>

              {/* Vote bar */}
              <div className="mb-2 h-3.5 overflow-hidden rounded-full bg-black/30 flex">
                <div className="h-full rounded-l-full bg-[hsl(var(--success))] transition-all duration-500" style={{ width: `${(voteState.yes / total) * 100}%` }} />
                <div className="h-full bg-destructive transition-all duration-500" style={{ width: `${(voteState.no / total) * 100}%` }} />
                <div className="h-full rounded-r-full bg-foreground/30 transition-all duration-500" style={{ width: `${(voteState.maybe / total) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-medium">
                <span className="text-[hsl(var(--success))]">{voteState.yes}명 참석</span>
                <span className="text-destructive">{voteState.no}명 불참</span>
                <span className="text-foreground/40">{voteState.maybe}명 미정</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-2.5 text-center">
                <div className="text-lg font-bold text-foreground">{total}</div>
                <div className="text-[9px] text-foreground/40">총 응답</div>
              </div>
              <div className="rounded-xl border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 p-2.5 text-center">
                <div className="text-lg font-bold text-[hsl(var(--accent))]">25만</div>
                <div className="text-[9px] text-[hsl(var(--accent))]/60">회비 잔액</div>
              </div>
              <div className="rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-2.5 text-center">
                <div className="text-lg font-bold text-[hsl(var(--success))]">4-3-3</div>
                <div className="text-[9px] text-[hsl(var(--success))]/60">포메이션</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -inset-8 -z-10 rounded-full bg-primary/20 opacity-40 blur-3xl" />
    </div>
  );
}

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

            <h1 className={`mb-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "100ms" }}>
              <span className="block">총무님, 아직도</span>
              <span className="block text-primary">카톡으로 운영하세요?</span>
            </h1>

            <p className={`mx-auto mb-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "200ms" }}>
              참석 투표 · 회비 관리 · 자동 포지션 배치
              <br className="hidden sm:block" />
              골치 아픈 팀 관리, 이제 한 곳에서 한 번에.
            </p>

            {/* CTA */}
            <div className={`mb-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:items-start ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
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
                  <span className="line-through opacity-50">{b.from}</span>
                  <ArrowDown className="h-3 w-3 opacity-50" />
                  <span className="text-sm">{b.to}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right: Phone */}
          <div className={`flex justify-center lg:justify-end ${mounted ? "animate-fade-in-up" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
