"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type {
  AttributeCode,
  AttributeCategory,
  AttributeLevel,
  SportType,
} from "@/lib/playerAttributes/types";

interface CodeMeta {
  code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  display_order: number;
  gk_only: boolean;
  applicable_sports: SportType[];
}

interface LabelRow {
  attribute_code: AttributeCode;
  level: AttributeLevel;
  label_ko: string;
}

interface LabelsResponse {
  codes: CodeMeta[];
  labels: LabelRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  isGoalkeeper?: boolean;
  sportType: SportType;
  /** 평가가 저장될 팀 ID — 서버가 sport_type 결정 + 같은 팀 검증에 사용 */
  contextTeamId: string;
  onSaved?: () => void;
}

export default function EvaluationModal({
  open,
  onClose,
  targetUserId,
  targetUserName,
  isGoalkeeper,
  sportType,
  contextTeamId,
  onSaved,
}: Props) {
  const [codes, setCodes] = useState<CodeMeta[]>([]);
  const [labelsByCodeLevel, setLabelsByCodeLevel] = useState<Map<string, string>>(new Map());
  const [scores, setScores] = useState<Map<AttributeCode, AttributeLevel>>(new Map());
  const [openCategories, setOpenCategories] = useState<Set<AttributeCategory>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 열릴 때 body scroll lock — 페이지가 모달 뒤로 스크롤되는 현상 방지.
  // 부모 모달(PeerEvaluationCard) 안에서 떠도 viewport 기준 위치 유지하도록.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/player-attributes/labels");
        if (!res.ok) throw new Error("라벨 마스터 로딩 실패");
        const data: LabelsResponse = await res.json();
        if (cancelled) return;
        setCodes(data.codes);
        const m = new Map<string, string>();
        for (const l of data.labels) m.set(`${l.attribute_code}_${l.level}`, l.label_ko);
        setLabelsByCodeLevel(m);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "오류");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 카테고리별 그룹화 — 현재 sport_type 에 적용되는 능력치만 노출 (풋살이면 4개 자동 제외)
  const groups = new Map<AttributeCategory, CodeMeta[]>();
  for (const c of codes) {
    if (!isGoalkeeper && c.gk_only) continue;
    if (!c.applicable_sports?.includes(sportType)) continue;
    const arr = groups.get(c.category) ?? [];
    arr.push(c);
    groups.set(c.category, arr);
  }

  function toggleCategory(cat: AttributeCategory) {
    const next = new Set(openCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setOpenCategories(next);
  }

  async function handleSave() {
    if (scores.size === 0) {
      setError("평가할 능력치를 선택해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 변경된 능력치마다 POST 호출 (UPSERT)
      for (const [code, level] of scores) {
        const res = await fetch(`/api/players/${targetUserId}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attribute_code: code,
            score: level,
            context: "FREE",
            team_id: contextTeamId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `${code} 저장 실패`);
        }
      }
      setScores(new Map());
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !mounted) return null;

  // createPortal 로 document.body 에 직접 렌더 — 부모(예: PeerEvaluationCard 모달)에
  // backdrop-filter 같은 containing block 생성 속성이 있어도 fixed 가 viewport 기준으로
  // 정상 위치되도록 함. 이중 모달 시 inner 모달이 outer 영역에 갇혀 스크롤해야 보이는 사고 방지.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold">{targetUserName} 능력치 평가</h2>
            <p className="text-xs text-muted-foreground">
              평가하지 않은 항목은 건드리지 않아도 됩니다
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {[...groups.entries()].map(([cat, items]) => {
            const meta = CATEGORY_META[cat];
            const isOpen = openCategories.has(cat);
            const ratedCount = items.filter((it) => scores.has(it.code)).length;
            return (
              <div key={cat} className="rounded-lg border border-border bg-background/40">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <span>{meta.emoji}</span>
                    <span style={{ color: meta.color }}>{meta.name_ko}</span>
                    <span className="text-xs text-muted-foreground">
                      ({items.length}개{ratedCount > 0 && ` · ${ratedCount}개 평가됨`})
                    </span>
                  </span>
                  <span className="text-muted-foreground">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-border p-3">
                    {items.map((c) => {
                      const current = scores.get(c.code);
                      return (
                        <div key={c.code} className="space-y-2">
                          <div className="text-sm font-medium">{c.name_ko}</div>
                          <div className="space-y-1.5">
                            {([1, 2, 3, 4, 5] as AttributeLevel[]).map((lv) => {
                              const label = labelsByCodeLevel.get(`${c.code}_${lv}`);
                              const selected = current === lv;
                              return (
                                <label
                                  key={lv}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
                                    selected
                                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 font-medium"
                                      : "border-border hover:bg-white/5"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={c.code}
                                    checked={selected}
                                    onChange={() => {
                                      const next = new Map(scores);
                                      next.set(c.code, lv);
                                      setScores(next);
                                    }}
                                    className="sr-only"
                                  />
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                      selected
                                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </span>
                                  <span>{label ?? `레벨 ${lv}`}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border p-4">
          <span className="text-xs text-muted-foreground">
            {scores.size}개 평가 선택됨
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-white/5"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || scores.size === 0}
              className="rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
