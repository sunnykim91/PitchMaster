"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, History, ArrowRight } from "lucide-react";
import PitchScoreRadar from "./PitchScoreRadar";
import PitchScoreBarList from "./PitchScoreBarList";
import EvaluationModal from "./EvaluationModal";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type {
  AttributeCode,
  AttributeCategory,
  SportType,
} from "@/lib/playerAttributes/types";

interface AttributeRow {
  attribute_code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  display_order: number;
  gk_only: boolean;
  pitch_score: number;
  sample_count: number;
  level: 1 | 2 | 3 | 4 | 5 | null;
}

interface CategoryAvg {
  category: AttributeCategory;
  avg: number;
  count: number;
}

interface CommentResult {
  comment: string;
  archetype: string | null;
  strengths: AttributeCategory[];
  weaknesses: AttributeCategory[];
}

interface PositionRec {
  position: string;
  name_ko: string;
  score: number;
  matched_count: number;
  top_attributes: { code: AttributeCode; name_ko: string; score: number }[];
}

export interface AttributesResponse {
  user_id: string;
  sport_type: SportType;
  is_goalkeeper: boolean;
  attributes: AttributeRow[];
  category_averages: CategoryAvg[];
  overall_pitch_score: number;
  total_samples: number;
  comment: CommentResult | null;
  recommended_positions: PositionRec[];
  algorithm: string;
  product: string;
}

interface LabelRow {
  attribute_code: AttributeCode;
  level: 1 | 2 | 3 | 4 | 5;
  label_ko: string;
}

interface Props {
  targetUserId: string;
  targetUserName: string;
  /** 현재 보고 있는 팀의 sport_type. 종목별 분리 평가 (00059) 후 필수. */
  sportType: SportType;
  /** 평가 저장 시 명시적으로 사용할 팀 ID. evaluator의 활성 ctx.teamId와 다를 수 있음 */
  contextTeamId: string;
  isGoalkeeper?: boolean;
  canEvaluate?: boolean;
  /**
   * 평가 이력 토글 노출 권한 — 일반회원이 타인 페이지 보는 케이스 차단용.
   * 부모에서 (viewer === target || isStaffOrAbove(viewerRole)) 로 계산해 내려줌.
   * 미지정 시 false (기본 닫힘) — 보수적으로 안 보이는 쪽이 안전.
   */
  canViewHistory?: boolean;
  /**
   * 부모가 미리 fetch 한 attributes 데이터. 있으면 첫 mount 시 자체 fetch skip.
   * 평가 후 자동 reload 는 그대로 작동(EvaluationModal onSaved → load).
   */
  initialData?: AttributesResponse | null;
  /** 평가 후 reload 된 attributes 를 부모에 propagate (RecordsClient → MyOverviewCard 동기화) */
  onDataChange?: (data: AttributesResponse) => void;
}

const COMMENT_MIN_SAMPLES = 5;

export default function PitchScoreCard({
  targetUserId,
  targetUserName,
  sportType,
  contextTeamId,
  isGoalkeeper,
  canEvaluate = true,
  canViewHistory = false,
  initialData = null,
  onDataChange,
}: Props) {
  const [data, setData] = useState<AttributesResponse | null>(initialData);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  // initialData 가 있어도 labels 는 별도 fetch 가 필요해 첫 mount 에서 한번 호출.
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [attrRes, labelRes] = await Promise.all([
        fetch(`/api/players/${targetUserId}/attributes?sport=${sportType}`),
        fetch(`/api/player-attributes/labels`),
      ]);
      if (attrRes.ok) {
        const j: AttributesResponse = await attrRes.json();
        setData(j);
        onDataChange?.(j);
      }
      if (labelRes.ok) {
        const j: { labels: LabelRow[] } = await labelRes.json();
        const m = new Map<string, string>();
        for (const l of j.labels) m.set(`${l.attribute_code}_${l.level}`, l.label_ko);
        setLabels(m);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, sportType, onDataChange]);

  // initialData 있으면 attributes fetch skip (labels 만 별도 fetch)
  const loadLabelsOnly = useCallback(async () => {
    setLoading(true);
    try {
      const labelRes = await fetch(`/api/player-attributes/labels`);
      if (labelRes.ok) {
        const j: { labels: LabelRow[] } = await labelRes.json();
        const m = new Map<string, string>();
        for (const l of j.labels) m.set(`${l.attribute_code}_${l.level}`, l.label_ko);
        setLabels(m);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      loadLabelsOnly();
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, sportType]);

  const effectiveIsGK = isGoalkeeper ?? data?.is_goalkeeper ?? false;
  const attributes = (data?.attributes ?? []).filter((a) => effectiveIsGK || !a.gk_only);
  const totalSamples = data?.total_samples ?? 0;
  const overall = data?.overall_pitch_score ?? 0;
  const comment = data?.comment ?? null;
  const recommendations = data?.recommended_positions ?? [];
  const categoryAvgs = data?.category_averages ?? [];
  const showInsights = totalSamples >= COMMENT_MIN_SAMPLES;
  const isEmpty = totalSamples === 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-lg font-bold">
              PitchScore<sup className="text-xs">™</sup>
            </h2>
            {totalSamples > 0 && (
              <span className="text-xl font-black text-[hsl(var(--primary))]">
                {overall.toFixed(1)}
                <span className="text-xs text-muted-foreground"> / 5</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Triple Trust 알고리즘 — 누가·언제·어떻게 평가했는지 모두 반영
          </p>
        </div>
        {canEvaluate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            + 평가
          </button>
        )}
      </header>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          능력치 불러오는 중…
        </div>
      ) : isEmpty ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">아직 평가가 없어요</p>
          {canEvaluate && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
            >
              첫 평가 시작하기 →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* 항상 보이는 요약 — archetype + 강점 칩 + 평가 수 */}
          {showInsights && comment ? (
            <div className="space-y-2">
              {comment.archetype && (
                <div className="text-base font-bold text-[hsl(var(--primary))]">
                  {comment.archetype}
                </div>
              )}
              {comment.strengths.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {comment.strengths.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${CATEGORY_META[cat].color}20`,
                        color: CATEGORY_META[cat].color,
                      }}
                    >
                      <span>{CATEGORY_META[cat].emoji}</span>
                      {CATEGORY_META[cat].name_ko}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {totalSamples}명이 평가함
              {totalSamples < COMMENT_MIN_SAMPLES && (
                <span> · {COMMENT_MIN_SAMPLES}명 이상 평가하면 한 줄 요약·추천 포지션이 노출돼요</span>
              )}
            </div>
          )}

          {/* 펼친 상태 — 코멘트·추천·레이더·막대 */}
          {expanded && (
            <div className="space-y-5 border-t border-border pt-4">
              {showInsights && comment && (
                <div className="rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-3">
                  <p className="text-sm leading-relaxed">{comment.comment}</p>
                </div>
              )}

              {showInsights && recommendations.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    적합 포지션
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {recommendations.map((rec, idx) => (
                      <div
                        key={rec.position}
                        className="rounded-lg border border-border bg-background/40 p-3"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-bold">
                            {idx === 0 && "👑 "}
                            {rec.name_ko}
                          </span>
                          <span className="text-sm font-bold text-[hsl(var(--primary))]">
                            {rec.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                          {rec.top_attributes.map((a) => a.name_ko).join(" · ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PitchScoreRadar
                data={categoryAvgs.map((c) => ({
                  category: c.category,
                  avg: c.avg,
                  count: c.count,
                }))}
              />

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  세부 능력치
                </div>
                <PitchScoreBarList attributes={attributes} labelMap={labels} />
              </div>
            </div>
          )}

          {/* 접기/펼치기 토글 */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background/40 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary))]/40 transition-colors"
          >
            {expanded ? (
              <>
                접기 <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                능력치 자세히 보기 <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          {/* 평가 이력 페이지 링크 — 평가 1건+ AND viewer 자격 OK (본인 또는 운영진) */}
          {totalSamples > 0 && canViewHistory && (
            <Link
              href={`/player/${targetUserId}/evaluations?sport=${sportType}`}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background/40 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary))]/40 transition-colors"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              평가 이력 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      <EvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        isGoalkeeper={effectiveIsGK}
        sportType={sportType}
        contextTeamId={contextTeamId}
        onSaved={load}
      />
    </section>
  );
}
