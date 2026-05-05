"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, SkipForward, RefreshCw, CheckCircle2 } from "lucide-react";
import EvaluationModal from "./EvaluationModal";
import type { SportType } from "@/lib/playerAttributes/types";

interface Recommendation {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  preferred_positions: string[];
  sample_count: number;
  co_attendance: number;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  sport_type: SportType;
  pool_size: number;
  evaluator_attended_count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 현재 활성 팀 ID */
  teamId: string;
  /** 팀 sport_type — 하위 EvaluationModal 전달 */
  sportType: SportType;
}

const SUGGESTED_TARGET = 3;

/**
 * 동료 평가 다이얼로그 (Phase 2C, B3 출석 빈도 기반).
 *
 * - 같이 뛴 경기 많은 순 → 평가 적게 받은 사람 → 랜덤 동률 셔플
 * - 한 라운드 = 3명 권장 (강제 아님). 평가/스킵 후 즉시 새 사람 교체
 * - 사용자가 X 닫기 누를 때까지 무한 평가 가능
 *
 * 진입점은 외부에서 제어 (open prop). 대시보드 할 일 목록 등 어디서든 호출 가능.
 * createPortal 로 document.body 에 직접 렌더 — 부모 stacking context / backdrop-filter
 * 영향 받지 않고 viewport 기준 위치 보장.
 */
export default function PeerEvaluationDialog({ open, onClose, teamId, sportType }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [poolSize, setPoolSize] = useState<number>(0);
  const [attendedCount, setAttendedCount] = useState<number>(0);
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [evaluatedCount, setEvaluatedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [evaluatingTarget, setEvaluatingTarget] = useState<{
    user_id: string;
    name: string;
    isGoalkeeper: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // body scroll lock — 모달 뒤로 페이지 스크롤되는 사고 방지
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const fetchRecommendations = useCallback(
    async (excludeSet: Set<string>) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ team_id: teamId });
        if (excludeSet.size > 0) params.set("exclude", [...excludeSet].join(","));
        const res = await fetch(`/api/peer-evaluation/recommendations?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "추천 로딩 실패");
        }
        const json: RecommendationsResponse = await res.json();
        setRecommendations(json.recommendations);
        setPoolSize(json.pool_size);
        setAttendedCount(json.evaluator_attended_count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류");
      } finally {
        setLoading(false);
      }
    },
    [teamId],
  );

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setExcludeIds(new Set());
      setEvaluatedCount(0);
      setSkippedCount(0);
      fetchRecommendations(new Set());
    }
  }, [open, fetchRecommendations]);

  const handleSkip = (userId: string) => {
    const next = new Set(excludeIds);
    next.add(userId);
    setExcludeIds(next);
    setSkippedCount((c) => c + 1);
    fetchRecommendations(next);
  };

  const handleEvaluate = (rec: Recommendation) => {
    const isGoalkeeper = rec.preferred_positions[0]?.toUpperCase() === "GK";
    setEvaluatingTarget({
      user_id: rec.user_id,
      name: rec.name,
      isGoalkeeper,
    });
  };

  const handleEvaluationSaved = () => {
    if (!evaluatingTarget) return;
    const next = new Set(excludeIds);
    next.add(evaluatingTarget.user_id);
    setExcludeIds(next);
    setEvaluatedCount((c) => c + 1);
    setEvaluatingTarget(null);
    fetchRecommendations(next);
  };

  const handleNewRound = () => {
    setExcludeIds(new Set());
    setEvaluatedCount(0);
    setSkippedCount(0);
    fetchRecommendations(new Set());
  };

  const reachedTarget = evaluatedCount >= SUGGESTED_TARGET;

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-border p-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold">팀원 평가하기</h2>
              <p className="text-[11px] text-muted-foreground">
                {attendedCount > 0
                  ? "같이 뛰어본 팀원 우선 추천 · 모르는 분은 스킵"
                  : "평가 적게 받은 분 우선 추천 · 모르는 분은 스킵"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 hover:bg-white/10"
              aria-label="닫기"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {/* 안내 박스 — 강요 아님, 그만두기 자유 */}
            <div
              className={`mb-3 rounded-lg border p-3 text-[11px] leading-relaxed ${
                reachedTarget
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-border bg-background/40 text-muted-foreground"
              }`}
            >
              {reachedTarget ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>
                    <b className="font-bold text-emerald-200">{evaluatedCount}명 평가 완료!</b>{" "}
                    충분히 하셨어요. 더 평가하고 싶은 분 있다면 계속 진행, 그만하시려면 우측 위 닫기를 눌러주세요.
                  </span>
                </div>
              ) : (
                <span>
                  💡 <b className="font-bold text-foreground">3명만 평가하셔도 충분합니다.</b>{" "}
                  더 평가하고 싶은 분이 있다면 계속 진행하셔도 좋아요. 강요 아니에요.
                </span>
              )}
            </div>

            {error && (
              <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {loading && recommendations.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                추천 가져오는 중…
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {evaluatedCount + skippedCount > 0
                    ? "이 라운드에 추천할 팀원이 더 없어요"
                    : "평가할 수 있는 팀원이 없어요"}
                </p>
                {poolSize > 0 && (
                  <button
                    type="button"
                    onClick={handleNewRound}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    처음부터 다시 받기
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recommendations.map((rec) => {
                  const positionLabel = rec.preferred_positions.slice(0, 2).join(" · ");
                  return (
                    <div
                      key={rec.user_id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                        {rec.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rec.profile_image_url}
                            alt={rec.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                            {rec.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-bold">{rec.name}</span>
                          {rec.sample_count === 0 && (
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                              평가 0건
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                          {positionLabel && <span>{positionLabel}</span>}
                          {rec.co_attendance > 0 && (
                            <>
                              {positionLabel && <span aria-hidden="true">·</span>}
                              <span className="text-[hsl(var(--primary))]/80">
                                같이 {rec.co_attendance}경기
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSkip(rec.user_id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          disabled={loading}
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          스킵
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEvaluate(rec)}
                          className="rounded-md bg-[hsl(var(--primary))] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          disabled={loading}
                        >
                          평가
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
            <span>
              평가 <b className="font-bold text-foreground">{evaluatedCount}</b>건 · 스킵{" "}
              <b className="font-bold text-foreground">{skippedCount}</b>명 · 풀 {poolSize}명
            </span>
            <button
              type="button"
              onClick={handleNewRound}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/5"
              disabled={loading}
            >
              <RefreshCw className="h-3 w-3" />
              새로 받기
            </button>
          </footer>
        </div>
      </div>

      {evaluatingTarget && (
        <EvaluationModal
          open={Boolean(evaluatingTarget)}
          onClose={() => setEvaluatingTarget(null)}
          targetUserId={evaluatingTarget.user_id}
          targetUserName={evaluatingTarget.name}
          isGoalkeeper={evaluatingTarget.isGoalkeeper}
          sportType={sportType}
          contextTeamId={teamId}
          onSaved={handleEvaluationSaved}
        />
      )}
    </>,
    document.body,
  );
}
