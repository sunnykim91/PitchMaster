"use client";

/**
 * 팀 전술 애니메이션 편집기.
 *
 * 핵심 기능:
 *  - 모드 토글 (공격 / 수비)
 *  - phase 추가·삭제·이름 변경
 *  - step 추가·삭제·이전 step 복사 시작·캡션 편집
 *  - 편집 SVG 피치 — 이 포메이션의 선수 점(축구 11명·풋살 5~8명) + ball 드래그·드롭으로 좌표 조정
 *  - 미리보기 모드 (별도 토글) — 현재 phase 자동 재생
 *  - 저장 (PUT)
 *
 * 좌표:
 *  - 0~100 비율 (formations.ts 와 동일)
 *  - SVG viewBox 100×100
 *  - 드래그 시 boardRef.current.getBoundingClientRect() 로 변환 (TacticsBoard 패턴)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { formationTemplates } from "@/lib/formations";
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
  Download,
  Play,
  Pause,
  RotateCcw,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { exportMotionAsGif, downloadBlob, buildGifFilename } from "@/lib/animationExport/gifExport";
import { SortableStepChip } from "@/components/animations/SortableStepChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import { cn } from "@/lib/utils";
import FormationMotionViewer, { type PlaybackRate, PLAYBACK_RATES } from "@/components/FormationMotionViewer";
import type { AnimationCategory } from "@/lib/formationMotions/dbTypes";
import { ANIMATION_CATEGORIES, ANIMATION_CATEGORY_LABEL, toLegacyMotionShape } from "@/lib/formationMotions/dbTypes";
import {
  SETPIECE_SCENARIOS,
  SETPIECE_SCENARIO_LABEL,
  buildSetpieceStep,
  type SetpieceScenario,
} from "@/lib/formationMotions/setpieceTemplates";
import { NativeSelect } from "@/components/ui/native-select";

function isPlaybackRate(v: unknown): v is PlaybackRate {
  return typeof v === "number" && (PLAYBACK_RATES as readonly number[]).includes(v);
}
import type {
  TeamTacticalAnimation,
  TacticalAnimationData,
} from "@/lib/formationMotions/dbTypes";
import type { MotionPhase, MotionStep, PhasePosition } from "@/lib/formationMotions/types";

interface Props {
  initial: TeamTacticalAnimation;
}

type Mode = "attack" | "defense";

/** 4-2-3-1 폴백 (formationTemplates에 못 찾을 때만 — 일반적이지 않음). */
const FALLBACK_4231_POSITIONS: PhasePosition[] = [
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
  // 최대화·미니뷰 토글은 P1 정리에서 제거 (SVG max-height가 이미 viewport 친화이며
  // 인라인 재생 토글이 미니뷰 역할을 대신).
  // GIF export 진행 상태 (미리보기 모드에서 노출)
  type ExportTarget = "attack" | "defense" | "combined";
  const [exportingMode, setExportingMode] = useState<ExportTarget | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  // 미리보기에서 사용자가 고른 배속 — GIF export에도 그대로 적용.
  // 초기값은 저장된 영상 데이터의 defaultRate, 없으면 1×.
  // 변경 시 data.defaultRate 갱신 + dirty 처리 → 저장하면 다음 진입에도 유지.
  const [previewRate, setPreviewRate] = useState<PlaybackRate>(() => {
    const saved = initial.animation_data.defaultRate;
    return isPlaybackRate(saved) ? saved : 1;
  });
  function handlePreviewRateChange(next: PlaybackRate) {
    setPreviewRate(next);
    setData((prev) => ({ ...prev, defaultRate: next }));
    setDirty(true);
  }
  // 편집 모드 안에서 컷을 자동 재생 — 미리보기 화면 안 가도 흐름 확인
  const [editorPlaying, setEditorPlaying] = useState(false);
  // GIF export 중단 핸들 — 페이지 언마운트·이탈 시 worker 정리
  const exportHandleRef = useRef<{ abort: () => void } | null>(null);
  // 메타 정보 카드 접힘 상태 — Z Flip 5 같은 좁은 화면에서 캔버스 빨리 보이게 기본 접힘
  const [metaOpen, setMetaOpen] = useState(false);

  async function handleExportGif(targetMode: ExportTarget) {
    if (exportingMode) return;
    if (dirty) {
      showToast("저장하지 않은 변경사항이 있어요. 먼저 저장하세요.", "error");
      return;
    }

    // P3 평면 영상은 단일 phase로 wrap된 형태로 GIF export (mode는 카테고리에 따라).
    const legacy = toLegacyMotionShape(data);
    const sections =
      targetMode === "attack"
        ? [{ phases: legacy.attack, mode: "attack" as const }]
        : targetMode === "defense"
        ? [{ phases: legacy.defense, mode: "defense" as const }]
        : [
            { phases: legacy.attack, mode: "attack" as const },
            { phases: legacy.defense, mode: "defense" as const },
          ];
    const nonEmpty = sections.filter((s) => s.phases.length > 0 && s.phases.some((p) => p.steps.length > 0));
    if (nonEmpty.length === 0) {
      showToast("내보낼 장면이 없어요", "error");
      return;
    }

    setExportingMode(targetMode);
    setExportProgress(0);
    try {
      const handle = exportMotionAsGif(nonEmpty, {
        onProgress: (pct) => setExportProgress(pct),
        rate: previewRate,
      });
      exportHandleRef.current = handle;
      const blob = await handle.promise;
      const filename = buildGifFilename({
        animationName: name,
        formationId: initial.formation_id,
        mode: targetMode,
      });
      downloadBlob(blob, filename);
      showToast("GIF 다운로드 완료", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "GIF 만들기 실패", "error");
    } finally {
      exportHandleRef.current = null;
      setExportingMode(null);
      setExportProgress(0);
    }
  }

  // 컴포넌트 언마운트 시 진행 중인 GIF 인코딩 worker 정리
  useEffect(() => {
    return () => {
      exportHandleRef.current?.abort();
    };
  }, []);

  // P3 평면화 — data.steps 있으면 새 구조, 없으면 레거시(mode/phase) 사용.
  const isFlat = Array.isArray(data.steps);
  const phases = mode === "attack" ? data.attack : data.defense;
  const phase = phases[phaseIdx] ?? phases[0];
  const steps = isFlat ? (data.steps ?? []) : (phase?.steps ?? []);
  const step = steps[stepIdx] ?? steps[0];

  // 이 애니메이션의 포메이션 기반 시작 좌표 — 풋살(5~8명)이면 5~8 슬롯, 축구면 11 슬롯.
  const basePositions = useMemo<PhasePosition[]>(() => {
    const tpl = formationTemplates.find((f) => f.id === initial.formation_id);
    if (!tpl) return FALLBACK_4231_POSITIONS;
    return tpl.slots.map((s) => ({ slot: s.id, x: s.x, y: s.y }));
  }, [initial.formation_id]);

  // 모드별 마지막 phase·step 기억 — 공격에서 작업 중 수비 잠깐 봤다가
  // 돌아왔을 때 처음(0)으로 튕기지 않고 이어서 작업하도록.
  const lastPhaseByMode = useRef<{ attack: number; defense: number }>({ attack: 0, defense: 0 });
  const lastStepByMode = useRef<{ attack: number; defense: number }>({ attack: 0, defense: 0 });
  const prevModeRef = useRef<Mode>(mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    if (prev !== mode) {
      lastPhaseByMode.current[prev] = phaseIdx;
      lastStepByMode.current[prev] = stepIdx;
      prevModeRef.current = mode;
      setPhaseIdx(lastPhaseByMode.current[mode]);
      setStepIdx(lastStepByMode.current[mode]);
    }
  }, [mode, phaseIdx, stepIdx]);
  // phase 변경 시 step 처음으로
  useEffect(() => {
    setStepIdx(0);
  }, [phaseIdx]);

  // 편집 모드 인라인 재생 — 1.5초마다 다음 컷, 마지막에서 첫 컷으로 loop
  useEffect(() => {
    if (!editorPlaying || steps.length <= 1) return;
    const t = setTimeout(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 1500);
    return () => clearTimeout(t);
  }, [editorPlaying, stepIdx, steps.length]);
  // 재생 중에 phase·mode 바뀌면 자동 정지 (혼선 방지)
  useEffect(() => {
    setEditorPlaying(false);
  }, [phaseIdx, mode]);

  // ── 저장 안 한 채 / GIF 인코딩 중 탭 닫기·새로고침·뒤로가기 시도 시 브라우저 경고 ──
  useEffect(() => {
    if (!dirty && !exportingMode) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, exportingMode]);

  // 첫 진입 인라인 안내 — localStorage 1회 토글로 dismiss
  const COACH_KEY = "animation-editor-coach-v1";
  const [coachOpen, setCoachOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(COACH_KEY)) setCoachOpen(true);
    } catch {
      // ignore
    }
  }, []);
  function dismissCoach() {
    setCoachOpen(false);
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      // ignore
    }
  }

  // 키보드 단축키 — Space 재생/정지, ←/→ 컷 이동, Ctrl/Cmd+S 저장.
  // INPUT/TEXTAREA 입력 중에는 비활성, 미리보기 모드도 비활성.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (previewing) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (!saving && dirty) void handleSave();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (steps.length > 1) setEditorPlaying((v) => !v);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStepIdx((i) => Math.min(steps.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStepIdx((i) => Math.max(0, i - 1));
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, saving, dirty, steps.length]);

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
    if (isFlat) {
      patchData({
        ...data,
        steps: (data.steps ?? []).map((s, i) => (i === stepIdx ? updater(s) : s)),
      });
      return;
    }
    patchPhase((phase) => ({
      ...phase,
      steps: phase.steps.map((s, i) => (i === stepIdx ? updater(s) : s)),
    }));
  }

  // P3 평면 영상의 steps 배열 통째 갱신 헬퍼 (추가·삭제·정렬)
  function patchFlatSteps(updater: (steps: MotionStep[]) => MotionStep[]) {
    patchData({
      ...data,
      steps: updater(data.steps ?? []),
    });
  }

  // 카테고리 변경 (평면 영상 전용)
  function setCategory(c: AnimationCategory) {
    patchData({ ...data, category: c });
  }

  // ── Phase 관리 ──
  function addPhase() {
    // 새 phase 는 이 애니메이션의 포메이션 기본 배치 + 공 표시(중앙)로 시작.
    const newPhase: MotionPhase = {
      label: "새 단계",
      steps: [
        {
          caption: "",
          ball: { x: 50, y: 50 },
          positions: basePositions.map((p) => ({ ...p })),
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
          positions: basePositions.map((p) => ({ ...p })),
        };
    if (isFlat) {
      patchFlatSteps((curr) => [...curr, newStep]);
    } else {
      patchPhase((p) => ({ ...p, steps: [...p.steps, newStep] }));
    }
    setStepIdx(steps.length);
  }

  function duplicateStep() {
    if (!step) return;
    const newStep: MotionStep = {
      ...step,
      positions: step.positions.map((p) => ({ ...p })),
      ball: step.ball ? { ...step.ball } : null,
    };
    if (isFlat) {
      patchFlatSteps((curr) => [...curr, newStep]);
    } else {
      patchPhase((p) => ({ ...p, steps: [...p.steps, newStep] }));
    }
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
    if (isFlat) {
      patchFlatSteps((curr) => curr.filter((_, i) => i !== stepIdx));
    } else {
      patchPhase((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== stepIdx) }));
    }
    setStepIdx(Math.max(0, stepIdx - 1));
  }

  // ── 컷 순서 드래그 (long-press 200ms 활성화) ──
  const stepSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleStepDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(String(active.id).replace("step-", ""));
    const newIndex = Number(String(over.id).replace("step-", ""));
    if (!Number.isFinite(oldIndex) || !Number.isFinite(newIndex)) return;
    if (oldIndex < 0 || newIndex < 0) return;
    if (isFlat) {
      patchFlatSteps((curr) => arrayMove(curr, oldIndex, newIndex));
    } else {
      patchPhase((p) => ({ ...p, steps: arrayMove(p.steps, oldIndex, newIndex) }));
    }
    // 선택된 컷이 함께 이동하도록 stepIdx 추적
    let nextIdx = stepIdx;
    if (stepIdx === oldIndex) nextIdx = newIndex;
    else if (oldIndex < stepIdx && stepIdx <= newIndex) nextIdx = stepIdx - 1;
    else if (newIndex <= stepIdx && stepIdx < oldIndex) nextIdx = stepIdx + 1;
    setStepIdx(nextIdx);
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
          motion={{ formationId: initial.formation_id, ...toLegacyMotionShape(data) }}
          onRateChange={handlePreviewRateChange}
          initialRate={previewRate}
          category={data.category}
        />

        {/* GIF 다운로드 — 평면 영상은 카테고리 1개라 단일 버튼. 레거시 영상만 3분할(공격·수비·공수전체). */}
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-bold">GIF로 받아 공유하기</p>
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              {previewRate}× 배속
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            카톡 단톡방·문자에 그대로 던질 수 있는 GIF로 만들어드려요. 인코딩에 5~15초 정도.
            <br />
            위 미리보기 배속 그대로 저장돼요 — 배속을 바꾸려면 미리보기 상단의 <span className="font-bold">{previewRate}×</span> 버튼을 눌러 변경하세요.
          </p>
          <div className="flex flex-wrap gap-2">
            {isFlat ? (() => {
              // 평면 영상은 카테고리에 따라 단일 mode export
              const mode: ExportTarget = (data.category ?? "ATTACK") === "DEFENSE" ? "defense" : "attack";
              const isExportingThis = exportingMode === mode;
              return (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="gap-1"
                  disabled={exportingMode !== null}
                  onClick={() => handleExportGif(mode)}
                >
                  {isExportingThis ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {exportProgress}%
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      이 영상 GIF 다운로드
                    </>
                  )}
                </Button>
              );
            })() : (["attack", "defense", "combined"] as const).map((mode) => {
              const isExportingThis = exportingMode === mode;
              const label = mode === "attack" ? "공격" : mode === "defense" ? "수비" : "공수전체";
              const isCombined = mode === "combined";
              return (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={isCombined ? "default" : "outline"}
                  className="gap-1"
                  disabled={exportingMode !== null}
                  onClick={() => handleExportGif(mode)}
                >
                  {isExportingThis ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {exportProgress}%
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      {label} GIF
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
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
          {/* 미리보기·최대화는 SVG 위 액션바로 통합 — 헤더는 탐색·저장만 */}
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

      {/* 메타 (이름·설명·대표 설정) — 좁은 화면 친화로 기본 접힘. 최대화 모드에선 캔버스 우선해 숨김. */}
      <div className="mb-5 rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setMetaOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[hsl(var(--secondary)_/_0.3)] rounded-xl"
          aria-expanded={metaOpen}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-semibold">{name || "이름 없음"}</span>
            {isDefault && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--primary)_/_0.15)] px-2 py-0.5 text-[10px] font-bold text-primary">
                <Star className="h-2.5 w-2.5" /> 대표
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {metaOpen ? "접기" : "편집"}
          </span>
        </button>
        {metaOpen && (
          <div className="space-y-3 border-t border-border/40 px-4 py-3">
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
        )}
      </div>

      {/* 첫 진입 안내 — 1회 표시 후 localStorage로 dismiss. 최대화 모드에선 숨김. */}
      {coachOpen && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-[hsl(var(--primary)_/_0.05)] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 text-[12.5px] leading-relaxed text-foreground">
              <p className="mb-1.5 font-bold text-primary">전술 영상은 이렇게 만들어요</p>
              <ol className="ml-4 list-decimal space-y-0.5 text-muted-foreground">
                <li><span className="text-foreground font-semibold">장면</span>(빌드업·압박 등)을 하나 골라 첫 컷 좌표를 잡으세요.</li>
                <li>컷 <span className="font-bold">+</span> 으로 다음 컷을 추가하고 점·공을 드래그해 옮기면 흐름이 됩니다.</li>
                <li>SVG 위 <span className="font-bold">▶ 재생</span>으로 즉시 확인하거나 <span className="font-bold">미리보기</span>에서 GIF로 받아 카톡 공유하세요.</li>
              </ol>
              <p className="mt-2 hidden text-[11px] text-muted-foreground/80 lg:block">
                키보드 단축키: <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">Space</kbd> 재생/정지 ·
                <kbd className="mx-0.5 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">← →</kbd> 컷 이동 ·
                <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">Ctrl+S</kbd> 저장
              </p>
            </div>
            <button
              type="button"
              onClick={dismissCoach}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="안내 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 평면(신규) 영상: 카테고리 칩 선택. 레거시 영상: 기존 mode/phase UI. */}
      {isFlat ? (
        <div className="mb-3 space-y-2">
          <div>
            <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">카테고리</span>
              <span className="text-[11px] text-muted-foreground/70">이 영상이 어떤 종류인지 고르세요</span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="영상 카테고리 선택">
              {ANIMATION_CATEGORIES.map((c) => {
                const active = (data.category ?? "ATTACK") === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {ANIMATION_CATEGORY_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SETPIECE일 때만: 시나리오 변경 + 처음 배치로 되돌리기 */}
          {data.category === "SETPIECE" && <SetpieceScenarioControl data={data} setData={setData} setDirty={setDirty} formationId={initial.formation_id} />}
        </div>
      ) : (
        <>
          {/* 모드 토글 — 레거시 영상 전용 */}
          <div
            className="mb-3 inline-flex rounded-md border border-border bg-background p-0.5"
            role="group"
            aria-label="공격·수비 모드 전환"
          >
            <button
              type="button"
              onClick={() => setMode("attack")}
              aria-pressed={mode === "attack"}
              className={cn(
                "inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
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
                "inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "defense"
                  ? "bg-[hsl(var(--info))] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3 w-3" aria-hidden="true" />
              수비 시
            </button>
          </div>

          {/* 장면 탭 (phase) — 레거시 전용 */}
          <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">장면</span>
            <span className="text-[11px] text-muted-foreground/70">
              (레거시 영상) 빌드업·압박처럼 큰 흐름 단위
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1 pb-1">
            {phases.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhaseIdx(i)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[32px]",
                  i === phaseIdx
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)_/_0.1)] text-[hsl(var(--primary))]"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={addPhase}
              className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground min-h-[32px]"
            >
              <Plus className="mr-1 inline h-3 w-3" />
              장면 추가
            </button>
          </div>

          {/* 장면 이름 + 삭제 — 레거시 전용 */}
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
              className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-[hsl(var(--destructive)_/_0.1)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              장면 삭제
            </Button>
          </div>
        </>
      )}

      {/* 컷 탭 (step) — 라벨과 순서 변경 안내를 같은 줄 왼쪽에 묶어 PC에서도 시선 분산 없게 */}
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          장면 안의 컷 (이어 재생되며 영상이 됨)
        </div>
        {steps.length > 1 && (
          <div className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground/70">
            💡 꾹 눌러 순서 변경
          </div>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1 pb-1">
        <DndContext sensors={stepSensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
          <SortableContext
            items={steps.map((_, i) => `step-${i}`)}
            strategy={horizontalListSortingStrategy}
          >
            {steps.map((_, i) => (
              <SortableStepChip
                key={`step-${i}`}
                index={i}
                active={i === stepIdx}
                onSelect={() => setStepIdx(i)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={addStep}
          className="min-h-[32px] min-w-[32px] rounded px-2 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
          title="현재 컷 복사해 다음 컷 추가"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={duplicateStep}
          className="min-h-[32px] min-w-[32px] rounded px-2 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
          title="현재 컷 복사"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={deleteStep}
          className="min-h-[32px] min-w-[32px] rounded px-2 py-1.5 text-[12.5px] font-semibold text-destructive hover:bg-[hsl(var(--destructive)_/_0.1)]"
          title="현재 컷 삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* 편집 SVG 위 컴팩트 액션 바 — 인라인 재생·최대화·미리보기·저장 손쉽게 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-muted-foreground tabular-nums">
          컷 {stepIdx + 1} / {steps.length}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={editorPlaying ? "default" : "outline"}
            onClick={() => setEditorPlaying((v) => !v)}
            disabled={steps.length <= 1}
            className="h-7 text-xs gap-1"
            title={editorPlaying ? "이 장면 컷 자동 재생 정지" : "이 장면 컷 자동 재생 — 미리보기 안 가도 흐름 확인"}
            aria-label={editorPlaying ? "재생 정지" : "재생"}
          >
            {editorPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span className="hidden sm:inline">{editorPlaying ? "정지" : "재생"}</span>
          </Button>
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

      {/* 드래그 안내 — 첫 방문자 발견 가능성 ↑ */}
      <p className="mb-1.5 text-[11px] text-muted-foreground/80">
        💡 선수 점·공을 <span className="font-semibold text-foreground">드래그</span>해 위치를 옮기세요.
      </p>

      {/* 편집 SVG 피치 — viewport 높이 초과 시 폭이 같이 줄도록 max-height·max-width 동시 제한, 정사각 유지. */}
      <div
        className="mb-3 relative mx-auto w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: "1 / 1",
          maxHeight: "calc(100vh - 160px)",
          maxWidth: "calc(100vh - 160px)",
        }}
      >
        <svg
          ref={boardRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full select-none touch-none"
          role="application"
          aria-label={`전술 편집 캔버스 — ${mode === "attack" ? "공격" : "수비"} · ${phase?.label ?? ""} · 컷 ${stepIdx + 1}/${steps.length}. 선수 점·공을 드래그해 위치를 조정합니다.`}
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
              {/* 클릭 영역 확대 (투명 원) — 모바일 터치 정확도 ↑ (Z Flip 5 370px 기준 약 30px hit area) */}
              <circle cx={0} cy={0} r={8} fill="transparent" />
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
              <circle cx={0} cy={0} r={6} fill="transparent" />
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
      <div className="mb-3 space-y-2 rounded-md bg-[hsl(var(--card)_/_0.5)] p-3">
        <div>
          <Label htmlFor="step-caption" className="text-xs">컷 설명 (시청자가 읽을 짧은 글)</Label>
          <Textarea
            id="step-caption"
            value={step?.caption ?? ""}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="예: GK 가 좌측 센터백에게 패스 — 상대 압박을 끌어내며 우측으로 빠른 전환을 준비한다"
            className="mt-1 text-xs min-h-[64px] resize-y"
            rows={3}
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
            이 컷에서 공 표시{!step?.ball && " (체크하면 공이 나타남)"}
          </Label>
        </div>
      </div>

      <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        💡 선수 점·공을 직접 드래그해서 위치 조정. 컷마다 위치를 조금씩 다르게 두면 이어 재생할
        때 영상이 됩니다. <strong>저장</strong> 버튼을 눌러야 반영돼요.
      </p>

      {/* 저장 안 하고 나가면 경고 */}
      {dirty && (
        <p className="mt-3 text-center text-[12.5px] text-[hsl(var(--warning))]">
          저장하지 않은 변경 사항이 있어요. 페이지를 떠나기 전에 저장하세요.
        </p>
      )}

    </div>
  );
}

/**
 * 세트피스 영상 전용 — 시나리오 변경 = 좌표 재배치(B 안).
 *
 * 흐름:
 *  · 다른 시나리오로 변경: confirm → 새 시나리오 표준 배치로 11명 좌표 덮어씀
 *  · 같은 시나리오 옆 ↻ 리셋: 현재 시나리오 표준으로 좌표 다시 잡음 (사용자 미세조정 되돌릴 때)
 *
 * 별도 "처음 배치로 되돌리기" 버튼은 제거 — selector 변경 자체가 재배치 트리거라
 * UI/UX 더 직관적.
 */
function SetpieceScenarioControl({
  data,
  setData,
  setDirty,
  formationId,
}: {
  data: TacticalAnimationData;
  setData: React.Dispatch<React.SetStateAction<TacticalAnimationData>>;
  setDirty: (v: boolean) => void;
  formationId: string;
}) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const scenario = (data.setpieceScenario ?? "RIGHT_CORNER") as SetpieceScenario;
  const tpl = formationTemplates.find((f) => f.id === formationId);

  function applyTemplate(target: SetpieceScenario) {
    if (!tpl) {
      showToast("포메이션 정보를 못 찾았어요", "error");
      return;
    }
    const step = buildSetpieceStep(target, tpl.slots);
    setData((prev) => ({
      ...prev,
      setpieceScenario: target,
      steps: [{ ...step }],
    }));
    setDirty(true);
  }

  async function handleScenarioChange(next: SetpieceScenario) {
    if (next === scenario) return;
    const ok = await confirm({
      title: "시나리오 바꾸기",
      description: `${SETPIECE_SCENARIO_LABEL[next]} 배치로 11명 위치를 다시 잡습니다. 지금 잡아놓은 좌표는 사라져요.`,
      variant: "destructive",
      confirmLabel: "바꾸기",
    });
    if (!ok) return;
    applyTemplate(next);
    showToast(`${SETPIECE_SCENARIO_LABEL[next]}로 바꿨어요`);
  }

  async function handleReset() {
    const ok = await confirm({
      title: "이 시나리오 기본 배치로 리셋",
      description: `${SETPIECE_SCENARIO_LABEL[scenario]} 표준 배치로 11명 위치를 다시 잡습니다. 지금 잡아놓은 좌표는 사라져요.`,
      variant: "destructive",
      confirmLabel: "리셋",
    });
    if (!ok) return;
    applyTemplate(scenario);
    showToast("기본 배치로 리셋했어요");
  }

  return (
    <div className="rounded-md border border-border bg-[hsl(var(--secondary)_/_0.3)] p-2.5">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        세트피스 시나리오
      </p>
      <div className="flex items-center gap-1.5">
        <NativeSelect
          value={scenario}
          onChange={(e) => handleScenarioChange(e.target.value as SetpieceScenario)}
          className="h-8 min-w-0 flex-1 text-xs"
          aria-label="세트피스 시나리오 선택 (바꾸면 11명 위치도 다시 잡힙니다)"
        >
          {SETPIECE_SCENARIOS.map((s) => (
            <option key={s} value={s}>
              {SETPIECE_SCENARIO_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="현재 시나리오 기본 배치로 리셋"
          title="이 시나리오 기본 배치로 11명 위치 리셋 (미세조정 사라짐)"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground/80">
        💡 시나리오를 바꾸면 11명 위치가 새 표준 배치로 다시 잡혀요. 위치는 드래그로 미세조정 가능.
      </p>
    </div>
  );
}

