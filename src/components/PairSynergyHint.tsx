"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizePairsForLineup, type PairMatrix } from "@/lib/server/getPairSynergy";

type Props = {
  /** 현재 라인업의 team_members.id 배열 (쿼터 dedupe된 합집합) */
  memberIds: string[];
  /** STAFF+ 만 노출 — 일반 회원에게 절대 보이지 말 것 */
  isStaff: boolean;
};

/**
 * 전술 탭 — 현재 라인업의 페어 시너지 힌트 카드.
 * STAFF+ 전용. 의사결정 보조용이며, 단정적 표현 금지 ("참고" 톤).
 */
export function PairSynergyHint({ memberIds, isStaff }: Props) {
  const [matrix, setMatrix] = useState<PairMatrix | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    if (memberIds.length < 2) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/pair-synergy")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMatrix(data as PairMatrix);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isStaff, memberIds.length]);

  if (!isStaff) return null;
  if (memberIds.length < 2) return null;
  if (loading) return null;
  if (!matrix || matrix.totalMatches === 0) return null;

  const summary = summarizePairsForLineup(matrix, memberIds, 2);
  if (summary.sampledPairs === 0) return null;

  const avgPercent =
    summary.avgWinRate !== null ? Math.round(summary.avgWinRate * 100) : null;
  const accent =
    avgPercent === null
      ? "muted"
      : avgPercent >= 60
      ? "success"
      : avgPercent <= 40
      ? "loss"
      : "warning";

  return (
    <Link
      href="/members/pairs"
      className={cn(
        "block rounded-xl border p-3 transition-colors",
        accent === "success" && "border-[hsl(var(--success))]/30 bg-[hsl(var(--success)_/_0.05)] hover:bg-[hsl(var(--success)_/_0.1)]",
        accent === "loss" && "border-[hsl(var(--loss))]/30 bg-[hsl(var(--loss)_/_0.05)] hover:bg-[hsl(var(--loss)_/_0.1)]",
        accent === "warning" && "border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning)_/_0.05)] hover:bg-[hsl(var(--warning)_/_0.1)]",
        accent === "muted" && "border-border bg-[hsl(var(--secondary)_/_0.3)] hover:bg-[hsl(var(--secondary)_/_0.5)]",
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground">
          현재 라인업 페어 점수
          <span className="ml-1 text-[10px] font-normal">(운영진 전용)</span>
        </p>
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        {avgPercent !== null && (
          <p
            className={cn(
              "text-2xl font-bold",
              accent === "success" && "text-[hsl(var(--success))]",
              accent === "loss" && "text-[hsl(var(--loss))]",
              accent === "warning" && "text-[hsl(var(--warning))]",
              accent === "muted" && "text-foreground",
            )}
          >
            {avgPercent}%
            <span className="ml-1 text-xs font-normal text-muted-foreground">평균 승률</span>
          </p>
        )}
        <p className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {summary.goodPairs > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[hsl(var(--success))]">
              <TrendingUp className="h-3 w-3" /> {summary.goodPairs}
            </span>
          )}
          {summary.weakPairs > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[hsl(var(--loss))]">
              <TrendingDown className="h-3 w-3" /> {summary.weakPairs}
            </span>
          )}
          <span>· {summary.sampledPairs}쌍 분석</span>
        </p>
      </div>
    </Link>
  );
}
