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

export interface GifExportOptions {
  mode: "attack" | "defense";
  size?: number;
  onProgress?: (pct: number) => void;
}

const HOLD_MS = 1000;
const TRANSITION_FRAMES = 6;
const TRANSITION_MS_PER_FRAME = 80;
const LAST_FRAME_HOLD_MS = 1500;

export async function exportMotionAsGif(
  phases: MotionPhase[],
  options: GifExportOptions,
): Promise<Blob> {
  const size = options.size ?? 480;

  if (phases.length === 0) {
    throw new Error("내보낼 장면이 없어요");
  }

  const flatSteps: { step: MotionStep; phaseLabel: string }[] = [];
  for (const phase of phases) {
    for (const step of phase.steps) {
      flatSteps.push({ step, phaseLabel: phase.label });
    }
  }
  if (flatSteps.length === 0) {
    throw new Error("내보낼 컷이 없어요");
  }

  const { default: GIF } = await import("gif.js");
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: size,
    height: size,
    workerScript: "/gif.worker.js",
    background: "#2a4e3a",
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2D context를 사용할 수 없어요");

  for (let i = 0; i < flatSteps.length; i++) {
    const { step, phaseLabel } = flatSteps[i];
    const isLast = i === flatSteps.length - 1;
    const nextStep = isLast ? null : flatSteps[i + 1].step;

    drawFrame(ctx, step, phaseLabel, options.mode, size);
    gif.addFrame(ctx, { copy: true, delay: isLast ? LAST_FRAME_HOLD_MS : HOLD_MS });

    if (nextStep) {
      for (let f = 1; f <= TRANSITION_FRAMES; f++) {
        const t = f / (TRANSITION_FRAMES + 1);
        const interp = interpolateStep(step, nextStep, t);
        drawFrame(ctx, interp, phaseLabel, options.mode, size);
        gif.addFrame(ctx, { copy: true, delay: TRANSITION_MS_PER_FRAME });
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on("progress", (arg) => {
      if (typeof arg === "number") options.onProgress?.(Math.round(arg * 100));
    });
    gif.on("finished", (arg) => {
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

  return {
    caption: t < 0.5 ? a.caption : b.caption,
    ball,
    positions,
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
