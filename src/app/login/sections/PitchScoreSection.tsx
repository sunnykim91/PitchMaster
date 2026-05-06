"use client";

/**
 * PitchScoreSection — 운영진 감독 노트 강조 섹션.
 *
 * 정체성 (45차 후속): PitchScore™ 는 운영진 전용 라인업 결정 도구.
 * 일반 회원은 평가받기만 하고 본인 점수는 운영진만 봄. 가이드 8번 섹션과 톤 일치.
 *
 * 구성:
 *  - 헤더: "감독 직감 → 데이터" 톤
 *  - SVG 레이더 + 종합 점수 + archetype + 추천 포지션 미리보기 (실제 UI 톤 그대로)
 *  - 가상 선수 더미 데이터 ("전천후 미드필더" — 실제 코드 archetype 패턴)
 */

import { motion, useInView } from "framer-motion";
import { Sparkles, Lock, ChevronRight } from "lucide-react";
import { useRef } from "react";

/* 더미 — 실제 attributes 응답 형태와 일치 */
const SAMPLE = {
  name: "민수",
  position: "CM",
  overall: 4.1,
  totalSamples: 7,
  archetype: "전천후 미드필더",
  comment: "패스 정확해요 · 드리블 좋아요 · 결정력 보강 필요해요",
  // 카테고리별 평균 (1~5)
  radar: [
    { name: "속도", value: 3.6, color: "#22c55e" },
    { name: "슈팅", value: 3.0, color: "#ef4444" },
    { name: "패스", value: 4.5, color: "#3b82f6" },
    { name: "드리블", value: 4.2, color: "#a855f7" },
    { name: "수비", value: 3.4, color: "#14b8a6" },
    { name: "체력", value: 4.6, color: "#f97316" },
  ],
  recommended: [
    { pos: "CM", name: "중앙 미드", score: 4.2 },
    { pos: "CAM", name: "공격형 미드", score: 3.9 },
    { pos: "CDM", name: "수비형 미드", score: 3.8 },
  ],
};

/* ----------------------------------- */
/* SVG 레이더 — recharts 미사용 (번들 ↓) */
/* ----------------------------------- */
function RadarPreview({ data }: { data: typeof SAMPLE.radar }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 88;
  const n = data.length;

  // 각 axis 좌표 (12시 시작, 시계방향)
  const axes = data.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  // 데이터 좌표 (1~5 → 0~radius 비율)
  const points = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (d.value / 5) * radius;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // 배경 grid (5단계)
  const grids = [1, 2, 3, 4, 5].map((level) => {
    const r = (level / 5) * radius;
    const pts = data.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    }).join(" ");
    return pts;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* 배경 grid */}
      {grids.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeOpacity={i === 4 ? 0.6 : 0.3}
        />
      ))}
      {/* axis 선 */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.x}
          y2={a.y}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeOpacity={0.4}
        />
      ))}
      {/* 데이터 polygon */}
      <path
        d={pathD}
        fill="hsl(var(--primary))"
        fillOpacity={0.25}
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
      {/* 데이터 점 */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={data[i].color} />
      ))}
      {/* 라벨 */}
      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (radius + 18);
        const ly = cy + Math.sin(angle) * (radius + 18);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="hsl(var(--muted-foreground))"
          >
            {data[i].name}
          </text>
        );
      })}
    </svg>
  );
}

export default function PitchScoreSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            <Sparkles className="h-3.5 w-3.5" />
            PitchScore<sup>™</sup>
          </div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
            감독 직감만으로 결정하나요?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <strong className="text-foreground">Triple Trust 알고리즘</strong>이 19개 능력치를 객관 점수로.
            <br className="hidden sm:block" />
            라인업·포지션 결정을 데이터가 보조해요.
          </p>
        </motion.div>

        {/* 미리보기 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto max-w-3xl"
        >
          {/* "운영진 화면" 라벨 */}
          <div className="absolute -top-3 left-4 z-10 inline-flex items-center gap-1 rounded-md bg-[hsl(var(--background))] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/40">
            <Lock className="h-3 w-3" />
            운영진 화면
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
            {/* 헤더: 이름 + 종합 점수 */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{SAMPLE.name}</h3>
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--primary))]">
                    {SAMPLE.position}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{SAMPLE.totalSamples}명이 평가함 · Triple Trust</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PitchScore</div>
                <div className="text-2xl font-black leading-none text-[hsl(var(--primary))]">
                  {SAMPLE.overall.toFixed(1)}
                  <span className="text-xs text-muted-foreground"> / 5</span>
                </div>
              </div>
            </div>

            {/* archetype + 코멘트 */}
            <div className="mb-5 rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-3">
              <div className="text-base font-bold text-[hsl(var(--primary))]">{SAMPLE.archetype}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{SAMPLE.comment}</p>
            </div>

            {/* 본문 — 레이더 + 추천 포지션 */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* 레이더 */}
              <div className="flex items-center justify-center">
                <RadarPreview data={SAMPLE.radar} />
              </div>

              {/* 추천 포지션 Top 3 */}
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  적합 포지션
                </div>
                <div className="space-y-2">
                  {SAMPLE.recommended.map((rec, idx) => (
                    <div
                      key={rec.pos}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold">
                          {idx === 0 && "👑 "}
                          {rec.name}
                        </span>
                        <span className="text-sm font-bold text-[hsl(var(--primary))]">
                          {rec.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 캡션 */}
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              5명 이상 평가가 누적되면 archetype·추천 포지션이 자동으로 분석돼요. 본인 평가는 가중치
              0.7로 보정해서 자기 평가 후하게 주는 경향을 잡아줍니다.
            </p>
          </div>
        </motion.div>

        {/* 작동 원리 3컷 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3"
        >
          {[
            {
              step: "1",
              title: "운영진이 평가",
              desc: "회원 목록·추천 3명·대시보드 task 3가지 진입. 19개 능력치 슬라이더 1~5점.",
              color: "var(--info)",
            },
            {
              step: "2",
              title: "Triple Trust 가중평균",
              desc: "운영진 ×1.3 / 본인 ×0.7. 최근 평가 가중. 한 명이 후하게 줘도 다수에 묻힘.",
              color: "var(--primary)",
            },
            {
              step: "3",
              title: "라인업에 활용",
              desc: "5명+ 누적 시 archetype·추천 포지션 자동. 자기팀 운영진만 조회.",
              color: "var(--success)",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-card/50 p-4">
              <div
                className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ background: `hsl(${s.color})` }}
              >
                {s.step}
              </div>
              <div className="text-sm font-bold">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* 가이드 링크 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <a
            href="/guide#pitchscore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-[hsl(var(--primary))]"
          >
            PitchScore™ 가이드 자세히 보기
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
