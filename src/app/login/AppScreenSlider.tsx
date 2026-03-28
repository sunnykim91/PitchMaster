"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const screens = [
  { title: "대시보드", tag: "Dashboard", color: "text-[hsl(var(--info))]", src: "/screenshot/dashboard.png" },
  { title: "참석 투표", tag: "실시간", color: "text-primary", src: "/screenshot/vote.png" },
  { title: "내 기록 · 레이더 차트", tag: "Records", color: "text-[hsl(var(--accent))]", src: "/screenshot/records1.png" },
  { title: "스마트 라인업", tag: "라인업", color: "text-[hsl(var(--accent))]", src: "/screenshot/tactics.png" },
  { title: "전체 기록", tag: "통계", color: "text-primary", src: "/screenshot/records2.png" },
  { title: "회비 관리", tag: "캡쳐 인식", color: "text-[hsl(var(--info))]", src: "/screenshot/dues.png" },
];

export default function AppScreenSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screens.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const screen = screens[current];

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label="앱 화면 미리보기"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(false);
      }}
    >
      {/* Phone frame */}
      <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[2rem] border-2 border-foreground/10 bg-background p-1.5 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-background" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[1.4rem] bg-card">
          <div key={current} className="animate-fade-in">
            <Image
              src={screen.src}
              alt={screen.title}
              width={430}
              height={932}
              className="w-full h-auto"
              priority={current === 0}
            />
          </div>
        </div>
      </div>

      {/* Title */}
      <p className="text-center text-sm font-bold text-foreground">{screen.title}</p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? "자동 재생" : "자동 재생 일시정지"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-xs" aria-hidden="true">{isPaused ? "▶" : "⏸"}</span>
        </button>
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={screens[i].title}
            className="flex items-center justify-center p-2"
          >
            <span className={`block rounded-full transition-all ${
              i === current ? "h-1.5 w-6 bg-primary" : "h-1.5 w-1.5 bg-foreground/20"
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}
