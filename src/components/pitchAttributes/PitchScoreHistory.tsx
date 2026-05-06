"use client";

import { Sparkles } from "lucide-react";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type {
  AttributeCategory,
  EvaluationContext,
  EvaluationSource,
} from "@/lib/playerAttributes/types";

export interface SessionView {
  evaluator: { id: string; name: string } | null;
  source: EvaluationSource;
  context: EvaluationContext;
  last_updated: string;
  scores_count: number;
  avg_score: number;
  category_avgs: Array<{ category: AttributeCategory; avg: number; count: number }>;
}

interface Props {
  sessions: SessionView[];
  viewerIsStaff: boolean;
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
 * 평가자별 세션 카드 리스트 — dumb 컴포넌트.
 * 데이터 fetch는 부모(EvaluationHistoryView)에서 처리.
 *
 * 익명성 정책 B: 운영진은 evaluator 실명, 일반 viewer는 source 라벨로만.
 */
export default function PitchScoreHistory({ sessions, viewerIsStaff }: Props) {
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
