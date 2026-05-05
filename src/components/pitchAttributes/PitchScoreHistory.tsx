"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type {
  AttributeCategory,
  EvaluationContext,
  EvaluationSource,
  SportType,
} from "@/lib/playerAttributes/types";

interface SessionView {
  evaluator: { id: string; name: string } | null;
  source: EvaluationSource;
  context: EvaluationContext;
  last_updated: string;
  scores_count: number;
  avg_score: number;
  category_avgs: Array<{ category: AttributeCategory; avg: number; count: number }>;
}

interface HistoryResponse {
  sessions: SessionView[];
  sport_type: SportType;
  viewer_is_staff: boolean;
}

interface Props {
  /** 이력 조회 대상 user_id */
  targetUserId: string;
  /** 팀 sport_type (PitchScoreCard 와 일치) */
  sportType: SportType;
}

const SOURCE_LABELS: Record<EvaluationSource, string> = {
  SELF: "본인",
  STAFF: "운영진",
  PEER: "동료",
};

const CONTEXT_LABELS: Record<EvaluationContext, string> = {
  FREE: "자유",
  ROUND: "정기",
  POST_MATCH: "경기 후",
};

function formatRelativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - target;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "방금 전";
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { year: "2-digit", month: "short", day: "numeric" });
}

/**
 * Phase 2C 평가 이력 뷰.
 *
 * 익명성 정책 B: 운영진 viewer 는 evaluator 실명, 일반 viewer 는 source 라벨로만 노출.
 * PitchScoreCard 안에서 toggle 로 lazy mount → 첫 펼침 시 fetch.
 */
export default function PitchScoreHistory({ targetUserId, sportType }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [viewerIsStaff, setViewerIsStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sport: sportType });
        const res = await fetch(
          `/api/players/${targetUserId}/evaluations/history?${params.toString()}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "이력 로딩 실패");
        }
        const json: HistoryResponse = await res.json();
        if (cancelled) return;
        setSessions(json.sessions);
        setViewerIsStaff(json.viewer_is_staff);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, sportType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        평가 이력 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        아직 평가 이력이 없어요
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!viewerIsStaff && (
        <p className="text-[11px] text-muted-foreground">
          평가자 정보는 비공개예요. 운영진만 누가 평가했는지 볼 수 있어요.
        </p>
      )}
      {sessions.map((s, idx) => {
        const evaluatorLabel = s.evaluator
          ? s.evaluator.name
          : SOURCE_LABELS[s.source];
        return (
          <div
            key={`${s.evaluator?.id ?? "anon"}-${idx}`}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                <span className="truncate text-sm font-bold">{evaluatorLabel}</span>
                {viewerIsStaff && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                    {SOURCE_LABELS[s.source]}
                  </span>
                )}
                <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {CONTEXT_LABELS[s.context]}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatRelativeTime(s.last_updated)}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-black text-[hsl(var(--primary))]">
                {s.avg_score.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                / 5 · {s.scores_count}개 능력치 평가
              </span>
            </div>

            {s.category_avgs.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {s.category_avgs.map((c) => (
                  <div key={c.category} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">
                      {CATEGORY_META[c.category]?.name_ko ?? c.category}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {c.avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
