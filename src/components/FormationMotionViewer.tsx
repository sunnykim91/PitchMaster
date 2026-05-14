"use client";

/**
 * FormationMotionViewer — 포메이션 공/수 움직임 SVG 애니메이션.
 *
 * 동작:
 *  - 공격/수비 모드 토글
 *  - phase 별 좌표를 framer-motion 으로 보간 (1.2초 transition + 1.8초 정지) loop
 *  - 본인 포지션 슬롯은 primary 강조색
 *  - 공 위치는 흰 점 + 펄스
 *  - 일시정지/재생 토글
 *
 * 좌표계: 0~100 비율 (formations.ts 와 동일).
 *  - viewBox 100 × 100
 *  - y=0 상대 골대 (위) / y=100 우리 골대 (아래)
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Pause, Play, Shield, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormationMotion, MotionPhase } from "@/lib/formationMotions";

interface Props {
  motion: FormationMotion;
  /** 본인 슬롯 id (예: "cam") — 강조 색상. 미지정 시 모두 동일 색 */
  highlightSlot?: string;
  /** 본인 슬롯 라벨 (한국어 — 예: "공격형 미드"). 캡션에 부제로 노출 */
  highlightLabel?: string;
  /** 사용자가 배속을 바꿀 때 부모에게 통지 (GIF export 동일 배속 사용 등) */
  onRateChange?: (rate: PlaybackRate) => void;
  /** 컴팩트 모드 — 모드 토글·phase 진행 표시·캡션 영역을 축소.
   * 편집 화면 옆 인라인 미니뷰 등 좁은 공간 사용에 적합. */
  compact?: boolean;
  /** 외부에서 모드를 통제 — compact 미니뷰에서 부모 mode와 sync */
  controlledMode?: "attack" | "defense";
  /** 첫 진입 시 사용할 초기 배속 — 저장된 영상의 defaultRate 같은 경우 */
  initialRate?: PlaybackRate;
}

const STEP_DURATION = 1500; // ms — phase 안 한 step 머무는 시간
const BALL_OFFSET_Y = 2.4; // 공을 선수 점 발 옆으로 살짝 오프셋 — 라벨 가리지 않게
export const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** 축구공 — SVG 미니 디자인 (흰 원 + 검정 5각형 + panel 경계 선) */
function SoccerBall() {
  return (
    <g>
      <circle cx={0} cy={0} r={1.6} fill="white" stroke="#0f0f0f" strokeWidth={0.35} />
      <polygon
        points="0,-0.78 0.74,-0.24 0.46,0.63 -0.46,0.63 -0.74,-0.24"
        fill="#0f0f0f"
      />
      <line x1={0} y1={-0.78} x2={0} y2={-1.5} stroke="#0f0f0f" strokeWidth={0.22} />
      <line x1={0.74} y1={-0.24} x2={1.4} y2={-0.45} stroke="#0f0f0f" strokeWidth={0.22} />
      <line x1={-0.74} y1={-0.24} x2={-1.4} y2={-0.45} stroke="#0f0f0f" strokeWidth={0.22} />
      <line x1={0.46} y1={0.63} x2={0.85} y2={1.27} stroke="#0f0f0f" strokeWidth={0.22} />
      <line x1={-0.46} y1={0.63} x2={-0.85} y2={1.27} stroke="#0f0f0f" strokeWidth={0.22} />
    </g>
  );
}

/** 상대 공 (수비 시) — 옅은 회색 + 점선 stroke */
function OpponentBall() {
  return (
    <g>
      <circle
        cx={0}
        cy={0}
        r={1.6}
        fill="hsl(0 0% 78%)"
        stroke="hsl(0 0% 30%)"
        strokeWidth={0.35}
        strokeDasharray="0.5 0.35"
      />
      <polygon
        points="0,-0.78 0.74,-0.24 0.46,0.63 -0.46,0.63 -0.74,-0.24"
        fill="hsl(0 0% 30%)"
      />
    </g>
  );
}

export default function FormationMotionViewer({ motion: data, highlightSlot, highlightLabel, onRateChange, compact, controlledMode, initialRate }: Props) {
  const [internalMode, setInternalMode] = useState<"attack" | "defense">("attack");
  const mode = controlledMode ?? internalMode;
  const setMode = (m: "attack" | "defense") => {
    if (controlledMode) return; // 외부 통제 시 내부 setter 무시
    setInternalMode(m);
  };
  const [playing, setPlaying] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [rate, setRate] = useState<PlaybackRate>(initialRate ?? 1);

  const phases = mode === "attack" ? data.attack : data.defense;
  const phase = phases[phaseIdx] ?? phases[0];
  const steps = phase?.steps ?? [];
  const step = steps[stepIdx] ?? steps[0];

  // ⚠️ hook은 early return 이전에 모두 호출 (React #300 방지).
  // mode 전환 시 빈 phases가 되면 일찍 return하더라도 hook 갯수는 일관해야 함.

  // mode 또는 phase 변경 시 step 처음부터
  useEffect(() => {
    setStepIdx(0);
  }, [mode, phaseIdx]);

  useEffect(() => {
    setPhaseIdx(0);
  }, [mode]);

  // step 자동 재생 — 마지막 step 후 처음으로 돌아가 loop
  // 정지 phase (steps 1개) 는 자동 진행 안 함
  useEffect(() => {
    if (!playing || steps.length <= 1) return;
    if (!step) return; // phase 없는 경우 자동 진행 안 함
    const t = setTimeout(
      () => setStepIdx((i) => (i + 1) % steps.length),
      (step.duration ?? STEP_DURATION) / rate,
    );
    return () => clearTimeout(t);
  }, [stepIdx, playing, steps.length, step, rate]);

  // 빈 phases 가드 (compact 미니뷰·평면 영상에서 mode 토글 시 발생 가능)
  if (!phase || !step) {
    return (
      <div className="rounded-xl border border-border bg-background/40 p-4 text-center text-[12px] text-muted-foreground">
        이 모드는 아직 장면이 없어요
      </div>
    );
  }

  function cycleRate() {
    const i = PLAYBACK_RATES.indexOf(rate);
    const next = PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length];
    setRate(next);
    onRateChange?.(next);
  }
  const rateLabel = `${rate}×`;

  // slot id → 위치 맵
  const positionMap = new Map(step.positions.map((p) => [p.slot, p]));

  return (
    <div className={cn("rounded-xl border border-border bg-background/40", compact ? "p-2" : "p-3 sm:p-4")}>
      {/* 헤더: compact·controlledMode 둘 다 모드 토글 hide. 외부 통제일 땐 토글 어색. */}
      <div className={cn("flex items-center justify-between gap-2", compact ? "mb-1.5" : "mb-3")}>
        {!compact && !controlledMode && (
          <div className="inline-flex rounded-md border border-border bg-background p-0.5" role="group" aria-label="공격·수비 모드 전환">
            <button
              type="button"
              onClick={() => setMode("attack")}
              aria-pressed={mode === "attack"}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                mode === "attack"
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Swords className="h-3 w-3" aria-hidden="true" />
              공격 시
            </button>
            <button
              type="button"
              onClick={() => setMode("defense")}
              aria-pressed={mode === "defense"}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                mode === "defense"
                  ? "bg-[hsl(var(--info))] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3 w-3" aria-hidden="true" />
              수비 시
            </button>
          </div>
        )}
        {compact && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            mode === "attack" ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]" : "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]"
          )}>
            {mode === "attack" ? <Swords className="h-2.5 w-2.5" aria-hidden="true" /> : <Shield className="h-2.5 w-2.5" aria-hidden="true" />}
            {mode === "attack" ? "공격" : "수비"} 미니뷰
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cycleRate}
            className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md border border-border px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground hover:text-foreground"
            aria-label={`재생 배속 ${rateLabel} — 누르면 변경`}
            title={`배속 ${rateLabel}`}
          >
            {rateLabel}
          </button>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            aria-label={playing ? "일시정지" : "재생"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 진행 표시 (phase index) — compact는 단일 phase만 받으므로 숨김 */}
      <div className={cn("mb-2 flex items-center gap-1", compact && "hidden")}>
        {phases.map((p, i) => (
          <button
            key={p.label + i}
            type="button"
            onClick={() => {
              setPlaying(false);
              setPhaseIdx(i);
            }}
            className={cn(
              "flex-1 rounded px-2 py-1 text-[12.5px] font-semibold transition-colors text-center",
              i === phaseIdx
                ? mode === "attack"
                  ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
                  : "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 피치 SVG — 정사각형 (위·아래 여백 0). PC에서 viewport 높이 초과 시 폭이 같이 줄도록 max-height·max-width 동시 제한 */}
      <div
        className="relative mx-auto w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: "1 / 1",
          maxHeight: "calc(100vh - 220px)",
          maxWidth: "calc(100vh - 220px)",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          {/* 피치 배경 */}
          <rect x="0" y="0" width="100" height="100" fill="hsl(140 25% 18%)" />

          {/* 피치 라인 — 살짝 진하게 */}
          <g stroke="hsl(140 18% 45%)" strokeWidth="0.6" fill="none">
            {/* 외곽 */}
            <rect x="2" y="2" width="96" height="96" />
            {/* 하프라인 */}
            <line x1="2" y1="50" x2="98" y2="50" />
            {/* 센터 서클 */}
            <circle cx="50" cy="50" r="9" />
            <circle cx="50" cy="50" r="0.7" fill="hsl(140 18% 45%)" />
            {/* 우리 페널티 박스 (아래) */}
            <rect x="22" y="82" width="56" height="16" />
            <rect x="36" y="93" width="28" height="5" />
            {/* 상대 페널티 박스 (위) */}
            <rect x="22" y="2" width="56" height="16" />
            <rect x="36" y="2" width="28" height="5" />
          </g>

          {/* 선수 점 — slot id 별로 spring 모션 적용 (역동적인 튕김) */}
          {Array.from(positionMap.values()).map((pos) => {
            const isMe = highlightSlot === pos.slot;
            return (
              <motion.g
                key={pos.slot}
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: "spring", stiffness: 90 * rate, damping: 15, mass: 0.8 }}
                initial={false}
              >
                {/* 본인 포지션 펄스 링 — "여기가 나" 한눈에 */}
                {isMe && (
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={3.6}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    animate={{ r: [3.6, 7.5, 3.6], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r={isMe ? 3.6 : 2.6}
                  fill={isMe ? "hsl(var(--primary))" : "hsl(0 0% 92%)"}
                  stroke={isMe ? "hsl(var(--primary))" : "hsl(140 25% 18%)"}
                  strokeWidth="0.5"
                />
                <text
                  x={0}
                  y={0.6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.4"
                  fontWeight="700"
                  fill={isMe ? "white" : "hsl(140 30% 18%)"}
                >
                  {pos.slot.toUpperCase()}
                </text>
              </motion.g>
            );
          })}

          {/* 공 — 선수 점 옆에 오프셋 표시 (라벨 안 가림)
              · 공격: 흰 축구공 + 빠른 펄스 (우리 팀이 가짐)
              · 수비: 옅은 회색 + 점선 (상대 공) */}
          {step.ball && (
            <motion.g
              animate={{ x: step.ball.x, y: step.ball.y + BALL_OFFSET_Y, scale: [0.7, 1.15, 1] }}
              transition={{
                x: { type: "spring", stiffness: 120 * rate, damping: 16 },
                y: { type: "spring", stiffness: 120 * rate, damping: 16 },
                scale: { duration: 0.5 / rate, ease: "easeOut" },
              }}
              initial={false}
            >
              {mode === "attack" ? <SoccerBall /> : <OpponentBall />}
              {/* 펄스 ring — 작게 + 빠르게 */}
              <motion.circle
                cx={0}
                cy={0}
                r={1.6}
                fill="none"
                stroke={mode === "attack" ? "white" : "hsl(0 0% 65%)"}
                strokeWidth="0.3"
                animate={{ r: [1.6, 3.2, 1.6], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </svg>
      </div>

      {/* 캡션 — phase 라벨 + step 진행 + step caption. compact는 미니 1줄. */}
      {compact ? (
        <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px]">
          <span className="truncate font-semibold text-foreground">{phase.label}</span>
          {steps.length > 1 && (
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {stepIdx + 1}/{steps.length}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-background/60 p-2.5 text-[12px] leading-relaxed text-foreground">
          {highlightSlot && highlightLabel && (
            <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              내 포지션: {highlightLabel}
            </p>
          )}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-bold text-foreground">{phase.label}</span>
            {steps.length > 1 && (
              <span className="text-[12px] text-muted-foreground tabular-nums">
                {stepIdx + 1} / {steps.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">{step.caption}</p>
        </div>
      )}
    </div>
  );
}
