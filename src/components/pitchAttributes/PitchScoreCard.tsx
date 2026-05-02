"use client";

import { useEffect, useState, useCallback } from "react";
import PitchScoreRadar from "./PitchScoreRadar";
import PitchScoreBarList from "./PitchScoreBarList";
import EvaluationModal from "./EvaluationModal";
import type {
  AttributeCode,
  AttributeCategory,
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

interface AttributesResponse {
  user_id: string;
  attributes: AttributeRow[];
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
  isGoalkeeper?: boolean;
  /** 본인 또는 운영진은 평가 가능 (UI 표시용) */
  canEvaluate?: boolean;
}

export default function PitchScoreCard({
  targetUserId,
  targetUserName,
  isGoalkeeper,
  canEvaluate = true,
}: Props) {
  const [data, setData] = useState<AttributesResponse | null>(null);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [attrRes, labelRes] = await Promise.all([
        fetch(`/api/players/${targetUserId}/attributes`),
        fetch(`/api/player-attributes/labels`),
      ]);
      if (attrRes.ok) {
        const j: AttributesResponse = await attrRes.json();
        setData(j);
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
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const attributes = (data?.attributes ?? []).filter(
    (a) => isGoalkeeper || !a.gk_only,
  );
  const totalSamples = attributes.reduce((sum, a) => sum + a.sample_count, 0);

  // 카테고리별 평균 (레이더 차트)
  const categoryAvg: Array<{ category: AttributeCategory; avg: number; count: number }> = [];
  const grouped = new Map<AttributeCategory, AttributeRow[]>();
  for (const a of attributes) {
    const arr = grouped.get(a.category) ?? [];
    arr.push(a);
    grouped.set(a.category, arr);
  }
  for (const [cat, items] of grouped) {
    const rated = items.filter((i) => i.sample_count > 0);
    const avg = rated.length > 0
      ? rated.reduce((s, i) => s + i.pitch_score, 0) / rated.length
      : 0;
    const count = rated.reduce((s, i) => s + i.sample_count, 0);
    categoryAvg.push({ category: cat, avg, count });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">
            PitchScore<sup className="text-xs">™</sup>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Triple Trust 알고리즘 — 누가·언제·어떻게 평가했는지 모두 반영
          </p>
        </div>
        {canEvaluate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            평가하기
          </button>
        )}
      </header>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          능력치 불러오는 중…
        </div>
      ) : totalSamples === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            아직 평가가 없어요
          </p>
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
        <div className="space-y-5">
          <PitchScoreRadar data={categoryAvg} />
          <div className="text-xs text-muted-foreground">
            평가 누적 {totalSamples}건
          </div>
          <PitchScoreBarList attributes={attributes} labelMap={labels} />
        </div>
      )}

      <EvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        isGoalkeeper={isGoalkeeper}
        onSaved={load}
      />
    </section>
  );
}
