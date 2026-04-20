"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiBadge } from "@/components/AiBadge";
import { cn } from "@/lib/utils";

export type AiCoachAnalysisCardProps = {
  /** 전술판이 모두 채워졌는지 — false면 버튼 비활성 */
  allSlotsFilled: boolean;
  /** 첫 쿼터 placement — 분석 요청 payload 용 */
  placement: Array<{ slot: string; playerName: string }>;
  /** 쿼터별 전체 배치 */
  quarterPlacements?: Array<{
    quarter: number;
    assignments: Array<{ slot: string; playerName: string }>;
  }>;
  /** 쿼터별 포메이션 이름 — AI 가 가짜 포메이션 창작 방지 */
  quarterFormations?: Array<{ quarter: number; formation: string }>;
  /** 편성 생성 방식 — AI 코치 어투 분기 */
  generationMode?: "rule" | "ai-fixed" | "ai-free" | "manual";
  /** 참석자 */
  attendees: Array<{ name: string; preferredPosition?: string | null; isGuest?: boolean }>;
  /** 포메이션 이름 (예 "4-2-3-1") */
  formationName: string;
  quarterCount: number;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  opponent?: string | null;
  /** 경기 id (관측성 로깅용) */
  matchId?: string | null;
  /** 김선휘 Feature Flag — false면 렌더 안 함 */
  enableAi: boolean;
};

/**
 * AI 코치 분석 카드 — AutoFormationBuilder에서 추출.
 * 전술판 시각화 뒤에 배치해 "시각화 → 해설" 자연스러운 순서 제공.
 * 내부 상태:
 *   - analysis: 스트리밍으로 누적되는 텍스트
 *   - source: "ai" | "rule" 최종 출처
 *   - loading: 진행 중 여부
 *   - error: 에러 메시지
 */
export function AiCoachAnalysisCard({
  allSlotsFilled,
  placement,
  quarterPlacements,
  quarterFormations,
  generationMode,
  attendees,
  formationName,
  quarterCount,
  matchType,
  opponent,
  matchId,
  enableAi,
}: AiCoachAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "rule" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [monthlyCap, setMonthlyCap] = useState<number | null>(null);
  const [matchUsed, setMatchUsed] = useState(false);

  // 월 사용량 및 이 경기 사용 여부 조회 (mount + 생성 완료 후 재조회)
  const refetchUsage = useCallback(() => {
    if (!enableAi || !matchId) return;
    fetch(`/api/ai/usage?feature=tactics&matchId=${matchId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMonthlyCount(d.monthlyCount ?? null);
        setMonthlyCap(d.monthlyCap ?? null);
        setMatchUsed(d.matchUsed ?? false);
      })
      .catch(() => {});
  }, [enableAi, matchId]);

  useEffect(() => {
    refetchUsage();
  }, [refetchUsage]);

  // 저장된 분석 fetch (mount 자동 로드 + "다시 보기" 버튼 공용)
  const fetchSavedAnalysis = useCallback(() => {
    if (!matchId) return;
    setLoading(true);
    fetch(`/api/ai/tactics?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.analysis) {
          setAnalysis(d.analysis);
          setSource(d.model === "rule" ? "rule" : "ai");
        }
      })
      .catch(() => { /* 조용히 무시 — 신규 분석 경로는 정상 동작 */ })
      .finally(() => setLoading(false));
  }, [matchId]);

  // 저장된 분석이 있으면 mount 시 자동 로드 (새로고침·재진입 후에도 유지)
  useEffect(() => {
    fetchSavedAnalysis();
  }, [fetchSavedAnalysis]);

  async function handleAnalyze() {
    if (!allSlotsFilled || loading) return;
    setLoading(true);
    setError(null);
    setAnalysis("");
    setSource(null);
    try {
      // 선수별 쿼터 부하 계산 (quarterPlacements에서 선수 등장 횟수 집계)
      const workloadMap = new Map<string, number>();
      for (const qp of quarterPlacements ?? []) {
        for (const a of qp.assignments) {
          workloadMap.set(a.playerName, (workloadMap.get(a.playerName) ?? 0) + 1);
        }
      }
      const playerWorkload = [...workloadMap.entries()]
        .map(([playerName, quarters]) => ({ playerName, quarters }))
        .sort((a, b) => b.quarters - a.quarters);

      const payload = {
        formationName,
        quarterCount,
        attendees: attendees.map((a) => ({
          name: a.name,
          preferredPosition: a.preferredPosition ?? null,
          isGuest: a.isGuest ?? false,
        })),
        placement,
        ...(quarterPlacements && quarterPlacements.length > 0 ? { quarterPlacements } : {}),
        ...(quarterFormations && quarterFormations.length > 0 ? { quarterFormations } : {}),
        ...(generationMode ? { generationMode } : {}),
        ...(playerWorkload.length > 0 ? { playerWorkload } : {}),
        matchType,
        opponent: opponent ?? null,
        warnings: [],
        matchId: matchId ?? null,
      };
      const { consumeSseStream } = await import("@/lib/sseStream");
      await consumeSseStream("/api/ai/tactics", payload, {
        onChunk: (text) => setAnalysis((prev) => (prev ?? "") + text),
        onReplace: (text) => setAnalysis(text),
        onDone: (src) => setSource(src),
        onError: (msg) => setError(msg),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
      setAnalysis(null);
    } finally {
      setLoading(false);
      refetchUsage();
    }
  }

  if (!enableAi) return null;

  const isMonthlyExhausted = monthlyCap != null && monthlyCount != null && monthlyCount >= monthlyCap;

  return (
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <CardContent className="p-4">
        {/* 월 사용량 배지 */}
        {monthlyCap != null && monthlyCount != null && (
          <div className="mb-3 flex items-center justify-between">
            <AiBadge variant="ai" label="AI 코치 분석" size="sm" />
            <span className={cn(
              "text-xs font-medium",
              isMonthlyExhausted ? "text-destructive" : "text-muted-foreground"
            )}>
              이번 달 {monthlyCount} / {monthlyCap}회
            </span>
          </div>
        )}
        {analysis === null && !loading ? (
          matchUsed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <AiBadge variant="ai" label="이 경기 AI 분석 완료" size="sm" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary"
                onClick={() => { fetchSavedAnalysis(); }}
              >
                다시 보기
              </Button>
            </div>
          ) : isMonthlyExhausted ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-xs text-destructive text-center">
                이번 달 팀 한도({monthlyCap}회)를 모두 사용했습니다.
              </p>
              <p className="text-xs text-muted-foreground text-center">다음 달 1일에 초기화됩니다.</p>
            </div>
          ) : allSlotsFilled ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/5"
              onClick={handleAnalyze}
            >
              <Sparkles className="h-4 w-4" />
              AI 코치 분석 보기
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-xl border-border/30 text-muted-foreground cursor-not-allowed opacity-50"
                disabled
              >
                <Sparkles className="h-4 w-4" />
                AI 코치 분석 보기
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                전술판을 모두 채우면 AI 분석이 활성화됩니다
              </p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <AiBadge
                variant={source === "ai" ? "ai" : source === "rule" ? "rule" : "loading"}
                label={source === "ai" ? "코치 분석" : source === "rule" ? "기본 분석" : "분석 중..."}
              />
              {!loading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => { setAnalysis(null); setSource(null); handleAnalyze(); }}
                >
                  <Sparkles className="h-3 w-3" />
                  다시
                </Button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {analysis || ""}
              {loading && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary/60 align-middle" />}
            </p>
            {source === "rule" && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                AI 분석이 실패해 자동 생성본을 보여드립니다. &quot;다시&quot; 버튼으로 재시도.
              </p>
            )}
          </div>
        )}
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
        {loading && !analysis && (
          <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            팀 히스토리·상대 이력 불러오는 중...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
