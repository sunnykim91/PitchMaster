"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiBadge } from "@/components/AiBadge";
import { cn } from "@/lib/utils";

/**
 * AI 코치 분석 텍스트 단락 정규화.
 * 모델이 쿼터 단락 사이에 줄바꿈을 빠뜨리는 경우에 대비해 쿼터 라벨 앞에 빈 줄 삽입.
 *
 * 🔴 주의 — "단락 시작"으로 쓰이는 쿼터 라벨만 분리 대상.
 * 본문 내 "초반 3쿼터 평균 득점"·"1쿼터 1.4골"·"3쿼터 부하" 같은 서술형 언급은 건드리지 않음.
 *
 * 조건: 쿼터 라벨 바로 뒤에 조사(는/가/도)·마침표·구두점·"부터"·"에는"·"으로" 등이 오는 경우만 단락 시작으로 간주.
 */
function normalizeCoachingParagraphs(text: string): string {
  // 쿼터 라벨이 "단락 시작" 신호를 가진 경우만 분리
  // lookahead: . / 한글 조사 / 특정 조사 어절
  const out = text.replace(
    /\s*\n*\s*([1-9]쿼터(?=[.,!?]|는|가|도|부터|에는|에서|으로))/g,
    "\n\n$1",
  );
  return out.replace(/^\n+/, "").trim();
}

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
  /**
   * AI 풀 플랜 응답에서 받은 coaching 을 상위에서 직접 주입 — 이벤트/네트워크 경로 우회.
   * `version` 은 같은 내용 재생성 시에도 재반영되도록 단조증가 카운터.
   */
  overrideAnalysis?: { analysis: string; source: "ai" | "rule"; version: number } | null;
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
  overrideAnalysis,
}: AiCoachAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "rule" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [monthlyCap, setMonthlyCap] = useState<number | null>(null);
  const [matchUsed, setMatchUsed] = useState(false);
  const [matchUsedCount, setMatchUsedCount] = useState(0);
  const [matchCap, setMatchCap] = useState<number | null>(null);

  // 월 사용량 및 이 경기 사용 여부 조회 (mount + 생성 완료 후 재조회)
  const refetchUsage = useCallback(() => {
    if (!enableAi || !matchId) return;
    fetch(`/api/ai/usage?feature=tactics-coach&matchId=${matchId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMonthlyCount(d.monthlyCount ?? null);
        setMonthlyCap(d.monthlyCap ?? null);
        setMatchUsed(d.matchUsed ?? false);
        setMatchUsedCount(d.matchUsedCount ?? 0);
        setMatchCap(d.matchCap ?? null);
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

  // AI 풀 플랜 응답을 상위에서 prop 으로 직접 주입 — version 바뀔 때마다 반영
  const overrideVersion = overrideAnalysis?.version ?? 0;
  useEffect(() => {
    if (!overrideAnalysis || !overrideAnalysis.analysis) return;
    setAnalysis(overrideAnalysis.analysis);
    setSource(overrideAnalysis.source);
    setError(null);
    setLoading(false);
    refetchUsage();
  }, [overrideVersion, overrideAnalysis, refetchUsage]);

  // ⚠️ match-squads-saved 이벤트 리스너는 의도적으로 제거됨.
  // AI 풀 플랜 직후 saveToTacticsBoard 가 이 이벤트를 발행 → fetchSavedAnalysis 가
  // DB 읽어 override 방금 적용된 새 coaching 을 **옛 값으로 덮어쓰는 경합**이 있었음.
  // 수동 편성은 coaching 을 생성하지 않으므로 재조회 자체 불필요.
  // AI 풀 플랜 경로는 overrideAnalysis prop 으로 동기 반영됨.

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
              <AiBadge
                variant="ai"
                label={matchCap != null ? `이 경기 ${matchUsedCount}/${matchCap}회 사용` : "이 경기 AI 분석 완료"}
                size="sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  onClick={() => { fetchSavedAnalysis(); }}
                >
                  다시 보기
                </Button>
                {matchCap != null && matchUsedCount < matchCap && !isMonthlyExhausted && allSlotsFilled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs border-primary/40 text-primary"
                    onClick={handleAnalyze}
                  >
                    <Sparkles className="h-3 w-3" />
                    새로 생성
                  </Button>
                )}
              </div>
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
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {analysis ? normalizeCoachingParagraphs(analysis) : ""}
              {loading && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary/60 align-middle" />}
            </p>
            {source === "rule" && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                AI 분석이 실패해 자동 생성본을 보여드립니다. 이 경기는 재생성할 수 없습니다.
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
