"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Vote, CreditCard, LayoutGrid, Check } from "lucide-react";

function VoteVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs text-primary">실시간 동기화 중</span>
      </div>
      {[
        { label: "참석", pct: 62, count: 8, color: "bg-[hsl(var(--success))]", text: "text-[hsl(var(--success))]" },
        { label: "불참", pct: 23, count: 3, color: "bg-destructive", text: "text-destructive" },
        { label: "미정", pct: 15, count: 2, color: "bg-foreground/30", text: "text-foreground/40" },
      ].map((v) => (
        <div key={v.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className={v.text}>{v.label}</span>
            <span className="text-foreground/60">{v.count}명 ({v.pct}%)</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div className={`h-full rounded-full ${v.color}`} style={{ width: `${v.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 z-10 h-0.5 animate-scan bg-gradient-to-r from-transparent via-[hsl(var(--info))] to-transparent" style={{ boxShadow: "0 0 12px hsl(var(--info) / 0.4)" }} />
      {[
        { name: "김민수", amount: "30,000원", status: "완료", color: "text-[hsl(var(--success))]" },
        { name: "이준혁", amount: "30,000원", status: "완료", color: "text-[hsl(var(--success))]" },
        { name: "박지훈", amount: "30,000원", status: "대기", color: "text-[hsl(var(--accent))]" },
        { name: "정수민", amount: "30,000원", status: "미납", color: "text-destructive" },
      ].map((t) => (
        <div key={t.name} className="flex items-center justify-between border-b border-foreground/5 py-2.5 last:border-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--info))]/20 text-xs font-medium text-[hsl(var(--info))]">{t.name[0]}</div>
            <span className="text-sm">{t.name}</span>
          </div>
          <div className="text-right">
            <div className="text-sm">{t.amount}</div>
            <div className={`text-[10px] ${t.color}`}>{t.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineupVisual() {
  const players = [
    { x: 50, y: 92 }, { x: 18, y: 74 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 82, y: 74 },
    { x: 30, y: 52 }, { x: 50, y: 48 }, { x: 70, y: 52 },
    { x: 22, y: 26 }, { x: 50, y: 20 }, { x: 78, y: 26 },
  ];
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl" style={{ background: "linear-gradient(to bottom, #1a6b32, #145528)" }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75">
        <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
        <circle cx="50" cy="37.5" r="10" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
        <rect x="25" y="0" width="50" height="12" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
        <rect x="25" y="63" width="50" height="12" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
      </svg>
      {players.map((p, i) => (
        <div key={i} className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg shadow-primary/40" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
      ))}
    </div>
  );
}

// 전술판 — 실제 서비스 스크린샷 사용
function TacticsBoard() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`mx-auto w-full max-w-sm transition-all duration-700 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
      <div className="overflow-hidden rounded-2xl border-2 border-foreground/10 shadow-2xl shadow-black/40">
        <Image
          src="/screenshots/tactisboard.png"
          alt="PitchMaster 전술판 — 4-3-3 포메이션 자동 배치"
          width={400}
          height={500}
          className="w-full object-cover"
          quality={85}
        />
      </div>
    </div>
  );
}

const features = [
  {
    icon: Vote, label: "참석 투표", tagline: "링크 하나면 끝",
    desc: "실시간 참석/불참 자동 집계, 마감 시간 설정으로 읽씹 걱정 제로",
    color: "primary", visual: "vote",
  },
  {
    icon: CreditCard, label: "회비 정산", tagline: "캡쳐 한 장이면 끝",
    desc: "은행 앱 이체 내역을 캡쳐해서 올리면 AI가 입금자와 금액을 자동 인식",
    color: "info", visual: "payment",
  },
  {
    icon: LayoutGrid, label: "스마트 라인업", tagline: "버튼 한 번이면 끝",
    desc: "선호 포지션과 실력 데이터 기반으로 쿼터별 라인업을 자동 생성",
    color: "accent", visual: "lineup",
  },
];

export default function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="features" className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">핵심 기능</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            총무가 매주 하는 일,<br /><span className="text-muted-foreground">세 가지로 끝.</span>
          </h2>
        </div>

        {/* 3 Feature Cards */}
        <div className="mb-20 grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`group relative overflow-hidden rounded-2xl border border-[hsl(var(--${f.color}))]/20 bg-[hsl(var(--${f.color}))]/5 p-7 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <p className={`mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--${f.color}))]`}>{f.label}</p>
              <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--${f.color}))]/20`}>
                <f.icon className={`h-5 w-5 text-[hsl(var(--${f.color}))]`} />
              </div>
              <h3 className="mb-1 text-lg font-semibold">&ldquo;{f.tagline}&rdquo;</h3>
              <p className="mb-7 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="border-t border-foreground/10 pt-5">
                {f.visual === "vote" && <VoteVisual />}
                {f.visual === "payment" && <PaymentVisual />}
                {f.visual === "lineup" && <LineupVisual />}
              </div>
            </div>
          ))}
        </div>

        {/* Tactics Board — 세로 형태 (우리 서비스) */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[hsl(var(--accent))]">Smart Lineup</p>
          <h3 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">
            버튼 한 번으로 완성하는 전술 보드
          </h3>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            참석자 명단을 바탕으로 최적의 포지션을 자동 배치하고, 드래그로 손쉽게 수정하세요.
          </p>
        </div>
        <TacticsBoard />
      </div>
    </section>
  );
}
