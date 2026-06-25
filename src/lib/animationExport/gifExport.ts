"use client";

/**
 * 전술 영상(MotionPhase[])을 GIF로 인코딩.
 *
 * 동작:
 *  - phase 안 step 사이에 linear 보간 프레임 6장씩 추가 (부드러운 이동)
 *  - 각 step에서 1초 머무름 (시청자가 위치 인지)
 *  - 캔버스 480x480 정사각 (피치 비율 유지)
 *  - public/gif.worker.js 워커로 인코딩 (메인 스레드 안 막힘)
 *
 * 호환성: Chrome/Safari/Firefox 모두 OK. 모바일에서 5~10초 소요.
 */

import type { MotionPhase, MotionStep, PhasePosition } from "@/lib/formationMotions/types";

export interface GifExportSection {
  phases: MotionPhase[];
  mode: "attack" | "defense";
}

export interface GifExportOptions {
  size?: number;
  onProgress?: (pct: number) => void;
  /** 재생 배속. 1=기본, 2=두 배 빠르게, 0.5=절반 속도. 미리보기와 동일 의미. */
  rate?: number;
}

/** 중단 가능한 GIF export 핸들 — 호출자가 abort() 호출로 worker 종료. */
export interface GifExportHandle {
  promise: Promise<Blob>;
  abort: () => void;
}

const HOLD_MS = 1000;
const TRANSITION_FRAMES = 6;
const TRANSITION_MS_PER_FRAME = 80;
const LAST_FRAME_HOLD_MS = 1500;
const SECTION_BREAK_MS = 600;

/**
 * 여러 섹션(공격·수비)을 순서대로 한 GIF에 인코딩.
 * 단일 모드만 export할 때도 `[{phases, mode}]` 형태로 호출.
 */
/**
 * 호출자가 abort 가능한 형태. 페이지 이탈·언마운트 시 abort()로 worker 정리.
 * 기존 `await exportMotionAsGif(...)` 호출은 깨므로 `await exportMotionAsGif(...).promise`로 변경.
 */
export function exportMotionAsGif(
  sections: GifExportSection[],
  options: GifExportOptions = {},
): GifExportHandle {
  let abortFn: () => void = () => {};
  const promise = runExport(sections, options, (fn) => {
    abortFn = fn;
  });
  return {
    promise,
    abort: () => abortFn(),
  };
}

async function runExport(
  sections: GifExportSection[],
  options: GifExportOptions,
  registerAbort: (fn: () => void) => void,
): Promise<Blob> {
  const size = options.size ?? 480;
  const rate = options.rate && options.rate > 0 ? options.rate : 1;

  if (sections.length === 0) throw new Error("내보낼 섹션이 없어요");

  // 평탄화 — 모든 (step, phaseLabel, mode) 펼침
  const flatSteps: { step: MotionStep; phaseLabel: string; mode: "attack" | "defense"; isSectionEnd: boolean }[] = [];
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    let stepCount = 0;
    for (let pIdx = 0; pIdx < section.phases.length; pIdx++) {
      const phase = section.phases[pIdx];
      for (let stIdx = 0; stIdx < phase.steps.length; stIdx++) {
        flatSteps.push({
          step: phase.steps[stIdx],
          phaseLabel: phase.label,
          mode: section.mode,
          isSectionEnd: false,
        });
        stepCount++;
      }
    }
    if (stepCount === 0) continue;
    // 섹션 마지막 step에 표식
    const last = flatSteps[flatSteps.length - 1];
    if (last && sIdx < sections.length - 1) last.isSectionEnd = true;
  }
  if (flatSteps.length === 0) throw new Error("내보낼 컷이 없어요");

  const { default: GIF } = await import("gif.js");
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: size,
    height: size,
    workerScript: "/gif.worker.js",
    background: "#2a4e3a",
  });
  // 외부에서 abort 호출 시 worker 정리. gif.js abort()는 worker 종료 + finished 이벤트 미발화.
  let aborted = false;
  registerAbort(() => {
    aborted = true;
    try {
      gif.abort();
    } catch {
      // worker 이미 종료된 경우 등 무시
    }
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2D context를 사용할 수 없어요");

  for (let i = 0; i < flatSteps.length; i++) {
    const { step, phaseLabel, mode, isSectionEnd } = flatSteps[i];
    const isLast = i === flatSteps.length - 1;
    const nextEntry = isLast ? null : flatSteps[i + 1];

    drawFrame(ctx, step, phaseLabel, mode, size);
    // 섹션 끝(공격→수비 전환)이면 마지막 frame 좀 더 머무름
    let delay: number;
    if (isLast) delay = LAST_FRAME_HOLD_MS;
    else if (isSectionEnd) delay = HOLD_MS + SECTION_BREAK_MS;
    else delay = HOLD_MS;
    gif.addFrame(ctx, { copy: true, delay: Math.max(20, Math.round(delay / rate)) });

    // 다음 step이 같은 섹션(같은 모드) + 섹션 끝 아닐 때만 보간
    if (nextEntry && !isSectionEnd && nextEntry.mode === mode) {
      const transitionDelay = Math.max(20, Math.round(TRANSITION_MS_PER_FRAME / rate));
      for (let f = 1; f <= TRANSITION_FRAMES; f++) {
        const t = f / (TRANSITION_FRAMES + 1);
        const interp = interpolateStep(step, nextEntry.step, t);
        drawFrame(ctx, interp, phaseLabel, mode, size);
        gif.addFrame(ctx, { copy: true, delay: transitionDelay });
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on("progress", (arg) => {
      if (aborted) return;
      if (typeof arg === "number") options.onProgress?.(Math.round(arg * 100));
    });
    gif.on("finished", (arg) => {
      if (aborted) return; // abort 후 도착한 finished는 무시
      if (arg instanceof Blob) resolve(arg);
      else reject(new Error("GIF 인코딩 결과가 Blob이 아니에요"));
    });
    gif.on("abort", () => reject(new Error("GIF 인코딩이 중단됐어요")));
    gif.render();
  });
}

function interpolateStep(a: MotionStep, b: MotionStep, t: number): MotionStep {
  const slotMap = new Map<string, PhasePosition>();
  for (const p of b.positions) slotMap.set(p.slot, p);

  const positions = a.positions.map((p) => {
    const next = slotMap.get(p.slot);
    if (!next) return p;
    return {
      slot: p.slot,
      x: p.x + (next.x - p.x) * t,
      y: p.y + (next.y - p.y) * t,
    };
  });

  let ball: { x: number; y: number } | null | undefined = null;
  if (a.ball && b.ball) {
    ball = {
      x: a.ball.x + (b.ball.x - a.ball.x) * t,
      y: a.ball.y + (b.ball.y - a.ball.y) * t,
    };
  } else if (b.ball) {
    ball = b.ball;
  } else if (a.ball) {
    ball = a.ball;
  }

  // 상대 선수 — id 기준으로 보간 (다음 컷에 같은 id 있으면 이동, 없으면 현재 위치 유지)
  const oppMap = new Map((b.opponents ?? []).map((o) => [o.id, o]));
  const opponents = (a.opponents ?? []).map((o) => {
    const next = oppMap.get(o.id);
    if (!next) return o;
    return { id: o.id, x: o.x + (next.x - o.x) * t, y: o.y + (next.y - o.y) * t };
  });

  return {
    caption: t < 0.5 ? a.caption : b.caption,
    ball,
    positions,
    opponents,
  };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  step: MotionStep,
  phaseLabel: string,
  mode: "attack" | "defense",
  size: number,
) {
  const scale = size / 100;

  ctx.fillStyle = "#2a4e3a";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#5e8474";
  ctx.lineWidth = 0.6 * scale;

  ctx.strokeRect(2 * scale, 2 * scale, 96 * scale, 96 * scale);

  ctx.beginPath();
  ctx.moveTo(2 * scale, 50 * scale);
  ctx.lineTo(98 * scale, 50 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(50 * scale, 50 * scale, 9 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(50 * scale, 50 * scale, 0.7 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#5e8474";
  ctx.fill();

  ctx.strokeRect(22 * scale, 2 * scale, 56 * scale, 16 * scale);
  ctx.strokeRect(36 * scale, 2 * scale, 28 * scale, 5 * scale);
  ctx.strokeRect(22 * scale, 82 * scale, 56 * scale, 16 * scale);
  ctx.strokeRect(36 * scale, 93 * scale, 28 * scale, 5 * scale);

  for (const pos of step.positions) {
    const x = pos.x * scale;
    const y = pos.y * scale;

    ctx.beginPath();
    ctx.arc(x, y, 3.6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#e6e6e6";
    ctx.fill();
    ctx.strokeStyle = "#2a4e3a";
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();

    ctx.fillStyle = "#1f3a2a";
    ctx.font = `bold ${2.4 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pos.slot.toUpperCase(), x, y + 0.6 * scale);
  }

  // 상대팀 선수 — 붉은 점 (우리 팀 흰 점과 대비)
  for (const opp of step.opponents ?? []) {
    const ox = opp.x * scale;
    const oy = opp.y * scale;
    ctx.beginPath();
    ctx.arc(ox, oy, 2.6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#d83838";
    ctx.fill();
    ctx.strokeStyle = "#561c1c";
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
  }

  if (step.ball) {
    const bx = step.ball.x * scale;
    const by = (step.ball.y + 2.4) * scale;
    ctx.beginPath();
    ctx.arc(bx, by, 1.6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = mode === "attack" ? "#ffffff" : "#c8c8c8";
    ctx.fill();
    ctx.strokeStyle = "#0f0f0f";
    ctx.lineWidth = 0.4 * scale;
    ctx.stroke();
  }

  // phase 라벨 — 좌상단 어두운 배경 위 흰 글씨
  const labelHeight = 5 * scale;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, size, labelHeight);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${2.8 * scale}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${mode === "attack" ? "공격" : "수비"} · ${phaseLabel}`, 2.5 * scale, labelHeight / 2);

  if (step.caption) {
    const captionHeight = 7 * scale;
    const captionY = size - captionHeight;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, captionY, size, captionHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${2.5 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 글자 잘림 방지 — 캔버스 폭의 96%로 제한
    const maxWidth = size * 0.96;
    let caption = step.caption;
    if (ctx.measureText(caption).width > maxWidth) {
      while (ctx.measureText(caption + "…").width > maxWidth && caption.length > 1) {
        caption = caption.slice(0, -1);
      }
      caption += "…";
    }
    ctx.fillText(caption, size / 2, captionY + captionHeight / 2);
  }
}

/**
 * GIF 파일명 빌더 — 카톡 받는 사람이 어떤 영상인지 한눈에 인지하도록.
 * 형식: `{팀명}_{포메이션}_{영상이름끝부분}_{모드}.gif`
 * - 공백·특수문자는 `_` 또는 제거
 * - 영상 이름이 이미 "{팀명} {포메이션} v{N}" 패턴이면 그대로 sanitize만
 */
export function buildGifFilename(parts: {
  animationName: string;
  formationId?: string;
  mode: "attack" | "defense" | "combined";
}): string {
  const modeLabel =
    parts.mode === "attack" ? "공격" :
    parts.mode === "defense" ? "수비" :
    "공수전체";
  const cleanName = parts.animationName
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .trim();
  const base = cleanName || parts.formationId || "전술영상";
  return `${base}_${modeLabel}.gif`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
