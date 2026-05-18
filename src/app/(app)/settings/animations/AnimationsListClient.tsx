"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Pencil, Loader2, Copy, Download } from "lucide-react";
import { exportMotionAsGif, downloadBlob, buildGifFilename } from "@/lib/animationExport/gifExport";
import FormationMotionThumb from "@/components/FormationMotionThumb";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import { getFormationMotion } from "@/lib/formationMotions";
import { formationTemplates } from "@/lib/formations";
import type { TeamTacticalAnimation, TacticalAnimationData, AnimationCategory } from "@/lib/formationMotions/dbTypes";
import { ANIMATION_CATEGORIES, ANIMATION_CATEGORY_LABEL, categoryNeedsFormation, toLegacyMotionShape } from "@/lib/formationMotions/dbTypes";
import { inferAnimationCategory } from "@/lib/formationMotions/inferCategory";
import {
  SETPIECE_SCENARIOS,
  SETPIECE_SCENARIO_LABEL,
  buildSetpieceStep,
  type SetpieceScenario,
} from "@/lib/formationMotions/setpieceTemplates";
import type { PhasePosition } from "@/lib/formationMotions/types";
import type { SportType } from "@/lib/types";

interface Props {
  teamId: string;
  teamName: string;
  sportType: SportType;
  defaultPlayerCount: number;
  defaultFormationId?: string | null;
}

/**
 * 영상 만들기 포메이션 기본값 선택 우선순위:
 *  1) 팀의 default_formation_id (있고 같은 sportType이면)
 *  2) fieldCount === defaultPlayerCount 매치
 *  3) 같은 sportType의 첫 항목
 *  4) 축구 4-2-3-1 (안전 폴백)
 */
function pickDefaultFormation(
  sportType: SportType,
  defaultPlayerCount: number,
  teamDefaultFormationId?: string | null,
): string {
  if (teamDefaultFormationId) {
    const teamDefault = formationTemplates.find(
      (f) => f.id === teamDefaultFormationId && f.sportType === sportType,
    );
    if (teamDefault) return teamDefault.id;
  }
  const sameSport = formationTemplates.filter((f) => f.sportType === sportType);
  const sameCount = sameSport.find((f) => (f.fieldCount ?? 11) === defaultPlayerCount);
  if (sameCount) return sameCount.id;
  if (sameSport.length > 0) return sameSport[0].id;
  return "4-2-3-1";
}

export default function AnimationsListClient({ teamId: _teamId, teamName, sportType, defaultPlayerCount, defaultFormationId }: Props) {
  void _teamId;
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [animations, setAnimations] = useState<TeamTacticalAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportType>(sportType);
  const [createFormation, setCreateFormation] = useState(() =>
    pickDefaultFormation(sportType, defaultPlayerCount, defaultFormationId),
  );

  function handleSportToggle(next: SportType) {
    if (next === selectedSport) return;
    setSelectedSport(next);
    const fallbackCount = next === sportType ? defaultPlayerCount : (next === "FUTSAL" ? 6 : 11);
    // 종목 전환 시엔 팀 default_formation_id가 다른 종목용일 수 있어 우선순위 적용 안 함
    setCreateFormation(pickDefaultFormation(next, fallbackCount, next === sportType ? defaultFormationId : null));
  }

  const currentFormationName = formationTemplates.find((f) => f.id === createFormation)?.name ?? createFormation;
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyTargetFormation, setCopyTargetFormation] = useState<string>("");
  // 영상 만들기 — 카테고리 선택 + (세트피스면) 시나리오 선택
  const [createCategory, setCreateCategory] = useState<AnimationCategory>("ATTACK");
  const [createScenario, setCreateScenario] = useState<SetpieceScenario>("RIGHT_CORNER");
  /**
   * GIF export 진행 상태.
   * key = `${animationId}-${mode}` — 같은 영상 다른 모드를 동시에 누르지 못하게.
   */
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  // P2 카테고리 필터 — null이면 전체. animation_data.category 없으면 phase 라벨 기반 자동 추정.
  const [categoryFilter, setCategoryFilter] = useState<AnimationCategory | null>(null);

  // 추정된 카테고리 캐시 — 매 렌더마다 재계산 막기
  const animationsWithCategory = animations.map((a) => ({
    ...a,
    _category: inferAnimationCategory(a.animation_data),
  }));
  const filteredAnimations = (
    categoryFilter
      ? animationsWithCategory.filter((a) => a._category === categoryFilter)
      : animationsWithCategory
  )
    // 대표(⭐) 영상이 맨 위. 그 안에서 최신순.
    .slice()
    .sort((a, b) => {
      if (!!a.is_default !== !!b.is_default) return a.is_default ? -1 : 1;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });


  // 대표(⭐) 토글 — 마이그 00073 이후 카테고리·포메이션 무관 N개 가능. 다른 영상 영향 X.
  // 낙관적 업데이트 + 실패 시 rollback.
  const [togglingDefault, setTogglingDefault] = useState<string | null>(null);
  async function toggleDefault(animation: TeamTacticalAnimation) {
    if (togglingDefault) return;
    setTogglingDefault(animation.id);
    const next = !animation.is_default;
    setAnimations((prev) =>
      prev.map((a) => (a.id === animation.id ? { ...a, is_default: next } : a)),
    );
    try {
      const res = await fetch(`/api/team/tactical-animations/${animation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: next }),
      });
      if (!res.ok) {
        setAnimations((prev) =>
          prev.map((a) => (a.id === animation.id ? { ...a, is_default: !next } : a)),
        );
        const j = await res.json().catch(() => ({}));
        showToast(j.error ?? "대표 설정 실패", "error");
      } else {
        showToast(next ? "대표로 핀했어요" : "대표 핀 해제", "success");
      }
    } catch {
      setAnimations((prev) =>
        prev.map((a) => (a.id === animation.id ? { ...a, is_default: !next } : a)),
      );
      showToast("네트워크 오류", "error");
    } finally {
      setTogglingDefault(null);
    }
  }

  // 각 카테고리별 개수 (필터 칩에 노출)
  const categoryCounts = ANIMATION_CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = animationsWithCategory.filter((a) => a._category === c).length;
      return acc;
    },
    {} as Record<AnimationCategory, number>,
  );

  // 영상은 있는데 대표(⭐) 0개인 카테고리 — 매치 자동 노출이 안 됨. 운영진 알림용.
  const categoriesMissingDefault = ANIMATION_CATEGORIES.filter((c) => {
    const list = animationsWithCategory.filter((a) => a._category === c);
    if (list.length === 0) return false;
    return list.every((a) => !a.is_default);
  });

  async function handleExportGif(
    animation: TeamTacticalAnimation,
    mode: "attack" | "defense" | "combined",
  ) {
    const key = `${animation.id}-${mode}`;
    if (exportingKey) return;

    // P3 평면 영상은 카테고리 기반 단일 phase로 wrap. 레거시는 그대로.
    const legacy = toLegacyMotionShape(animation.animation_data);
    const sections =
      mode === "attack"
        ? [{ phases: legacy.attack, mode: "attack" as const }]
        : mode === "defense"
        ? [{ phases: legacy.defense, mode: "defense" as const }]
        : [
            { phases: legacy.attack, mode: "attack" as const },
            { phases: legacy.defense, mode: "defense" as const },
          ];

    // 비어있는 섹션 거름 — combined에서 한쪽만 있어도 진행
    const nonEmpty = sections.filter((s) => s.phases.length > 0 && s.phases.some((p) => p.steps.length > 0));
    if (nonEmpty.length === 0) {
      showToast("내보낼 장면이 없어요", "error");
      return;
    }

    setExportingKey(key);
    setExportProgress(0);
    try {
      const handle = exportMotionAsGif(nonEmpty, {
        onProgress: (pct) => setExportProgress(pct),
      });
      exportHandleRef.current = handle;
      const blob = await handle.promise;
      const filename = buildGifFilename({
        animationName: animation.name,
        formationId: animation.formation_id,
        mode,
      });
      downloadBlob(blob, filename);
      showToast("GIF 다운로드 완료", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "GIF 만들기 실패", "error");
    } finally {
      exportHandleRef.current = null;
      setExportingKey(null);
      setExportProgress(0);
    }
  }

  // GIF export abort handle — 페이지 이탈·언마운트 시 worker 정리
  const exportHandleRef = useRef<{ abort: () => void } | null>(null);
  useEffect(() => {
    return () => {
      exportHandleRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/team/tactical-animations")
      .then((r) => (r.ok ? r.json() : { animations: [] }))
      .then((j: { animations: TeamTacticalAnimation[] }) => {
        if (!cancelled) setAnimations(j.animations);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      // P3 평면화 — 카테고리·(세트피스면 시나리오)별 첫 컷 자동 배치.
      const tpl = formationTemplates.find((f) => f.id === createFormation);
      if (!tpl) {
        showToast("지원하지 않는 포메이션이에요", "error");
        setCreating(false);
        return;
      }
      const firstStep =
        createCategory === "SETPIECE" && tpl.slots.length === 11
          ? // 세트피스 표준 배치는 축구 11인제 기준. 풋살(5·6)은 기본 좌표 폴백 (자유 배치).
            buildSetpieceStep(createScenario, tpl.slots)
          : // ATTACK/DEFENSE 또는 풋살 세트피스 — 포메이션 기본 좌표 1컷 (빈 캡션·중앙 공)
            {
              caption: "",
              ball: { x: 50, y: 50 } as const,
              positions: tpl.slots.map((s) => ({ slot: s.id, x: s.x, y: s.y })),
            };
      // 같은 포메이션 기존 개수 + 1 = 다음 버전 (세트피스는 시나리오 라벨로 구분)
      const sameFormation = animations.filter((a) => a.formation_id === createFormation);
      const nextVersion = sameFormation.length + 1;
      const baseName = `${teamName} ${createFormation} v${nextVersion}`;
      const fullName = createCategory === "SETPIECE"
        ? `${baseName} - ${SETPIECE_SCENARIO_LABEL[createScenario]}`
        : baseName;
      // 자동 default 정책 — 매치 노출 정책과 동일 조건:
      //  · ATTACK/DEFENSE: 같은 (team, formation_id, category)에 default 0개면 자동
      //  · SETPIECE/OTHER: 같은 (team, category)에 default 0개면 자동 (포메이션 무관)
      const needsFormation = createCategory === "ATTACK" || createCategory === "DEFENSE";
      const existingDefaultsInGroup = animations.filter((a) => {
        if (!a.is_default) return false;
        const cat = a.animation_data.category ?? inferAnimationCategory(a.animation_data);
        if (cat !== createCategory) return false;
        if (needsFormation && a.formation_id !== createFormation) return false;
        return true;
      });
      const shouldBeDefault = existingDefaultsInGroup.length === 0;
      const res = await fetch("/api/team/tactical-animations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation_id: createFormation,
          name: fullName,
          description: null,
          animation_data: {
            steps: [firstStep],
            attack: [], // 레거시 호환 — 빈 배열
            defense: [],
            category: createCategory,
            ...(createCategory === "SETPIECE" ? { setpieceScenario: createScenario } : {}),
          },
          is_default: shouldBeDefault,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "생성 실패");
      }
      const j: { animation: TeamTacticalAnimation } = await res.json();
      router.push(`/settings/animations/${j.animation.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "생성 실패", "error");
      setCreating(false);
    }
  }

  /** 영상 복제 — 같은 포메이션이면 v{N+1}, 다른 포메이션이면 슬롯 인덱스 1:1 매핑 */
  async function handleCopy(source: TeamTacticalAnimation, targetFormationId: string) {
    setCopyingId(source.id);
    try {
      const sourceTemplate = formationTemplates.find((f) => f.id === source.formation_id);
      const targetTemplate = formationTemplates.find((f) => f.id === targetFormationId);
      if (!sourceTemplate || !targetTemplate) {
        showToast("포메이션 정보를 찾을 수 없어요", "error");
        return;
      }

      // 슬롯 인덱스 1:1 매핑 (sourceSlot → targetSlot)
      const slotMap = new Map<string, string>();
      const len = Math.min(sourceTemplate.slots.length, targetTemplate.slots.length);
      for (let i = 0; i < len; i++) {
        slotMap.set(sourceTemplate.slots[i].id, targetTemplate.slots[i].id);
      }

      function mapPositions(positions: PhasePosition[]): PhasePosition[] {
        return positions
          .map((p) => {
            const newSlot = slotMap.get(p.slot);
            return newSlot ? { ...p, slot: newSlot } : null;
          })
          .filter((p): p is PhasePosition => p !== null);
      }

      const newData: TacticalAnimationData = {
        attack: (source.animation_data.attack ?? []).map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => ({
            ...step,
            positions: mapPositions(step.positions),
          })),
        })),
        defense: (source.animation_data.defense ?? []).map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => ({
            ...step,
            positions: mapPositions(step.positions),
          })),
        })),
        // P3 평면 영상 복제 — steps도 같이 옮김
        ...(Array.isArray(source.animation_data.steps)
          ? {
              steps: source.animation_data.steps.map((step) => ({
                ...step,
                positions: mapPositions(step.positions),
              })),
              category: source.animation_data.category ?? "ATTACK",
            }
          : {}),
        ...(source.animation_data.defaultRate ? { defaultRate: source.animation_data.defaultRate } : {}),
      };

      const sameFormation = animations.filter((a) => a.formation_id === targetFormationId);
      const nextVersion = sameFormation.length + 1;
      const samePoseLabel = source.formation_id === targetFormationId ? "복사본" : `${source.formation_id} 기반`;

      const res = await fetch("/api/team/tactical-animations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation_id: targetFormationId,
          name: `${teamName} ${targetFormationId} v${nextVersion}`,
          description: `${source.name} ${samePoseLabel}`,
          animation_data: newData,
          is_default: sameFormation.length === 0,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "복제 실패");
      }
      const j: { animation: TeamTacticalAnimation } = await res.json();
      router.push(`/settings/animations/${j.animation.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "복제 실패", "error");
    } finally {
      setCopyingId(null);
    }
  }

  async function handleDelete(animation: TeamTacticalAnimation) {
    const ok = await confirm({
      title: "삭제하시겠어요?",
      description: `"${animation.name}" 영상을 삭제합니다. 되돌릴 수 없어요.`,
      confirmLabel: "삭제",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/team/tactical-animations/${animation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "삭제 실패");
      }
      setAnimations((prev) => prev.filter((a) => a.id !== animation.id));
      showToast("삭제되었습니다", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패", "error");
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* 뒤로가기 — 진입 경로(팀 설정·경기 전술·SidebarNav)에 따라 동적 복귀 */}
      <BackButton
        label="뒤로"
        fallbackHref="/settings?tab=team"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      />


      {/* 헤더 */}
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
          전술 영상
        </p>
        <h1 className="mt-1 text-2xl font-bold">감독의 전술노트</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          선수 위치를 직접 그려 우리 팀 흐름을 영상처럼 만들어요.
          <strong>대표 영상</strong>으로 지정하면 경기 화면에서 선수들이 자동으로 볼 수 있어요.
        </p>
      </header>

      {/* 신규 생성 — 종목 → 카테고리 → (공/수만) 포메이션 → (세트피스만) 시나리오 → 만들기.
          PC·모바일 공통 카드로 묶고 라벨 너비 일관(sm:w-[300px] lg:w-full)으로 정돈. */}
      <div className="mb-5 rounded-xl border border-border bg-card/40 p-4 sm:p-5">
        <div className="mb-3 text-sm font-bold text-foreground">새 영상 만들기</div>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
          {/* ① 종목 */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">종목</span>
              <span className="text-[11px] text-muted-foreground">
                우리 팀: {sportType === "FUTSAL" ? "풋살" : "축구"}
              </span>
            </div>
            <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/30 p-1 sm:w-[300px] lg:w-full">
              <button
                type="button"
                onClick={() => handleSportToggle("SOCCER")}
                aria-pressed={selectedSport === "SOCCER"}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  selectedSport === "SOCCER"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-card hover:text-foreground",
                )}
              >
                축구
              </button>
              <button
                type="button"
                onClick={() => handleSportToggle("FUTSAL")}
                aria-pressed={selectedSport === "FUTSAL"}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  selectedSport === "FUTSAL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-card hover:text-foreground",
                )}
              >
                풋살
              </button>
            </div>
          </div>

          {/* ② 카테고리 선택 — 만들 영상의 의도 */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-foreground">카테고리</div>
            <div className="grid w-full grid-cols-4 gap-1 rounded-lg border border-border bg-secondary/30 p-1 sm:w-[300px] lg:w-full" role="group" aria-label="영상 카테고리 선택">
              {ANIMATION_CATEGORIES.map((c) => {
                const active = createCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCreateCategory(c)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md py-2 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/70 hover:bg-card hover:text-foreground",
                    )}
                  >
                    {ANIMATION_CATEGORY_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ③ 포메이션 — 공격·수비만 노출 (세트피스·기타는 포메이션 무관) */}
          {categoryNeedsFormation(createCategory) && (
            <div>
              <div className="mb-1.5 text-xs font-semibold text-foreground">포메이션</div>
              <Select value={createFormation} onValueChange={setCreateFormation}>
                <SelectTrigger className="w-full sm:w-[300px] lg:w-full">
                  <SelectValue placeholder="포메이션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {formationTemplates.filter((f) => f.sportType === selectedSport).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ④ 세트피스 시나리오 (카테고리=SETPIECE일 때만) — 자동 1컷 배치 템플릿 */}
          {createCategory === "SETPIECE" && (
            <div>
              <div className="mb-1.5 text-xs font-semibold text-foreground">세트피스 시나리오</div>
              <Select value={createScenario} onValueChange={(v) => setCreateScenario(v as SetpieceScenario)}>
                <SelectTrigger className="w-full sm:w-[300px] lg:w-full">
                  <SelectValue placeholder="시나리오 선택" />
                </SelectTrigger>
                <SelectContent>
                  {SETPIECE_SCENARIOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SETPIECE_SCENARIO_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                💡 박스 안 4명·박스 밖 2명·키커 1명·반대편 윙백 1명·센터백 2명·GK 1명 표준 배치로 첫 컷이 자동 생성돼요. 만든 뒤 드래그로 미세 조정하세요.
              </p>
            </div>
          )}

          {/* ⑤ 만들기 — PC grid에선 양쪽 컬럼 다 차지(col-span-2). 통일된 '영상 만들기' 버튼 */}
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full sm:w-[300px] lg:col-span-2 lg:w-full"
          >
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            영상 만들기
          </Button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </div>
      ) : animations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            아직 만든 영상이 없어요.<br />
            위에서 종목·포메이션을 고르고 첫 영상을 만들어보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 운영진 알림 — 영상은 있는데 대표(⭐) 0개인 카테고리 (매치 자동 노출 안 됨) */}
          {categoriesMissingDefault.length > 0 && (
            <div className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3 text-[12px]">
              <p className="font-semibold text-foreground">
                ⚠️ 대표 영상 미설정 카테고리: {categoriesMissingDefault.map((c) => ANIMATION_CATEGORY_LABEL[c]).join("·")}
              </p>
              <p className="mt-1 text-muted-foreground">
                대표(⭐)로 핀하면 경기 화면 역할 가이드에 자동 노출됩니다. 각 카테고리 영상 카드의 <strong>대표</strong> 버튼을 눌러주세요.
              </p>
            </div>
          )}

          {/* 카테고리 칩 필터 — 영상이 많아져도 빠르게 좁히기 */}
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="카테고리 필터"
          >
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              aria-pressed={categoryFilter === null}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                categoryFilter === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              전체 <span className="ml-1 tabular-nums opacity-80">{animations.length}</span>
            </button>
            {ANIMATION_CATEGORIES.map((c) => {
              const count = categoryCounts[c];
              if (count === 0) return null;
              const active = categoryFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ANIMATION_CATEGORY_LABEL[c]} <span className="ml-1 tabular-nums opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
          {filteredAnimations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                이 카테고리에 해당하는 영상이 없어요.
              </p>
            </div>
          ) : null}
          {filteredAnimations.map((animation) => (
            <div
              key={animation.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <FormationMotionThumb data={animation.animation_data} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold truncate">{animation.name}</h2>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                      animation._category === "ATTACK" && "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]",
                      animation._category === "DEFENSE" && "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
                      animation._category === "SETPIECE" && "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
                      animation._category === "OTHER" && "bg-secondary text-muted-foreground",
                    )}>
                      {ANIMATION_CATEGORY_LABEL[animation._category]}
                    </span>
                    {animation.is_default && (
                      // 카테고리별 대표 배지 — "공격 대표"·"수비 대표"·"세트피스 대표"·"기타 대표" 명시.
                      // 매치 노출 동작과 1:1 — 사용자가 어느 카테고리의 대표인지 한눈에 인지.
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold",
                        animation._category === "ATTACK" && "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]",
                        animation._category === "DEFENSE" && "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
                        animation._category === "SETPIECE" && "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
                        animation._category === "OTHER" && "bg-secondary text-foreground",
                      )}>
                        <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                        {ANIMATION_CATEGORY_LABEL[animation._category]} 대표
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {animation.formation_id} ·{" "}
                    {new Date(animation.updated_at).toLocaleDateString("ko-KR", {
                      year: "2-digit",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    수정
                  </p>
                  {animation.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {animation.description}
                    </p>
                  )}
                </div>
              </div>

              {/* 액션 */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                  <Link href={`/settings/animations/${animation.id}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    편집
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={animation.is_default ? "default" : "outline"}
                  className="h-8 text-xs gap-1"
                  onClick={() => toggleDefault(animation)}
                  disabled={togglingDefault === animation.id}
                  aria-pressed={animation.is_default}
                  title={animation.is_default ? "대표 핀 해제 — 매치 자동 노출에서 제외" : "대표 핀 — 매치 자동 노출 + 목록 상단 고정"}
                >
                  <Star className={cn("h-3.5 w-3.5", animation.is_default && "fill-current")} aria-hidden="true" />
                  {animation.is_default ? "대표 ✓" : "대표로"}
                </Button>
                {/* 복제 — 대상 포메이션 선택해서 복사 */}
                <div className="inline-flex items-center gap-1 rounded-md border border-border h-8 pr-1">
                  <Copy className="h-3.5 w-3.5 ml-2 text-muted-foreground" aria-hidden="true" />
                  <Select
                    value=""
                    onValueChange={(targetFid) => {
                      if (!targetFid) return;
                      handleCopy(animation, targetFid);
                    }}
                  >
                    <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs">
                      <span className="text-muted-foreground">
                        {copyingId === animation.id ? "복제 중…" : "복제"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">대상 포메이션</div>
                      {formationTemplates
                        .filter((f) => f.sportType === (formationTemplates.find((t) => t.id === animation.formation_id)?.sportType))
                        .map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                            {f.id === animation.formation_id && " (같은 포메이션 v"}
                            {f.id === animation.formation_id && (animations.filter((a) => a.formation_id === f.id).length + 1)}
                            {f.id === animation.formation_id && ")"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(animation)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  삭제
                </Button>
              </div>

              {/* GIF 공유 — 평면 영상은 카테고리 1개라 단일 버튼. 레거시는 3분할. */}
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
                {(() => {
                  const isFlatRow = Array.isArray(animation.animation_data.steps) && animation.animation_data.steps.length > 0;
                  if (isFlatRow) {
                    const mode: "attack" | "defense" = (animation.animation_data.category ?? "ATTACK") === "DEFENSE" ? "defense" : "attack";
                    const key = `${animation.id}-${mode}`;
                    const isExportingThis = exportingKey === key;
                    return (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-8 gap-1 text-xs"
                        disabled={exportingKey !== null}
                        onClick={() => handleExportGif(animation, mode)}
                      >
                        {isExportingThis ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            {exportProgress}%
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            이 영상 GIF
                          </>
                        )}
                      </Button>
                    );
                  }
                  return (["attack", "defense", "combined"] as const).map((mode) => {
                    const key = `${animation.id}-${mode}`;
                    const isExportingThis = exportingKey === key;
                    const label = mode === "attack" ? "공격" : mode === "defense" ? "수비" : "공수전체";
                    const isCombined = mode === "combined";
                    return (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={isCombined ? "default" : "outline"}
                        className="h-8 gap-1 text-xs"
                        disabled={exportingKey !== null}
                        onClick={() => handleExportGif(animation, mode)}
                      >
                        {isExportingThis ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            {exportProgress}%
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            {label} GIF
                          </>
                        )}
                      </Button>
                    );
                  });
                })()}
                <span className="ml-1 self-center text-[11px] text-muted-foreground">
                  카톡 단톡방에 바로 공유
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
