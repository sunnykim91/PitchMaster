"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AiCoachAnalysisCardProps = {
  /** 생성 편성 — results가 있을 때만 분석 가능 */
  hasResults: boolean;
  /** 첫 쿼터 placement — 분석 요청 payload 용 */
  placement: Array<{ slot: string; playerName: string }>;
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
  hasResults,
  placement,
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

  async function handleAnalyze() {
    if (!hasResults || loading) return;
    setLoading(true);
    setError(null);
    setAnalysis("");
    setSource(null);
    try {
      const payload = {
        formationName,
        quarterCount,
        attendees: attendees.map((a) => ({
          name: a.name,
          preferredPosition: a.preferredPosition ?? null,
          isGuest: a.isGuest ?? false,
        })),
        placement,
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
    }
  }

  if (!enableAi) return null;
  if (!hasResults) return null;

  return (
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <CardContent className="p-4">
        {analysis === null && !loading ? (
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-[10px] font-black text-primary">
                  {source === "ai" ? "AI" : source === "rule" ? "⚙" : "✨"}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {source === "ai" ? "코치 분석" : source === "rule" ? "기본 분석" : "분석 중..."}
                </span>
              </div>
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
