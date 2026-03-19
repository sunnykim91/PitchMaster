"use client";

import { useEffect, useState } from "react";

const screens = [
  {
    title: "대시보드",
    tag: "Dashboard",
    color: "text-sky-400",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-sky-500/10 p-3">
          <p className="text-[10px] font-bold text-sky-400">NEXT MATCH</p>
          <p className="mt-1 text-sm font-bold text-white">2026-03-18 · 20:00</p>
          <p className="text-[11px] text-white/60">어린이대공원축구장 · vs Zelous</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">참석 9</span>
            <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">불참 12</span>
          </div>
        </div>
        <div className="rounded-lg bg-violet-500/10 p-3">
          <p className="text-[10px] font-bold text-violet-400">VOTES</p>
          <p className="mt-1 text-xs text-white/80">3/18 경기 참석 투표</p>
          <p className="text-[10px] text-white/40">마감: 3월 17일 20:00</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-3">
          <p className="text-[10px] font-bold text-amber-400">TASKS</p>
          <div className="mt-1 space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] text-white/70"><span className="h-1 w-1 rounded-full bg-amber-400" />다음 경기 참석 투표 완료하기</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/70"><span className="h-1 w-1 rounded-full bg-amber-400" />최근 경기 MVP 투표 완료하기</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "실시간 참석 투표",
    tag: "실시간",
    color: "text-primary",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs font-bold text-white">2026-03-18 · 20:00</p>
          <p className="text-[10px] text-white/50">어린이대공원축구장</p>
        </div>
        <div className="flex gap-1.5">
          <button className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-white">참석</button>
          <button className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold text-white/50">불참</button>
          <button className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold text-white/50">미정</button>
        </div>
        <p className="text-[10px] text-white/40">내 투표: 참석</p>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="font-bold text-primary">참석 9</span>
          <span className="text-white/30">·</span>
          <span className="font-bold text-red-400">불참 12</span>
          <span className="text-white/30">·</span>
          <span className="font-bold text-amber-400">미정 3</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="flex h-full">
            <div className="bg-primary" style={{ width: "37.5%" }} />
            <div className="bg-red-500" style={{ width: "50%" }} />
            <div className="bg-amber-500" style={{ width: "12.5%" }} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <p className="text-[10px] text-primary">실시간 동기화 중</p>
        </div>
      </div>
    ),
  },
  {
    title: "내 기록 · 레이더 차트",
    tag: "Records",
    color: "text-violet-400",
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "득점", value: "5", color: "text-primary", bg: "bg-primary/10" },
            { label: "어시", value: "3", color: "text-sky-400", bg: "bg-sky-500/10" },
            { label: "MVP", value: "2", color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "출석", value: "80%", color: "text-violet-400", bg: "bg-violet-500/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg p-2 text-center ${s.bg}`}>
              <p className="text-[9px] text-white/50">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Radar chart mockup */}
        <div className="flex items-center justify-center py-2">
          <svg viewBox="0 0 200 200" className="h-32 w-32">
            <polygon points="100,20 180,75 155,165 45,165 20,75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <polygon points="100,45 158,85 140,150 60,150 42,85" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <polygon points="100,70 136,95 125,135 75,135 64,95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <polygon points="100,35 170,80 148,158 52,158 30,80" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="2" />
            <text x="100" y="14" textAnchor="middle" fill="#94a3b8" fontSize="9">득점</text>
            <text x="188" y="78" textAnchor="start" fill="#94a3b8" fontSize="9">어시</text>
            <text x="160" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">MVP</text>
            <text x="40" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">출석률</text>
            <text x="12" y="78" textAnchor="end" fill="#94a3b8" fontSize="9">공헌</text>
          </svg>
        </div>
        <div className="space-y-1.5">
          {[
            { rank: 1, name: "김선휘", goals: 8, color: "text-primary" },
            { rank: 2, name: "장석민", goals: 5, color: "text-white/70" },
            { rank: 3, name: "황석훈", goals: 3, color: "text-white/50" },
          ].map((r) => (
            <div key={r.rank} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2">
                <span className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${r.rank === 1 ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40"}`}>{r.rank}</span>
                <span className="text-white/80">{r.name}</span>
              </span>
              <span className={`font-bold ${r.color}`}>{r.goals}골</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "AI 라인업 추천",
    tag: "AI",
    color: "text-purple-400",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-bold text-primary">AI 추천</p>
          <p className="mt-1 text-xs font-bold text-white">4-3-3 배치 추천</p>
          <p className="text-[10px] text-white/50">선호 포지션 일치 8/10명</p>
        </div>
        {/* Mini tactics board */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10" style={{ background: "#1a6b32" }}>
          <div className="absolute inset-2 rounded-sm border border-white/20" />
          <div className="absolute inset-x-2 top-1/2 h-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          {[
            { x: 50, y: 90 }, { x: 18, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 82, y: 70 },
            { x: 30, y: 48 }, { x: 50, y: 45 }, { x: 70, y: 48 },
            { x: 22, y: 22 }, { x: 50, y: 18 }, { x: 78, y: 22 },
          ].map((p, i) => (
            <div key={i} className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-md shadow-blue-500/30" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
          ))}
        </div>
        <button className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white">추천 배치 적용하기</button>
      </div>
    ),
  },
  {
    title: "팀 전적",
    tag: "통계",
    color: "text-primary",
    content: (
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">9승</span>
          <span className="text-xl font-bold text-white/40">0무</span>
          <span className="text-xl font-bold text-red-400">1패</span>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">승률 90%</span>
        </div>
        <div className="flex gap-3 text-[11px] text-white/50">
          <span>득점 <strong className="text-white">63</strong></span>
          <span>실점 <strong className="text-white">28</strong></span>
          <span>득실차 <strong className="text-primary">+35</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">최근 5경기</span>
          {["승", "패", "승", "승", "승"].map((r, i) => (
            <span key={i} className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${r === "승" ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400"}`}>{r}</span>
          ))}
        </div>
        <div className="mt-1 space-y-1.5">
          {[
            { date: "3.10", opp: "메짤라", score: "2:0", color: "text-primary" },
            { date: "3.04", opp: "메짤라", score: "2:3", color: "text-red-400" },
            { date: "2.23", opp: "영안FC", score: "8:6", color: "text-primary" },
          ].map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-[10px] text-white/50">{m.date} · {m.opp}</span>
              <span className={`text-xs font-bold ${m.color}`}>{m.score}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "회비 자동 정리",
    tag: "캡쳐 인식",
    color: "text-blue-400",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-center text-[10px] text-white/40">모임통장</p>
          <p className="mt-1 text-center text-lg font-bold text-white">1,202,592원</p>
        </div>
        <div className="space-y-0 rounded-lg bg-white/5 overflow-hidden">
          {[
            { date: "03.16", name: "김선휘", amount: "+30,000", color: "text-blue-400" },
            { date: "03.12", name: "장석민", amount: "+30,000", color: "text-blue-400" },
            { date: "03.10", name: "구장대여", amount: "-79,230", color: "text-white" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between border-t border-white/5 px-3 py-2.5">
              <div>
                <p className="text-[10px] text-white/30">{t.date}</p>
                <p className="text-[11px] font-medium text-white/80">{t.name}</p>
              </div>
              <p className={`text-xs font-bold ${t.color}`}>{t.amount}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
          <span className="text-sm">📸</span>
          <p className="text-[10px] text-blue-400">스크린샷을 올리면 자동으로 인식해요</p>
        </div>
      </div>
    ),
  },
];

export default function AppScreenSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screens.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const screen = screens[current];

  return (
    <div className="space-y-3">
      {/* Phone frame */}
      <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[2rem] border-2 border-white/10 bg-[#0a0c10] p-1.5 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#0a0c10]" />

        {/* Screen */}
        <div className="relative min-h-[420px] overflow-hidden rounded-[1.4rem] bg-[#0f1117] px-4 pb-4 pt-8">
          {/* Status bar */}
          <div className="mb-3 flex items-center justify-between px-1">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${screen.color}`}>
              {screen.tag}
            </p>
            <p className="text-[10px] text-white/30">PitchMaster</p>
          </div>
          <p className="mb-3 text-base font-bold text-white">{screen.title}</p>

          {/* Content with fade transition */}
          <div key={current} className="animate-fade-in">
            {screen.content}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2">
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="flex items-center justify-center p-2"
          >
            <span className={`block rounded-full transition-all ${
              i === current ? "h-1.5 w-6 bg-primary" : "h-1.5 w-1.5 bg-white/20"
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}
