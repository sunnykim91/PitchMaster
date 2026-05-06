"use client";

/**
 * 팀 전술 애니메이션 편집기.
 *
 * 핵심 기능:
 *  - 모드 토글 (공격 / 수비)
 *  - phase 추가·삭제·이름 변경
 *  - step 추가·삭제·이전 step 복사 시작·캡션 편집
 *  - 편집 SVG 피치 — 11명 점 + ball 드래그·드롭으로 좌표 조정
 *  - 미리보기 모드 (별도 토글) — 현재 phase 자동 재생
 *  - 저장 (PUT)
 *
 * 좌표:
 *  - 0~100 비율 (formations.ts 와 동일)
 *  - SVG viewBox 100×100
 *  - 드래그 시 boardRef.current.getBoundingClientRect() 로 변환 (TacticsBoard 패턴)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Eye,
  Pencil,
  Copy,
  Loader2,
  Star,
  Swords,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import { cn } from "@/lib/utils";
import FormationMotionViewer from "@/components/FormationMotionViewer";
import type {
  TeamTacticalAnimation,
  TacticalAnimationData,
} from "@/lib/formationMotions/dbTypes";
import type { MotionPhase, MotionStep, PhasePosition } from "@/lib/formationMotions/types";

interface Props {
  initial: TeamTacticalAnimation;
}

type Mode = "attack" | "defense";

/** 4-2-3-1 표준 배치 — 신규 phase/step 추가 시 시작 좌표 (formations.ts 와 동일) */
const BASE_4231_POSITIONS: PhasePosition[] = [
  { slot: "gk",  x: 50, y: 90 },
  { slot: "lb",  x: 8,  y: 70 },
  { slot: "lcb", x: 34, y: 80 },
  { slot: "rcb", x: 66, y: 80 },
  { slot: "rb",  x: 92, y: 70 },
  { slot: "ldm", x: 45, y: 64 },
  { slot: "rdm", x: 55, y: 64 },
  { slot: "lam", x: 30, y: 46 },
  { slot: "cam", x: 50, y: 40 },
  { slot: "ram", x: 70, y: 46 },
  { slot: "st",  x: 50, y: 26 },
];

export default function AnimationEditorClient({ initial }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [isDefault, setIsDefault] = useState(initial.is_default);
  const [data, setData] = useState<TacticalAnimationData>(initial.animation_data);

  const [mode, setMode] = useState<Mode>("attack");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const phases = mode === "attack" ? data.attack : data.defense;
  const phase = phases[phaseIdx] ?? phases[0];
  const steps = phase?.steps ?? [];
  const step = steps[stepIdx] ?? steps[0];

  // 모드 변경 시 phase/step 처음으로
  useEffect(() => {
    setPhaseIdx(0);
    setStepIdx(0);
  }, [mode]);
  // phase 변경 시 step 처음으로
  useEffect(() => {
    setStepIdx(0);
  }, [phaseIdx]);

  // 데이터 변경 시 dirty
  function patchData(next: TacticalAnimationData) {
    setData(next);
    setDirty(true);
  }

  function patchPhase(updater: (phase: MotionPhase) => MotionPhase) {
    const nextPhases = phases.map((p, i) => (i === phaseIdx ? updater(p) : p));
    patchData({
      ...data,
      [mode]: nextPhases,
    });
  }

  function patchStep(updater: (step: MotionStep) => MotionStep) {
    patchPhase((phase) => ({
      ...phase,
      steps: phase.steps.map((s, i) => (i === stepIdx ? updater(s) : s)),
    }));
  }

  // ── Phase 관리 ──
  function addPhase() {
    // 새 phase 는 항상 4-2-3-1 표준 배치 + 공 표시(중앙)로 시작.
    const newPhase: MotionPhase = {
      label: "새 단계",
      steps: [
        {
          caption: "",
          ball: { x: 50, y: 50 }, // 기본 표시 (필요 없으면 사용자가 제거)
          positions: BASE_4231_POSITIONS.map((p) => ({ ...p })),
        },
      ],
    };
    const nextPhases = [...phases, newPhase];
    patchData({ ...data, [mode]: nextPhases });
    setPhaseIdx(nextPhases.length - 1);
  }

  async function deletePhase() {
    if (phases.length <= 1) {
      showToast("최소 1 개의 장면이 필요해요", "error");
      return;
    }
    const ok = await confirm({
      title: "장면 삭제",
      description: `"${phase.label}" 장면을 삭제합니다.`,
      variant: "destructive",
      confirmLabel: "삭제",
    });
    if (!ok) return;

    const nextPhases = phases.filter((_, i) => i !== phaseIdx);
    patchData({ ...data, [mode]: nextPhases });
    setPhaseIdx(Math.max(0, phaseIdx - 1));
  }

  function renamePhase(label: string) {
    patchPhase((p) => ({ ...p, label }));
  }

  // ── Step 관리 ──
  function addStep() {
    // 현재 step 좌표 복사 — 미세 조정 패턴 자연스러움.
    // 공도 그대로 가져오되, 없으면 기본 표시(50,50) 추가.
    const newStep: MotionStep = step
      ? {
          caption: "",
          ball: step.ball ? { ...step.ball } : { x: 50, y: 50 },
          positions: step.positions.map((p) => ({ ...p })),
        }
      : {
          caption: "",
          ball: { x: 50, y: 50 },
          positions: BASE_4231_POSITIONS.map((p) => ({ ...p })),
        };
    patchPhase((p) => ({ ...p, steps: [...p.steps, newStep] }));
    setStepIdx(steps.length);
  }

  function duplicateStep() {
    if (!step) return;
    const newStep: MotionStep = {
      ...step,
      positions: step.positions.map((p) => ({ ...p })),
      ball: step.ball ? { ...step.ball } : null,
    };
    patchPhase((p) => ({ ...p, steps: [...p.steps, newStep] }));
    setStepIdx(steps.length);
  }

  async function deleteStep() {
    if (steps.length <= 1) {
      showToast("최소 1 개의 컷이 필요해요", "error");
      return;
    }
    const ok = await confirm({
      title: "컷 삭제",
      description: "현재 컷을 삭제합니다.",
      variant: "destructive",
      confirmLabel: "삭제",
    });
    if (!ok) return;
    patchPhase((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== stepIdx) }));
    setStepIdx(Math.max(0, stepIdx - 1));
  }

  function setCaption(caption: string) {
    patchStep((s) => ({ ...s, caption }));
  }

  function setBallEnabled(enabled: boolean) {
    patchStep((s) => ({
      ...s,
      ball: enabled ? s.ball ?? { x: 50, y: 50 } : null,
    }));
  }

  // ── 드래그 로직 (setPointerCapture 패턴 — closure 문제 회피) ──
  const boardRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<{ kind: "slot" | "ball"; slotId?: string } | null>(null);

  function clientToSvg(clientX: number, clientY: number) {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;
    if (dragging.kind === "ball") {
      patchStep((s) => ({ ...s, ball: pt }));
    } else if (dragging.kind === "slot" && dragging.slotId) {
      const id = dragging.slotId;
      patchStep((s) => ({
        ...s,
        positions: s.positions.map((p) =>
          p.slot === id ? { ...p, x: pt.x, y: pt.y } : p,
        ),
      }));
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture 안 잡혀있으면 무시 */
    }
    setDragging(null);
  }

  function startDragOnElement(
    e: React.PointerEvent,
    kind: "slot" | "ball",
    slotId?: string,
  ) {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture 실패 시 무시 (브라우저 차이) */
    }
    setDragging({ kind, slotId });
  }

  // ── 저장 ──
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/team/tactical-animations/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          animation_data: data,
          is_default: isDefault,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "저장 실패");
      }
      showToast("저장되었습니다", "success");
      setDirty(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  }

  // 위치 맵
  const positionMap = useMemo(
    () => (step ? new Map(step.positions.map((p) => [p.slot, p])) : new Map()),
    [step],
  );

  // 미리보기 모드일 때는 FormationMotionViewer 렌더
  if (previewing) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href="/settings/animations"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            목록으로
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPreviewing(false)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            편집 모드로
          </Button>
        </div>
        <h1 className="mb-3 text-xl font-bold">{name}</h1>
        <FormationMotionViewer
          motion={{ formationId: initial.formation_id, attack: data.attack, defense: data.defense }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* 뒤로가기 + 저장 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/settings/animations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPreviewing(true)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            미리보기
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            저장{dirty && " *"}
          </Button>
        </div>
      </div>

      {/* 메타 */}
      <div className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="anim-name" className="text-xs">이름</Label>
          <Input
            id="anim-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="anim-desc" className="text-xs">설명 (선택)</Label>
          <Input
            id="anim-desc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
            placeholder="예: 우리 팀 좌측 빌드업 — 풀백 오버랩 중심"
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="anim-default"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => {
              setIsDefault(e.target.checked);
              setDirty(true);
            }}
            className="h-4 w-4"
          />
          <Label htmlFor="anim-default" className="cursor-pointer text-xs flex items-center gap-1">
            <Star className="h-3 w-3" />
            우리 팀 대표로 설정 ({initial.formation_id} 경기에서 자동 노출)
          </Label>
        </div>
      </div>

      {/* 모드 토글 */}
      <div className="mb-3 inline-flex rounded-md border border-border bg-background p-0.5">
        <button
          type="button"
          onClick={() => setMode("attack")}
          className={cn(
            "inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            mode === "attack"
              ? "bg-[hsl(var(--primary))] text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Swords className="h-3 w-3" />
          공격 시
        </button>
        <button
          type="button"
          onClick={() => setMode("defense")}
          className={cn(
            "inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            mode === "defense"
              ? "bg-[hsl(var(--info))] text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield className="h-3 w-3" />
          수비 시
        </button>
      </div>

      {/* 장면 탭 (phase) */}
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">장면</div>
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {phases.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPhaseIdx(i)}
            className={cn(
              "shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
              i === phaseIdx
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={addPhase}
          className="shrink-0 rounded-md border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-1 inline h-3 w-3" />
          장면 추가
        </button>
      </div>

      {/* 장면 이름 + 삭제 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={phase?.label ?? ""}
          onChange={(e) => renamePhase(e.target.value)}
          placeholder="장면 이름 (예: 좌측 빌드업, 전방 압박)"
          className="h-8 max-w-[260px] text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={deletePhase}
          className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          장면 삭제
        </Button>
      </div>

      {/* 컷 탭 (step) */}
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        장면 안의 컷 (이어 재생되며 영상이 됨)
      </div>
      <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStepIdx(i)}
            className={cn(
              "shrink-0 rounded px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors",
              i === stepIdx
                ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          title="현재 컷 복사해 다음 컷 추가"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={duplicateStep}
          className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          title="현재 컷 복사"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={deleteStep}
          className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
          title="현재 컷 삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* 편집 SVG 위 컴팩트 액션 바 — 미리보기·저장 손쉽게 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          컷 {stepIdx + 1} / {steps.length}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPreviewing(true)}
            className="h-7 text-xs gap-1"
          >
            <Eye className="h-3 w-3" />
            미리보기
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="h-7 text-xs gap-1"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            저장{dirty && " *"}
          </Button>
        </div>
      </div>

      {/* 편집 SVG 피치 */}
      <div className="mb-3 relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: "1 / 1" }}>
        <svg
          ref={boardRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full select-none touch-none"
        >
          {/* 피치 배경 */}
          <rect x="0" y="0" width="100" height="100" fill="hsl(140 25% 18%)" />
          <g stroke="hsl(140 18% 45%)" strokeWidth="0.6" fill="none">
            <rect x="2" y="2" width="96" height="96" />
            <line x1="2" y1="50" x2="98" y2="50" />
            <circle cx="50" cy="50" r="9" />
            <rect x="22" y="82" width="56" height="16" />
            <rect x="36" y="93" width="28" height="5" />
            <rect x="22" y="2" width="56" height="16" />
            <rect x="36" y="2" width="28" height="5" />
          </g>

          {/* 선수 점 — 드래그 가능 (setPointerCapture) */}
          {step?.positions.map((pos) => (
            <g
              key={pos.slot}
              transform={`translate(${pos.x}, ${pos.y})`}
              onPointerDown={(e) => startDragOnElement(e, "slot", pos.slot)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: dragging?.slotId === pos.slot ? "grabbing" : "grab", touchAction: "none" }}
            >
              {/* 클릭 영역 확대 (투명 원) — 모바일 터치 정확도 ↑ */}
              <circle cx={0} cy={0} r={6} fill="transparent" />
              <circle cx={0} cy={0} r={3.6} fill="hsl(0 0% 92%)" stroke="hsl(140 25% 18%)" strokeWidth="0.5" />
              <text
                x={0}
                y={0.6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.4"
                fontWeight="700"
                fill="hsl(140 30% 18%)"
                style={{ pointerEvents: "none" }}
              >
                {pos.slot.toUpperCase()}
              </text>
            </g>
          ))}

          {/* 공 — 드래그 가능 (setPointerCapture) */}
          {step?.ball && (
            <g
              transform={`translate(${step.ball.x}, ${step.ball.y + 2.4})`}
              onPointerDown={(e) => startDragOnElement(e, "ball")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: dragging?.kind === "ball" ? "grabbing" : "grab", touchAction: "none" }}
            >
              {/* 클릭 영역 확대 */}
              <circle cx={0} cy={0} r={4} fill="transparent" />
              <circle cx={0} cy={0} r={1.8} fill="white" stroke="#0f0f0f" strokeWidth={0.4} />
              <polygon
                points="0,-0.78 0.74,-0.24 0.46,0.63 -0.46,0.63 -0.74,-0.24"
                fill="#0f0f0f"
                style={{ pointerEvents: "none" }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* 현재 컷 편집 — 설명 + 공 표시 */}
      <div className="mb-3 space-y-2 rounded-md bg-card/50 p-3">
        <div>
          <Label htmlFor="step-caption" className="text-xs">컷 설명 (시청자가 읽을 한 줄)</Label>
          <Input
            id="step-caption"
            value={step?.caption ?? ""}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="예: GK 가 좌측 센터백에게 패스"
            className="mt-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="ball-on"
            type="checkbox"
            checked={!!step?.ball}
            onChange={(e) => setBallEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="ball-on" className="cursor-pointer text-xs">
            공 표시 (기본 ON · 필요 없으면 체크 해제)
          </Label>
        </div>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 선수 점·공을 직접 드래그해서 위치 조정. 컷마다 위치를 조금씩 다르게 두면 이어 재생할
        때 영상이 됩니다. <strong>저장</strong> 버튼을 눌러야 반영돼요.
      </p>

      {/* 저장 안 하고 나가면 경고 */}
      {dirty && (
        <p className="mt-3 text-center text-[11px] text-[hsl(var(--warning))]">
          저장하지 않은 변경 사항이 있어요. 페이지를 떠나기 전에 저장하세요.
        </p>
      )}

    </div>
  );
}
