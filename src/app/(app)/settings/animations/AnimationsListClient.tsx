"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Star, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import { FORMATION_4231_MOTION } from "@/lib/formationMotions/4-2-3-1";
import type { TeamTacticalAnimation } from "@/lib/formationMotions/dbTypes";

interface Props {
  teamId: string;
  teamName: string;
}

export default function AnimationsListClient({ teamId: _teamId, teamName }: Props) {
  void _teamId;
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [animations, setAnimations] = useState<TeamTacticalAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
      // 같은 포메이션 기존 개수 + 1 = 다음 버전 (v1, v2, v3 ...)
      const sameFormation = animations.filter((a) => a.formation_id === "4-2-3-1");
      const nextVersion = sameFormation.length + 1;
      const res = await fetch("/api/team/tactical-animations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation_id: "4-2-3-1",
          name: `${teamName} 4-2-3-1 v${nextVersion}`,
          description: null,
          animation_data: {
            attack: FORMATION_4231_MOTION.attack,
            defense: FORMATION_4231_MOTION.defense,
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
      {/* 뒤로가기 */}
      <Link
        href="/settings?tab=team"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        팀 설정으로 돌아가기
      </Link>

      {/* 헤더 */}
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
          전술 영상
        </p>
        <h1 className="mt-1 text-2xl font-bold">감독의 전술노트 — 우리 팀 공격·수비 영상</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          11명 위치를 직접 그려 우리 팀 빌드업·수비 흐름을 영상처럼 만들어요. <strong>대표 영상</strong>으로
          지정하면 경기 화면에서 선수들이 자동으로 볼 수 있어요.
        </p>
      </header>

      {/* 신규 생성 버튼 */}
      <Button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="mb-5 w-full sm:w-auto"
      >
        {creating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        새 영상 만들기 (4-2-3-1 기본 형태에서 시작)
      </Button>

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
            위 버튼으로 4-2-3-1 기본 형태에서 시작하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {animations.map((animation) => (
            <div
              key={animation.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold truncate">{animation.name}</h2>
                    {animation.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))]/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))]">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
