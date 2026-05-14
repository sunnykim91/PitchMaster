"use client";

import { useEffect, useState } from "react";
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
import type { TeamTacticalAnimation, TacticalAnimationData } from "@/lib/formationMotions/dbTypes";
import type { PhasePosition } from "@/lib/formationMotions/types";
import type { SportType } from "@/lib/types";

interface Props {
  teamId: string;
  teamName: string;
  sportType: SportType;
  defaultPlayerCount: number;
}

/**
 * 팀의 sport_type + default_player_count에 맞는 포메이션 기본값 선택.
 * 1순위: fieldCount === defaultPlayerCount 매치
 * 2순위: 같은 sportType의 첫 항목
 * 3순위: 축구 4-2-3-1 (안전 폴백)
 */
function pickDefaultFormation(sportType: SportType, defaultPlayerCount: number): string {
  const sameSport = formationTemplates.filter((f) => f.sportType === sportType);
  const sameCount = sameSport.find((f) => (f.fieldCount ?? 11) === defaultPlayerCount);
  if (sameCount) return sameCount.id;
  if (sameSport.length > 0) return sameSport[0].id;
  return "4-2-3-1";
}

export default function AnimationsListClient({ teamId: _teamId, teamName, sportType, defaultPlayerCount }: Props) {
  void _teamId;
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [animations, setAnimations] = useState<TeamTacticalAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportType>(sportType);
  const [createFormation, setCreateFormation] = useState(() => pickDefaultFormation(sportType, defaultPlayerCount));

  function handleSportToggle(next: SportType) {
    if (next === selectedSport) return;
    setSelectedSport(next);
    const fallbackCount = next === sportType ? defaultPlayerCount : (next === "FUTSAL" ? 6 : 11);
    setCreateFormation(pickDefaultFormation(next, fallbackCount));
  }

  const currentFormationName = formationTemplates.find((f) => f.id === createFormation)?.name ?? createFormation;
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyTargetFormation, setCopyTargetFormation] = useState<string>("");
  /**
   * GIF export 진행 상태.
   * key = `${animationId}-${mode}` — 같은 영상 다른 모드를 동시에 누르지 못하게.
   */
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  async function handleExportGif(
    animation: TeamTacticalAnimation,
    mode: "attack" | "defense" | "combined",
  ) {
    const key = `${animation.id}-${mode}`;
    if (exportingKey) return;

    // 섹션 빌드 — combined면 attack + defense 모두
    const sections =
      mode === "attack"
        ? [{ phases: animation.animation_data.attack, mode: "attack" as const }]
        : mode === "defense"
        ? [{ phases: animation.animation_data.defense, mode: "defense" as const }]
        : [
            { phases: animation.animation_data.attack, mode: "attack" as const },
            { phases: animation.animation_data.defense, mode: "defense" as const },
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
      const blob = await exportMotionAsGif(nonEmpty, {
        onProgress: (pct) => setExportProgress(pct),
      });
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
      setExportingKey(null);
      setExportProgress(0);
    }
  }

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
      // 표준 motion (4-2-3-1 풀 시퀀스 또는 builder 자동 생성) 가져옴
      const motion = getFormationMotion(createFormation);
      if (!motion) {
        showToast("지원하지 않는 포메이션이에요", "error");
        setCreating(false);
        return;
      }
      // 같은 포메이션 기존 개수 + 1 = 다음 버전
      const sameFormation = animations.filter((a) => a.formation_id === createFormation);
      const nextVersion = sameFormation.length + 1;
      const res = await fetch("/api/team/tactical-animations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation_id: createFormation,
          name: `${teamName} ${createFormation} v${nextVersion}`,
          description: null,
          animation_data: {
            attack: motion.attack,
            defense: motion.defense,
          },
          is_default: sameFormation.length === 0,
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
        attack: source.animation_data.attack.map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => ({
            ...step,
            positions: mapPositions(step.positions),
          })),
        })),
        defense: source.animation_data.defense.map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => ({
            ...step,
            positions: mapPositions(step.positions),
          })),
        })),
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

  async function handleSetDefault(animation: TeamTacticalAnimation) {
    if (animation.is_default) return;
    try {
      const res = await fetch(`/api/team/tactical-animations/${animation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "기본 설정 실패");
      }
      // 같은 formation_id 의 다른 default 들 OFF + 이 row default ON
      setAnimations((prev) =>
        prev.map((a) =>
          a.formation_id === animation.formation_id
            ? { ...a, is_default: a.id === animation.id }
            : a,
        ),
      );
      showToast("대표 영상으로 설정했어요", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "설정 실패", "error");
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
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
        <h1 className="mt-1 text-2xl font-bold">감독의 전술노트 — 우리 팀 공격·수비 영상</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          선수 위치를 직접 그려 우리 팀 빌드업·수비 흐름을 영상처럼 만들어요 (축구 11명·풋살 5~8명, 포메이션별로 자동 적용).
          <strong>대표 영상</strong>으로 지정하면 경기 화면에서 선수들이 자동으로 볼 수 있어요.
        </p>
      </header>

      {/* 신규 생성 — ① 종목 → ② 포메이션 → ③ 만들기 */}
      <div className="mb-5 space-y-3">
        {/* ① 종목 */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">종목</span>
            <span className="text-[11px] text-muted-foreground">
              우리 팀: {sportType === "FUTSAL" ? "풋살" : "축구"}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/30 p-1 sm:w-[260px]">
            <button
              type="button"
              onClick={() => handleSportToggle("SOCCER")}
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

        {/* ② 포메이션 */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-foreground">포메이션</div>
          <Select value={createFormation} onValueChange={setCreateFormation}>
            <SelectTrigger className="w-full sm:w-[260px]">
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
        {/* ③ 만들기 */}
        <Button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="w-full sm:w-[260px]"
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {currentFormationName} 영상 만들기
        </Button>
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
          {animations.map((animation) => (
            <div
              key={animation.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <FormationMotionThumb data={animation.animation_data} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold truncate">{animation.name}</h2>
                    {animation.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))]/15 px-2 py-0.5 text-[12px] font-bold text-[hsl(var(--primary))]">
                        <Star className="h-2.5 w-2.5" aria-hidden="true" />
                        대표 영상
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
                {!animation.is_default && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleSetDefault(animation)}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    대표로
                  </Button>
                )}
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

              {/* GIF 공유 — 카톡 단톡방에 던질 수 있게 (운영진 만든 영상을 다른 회원도 받을 수 있도록) */}
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
                {(["attack", "defense", "combined"] as const).map((mode) => {
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
                })}
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
