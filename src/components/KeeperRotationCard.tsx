"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices, Copy, Check, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendingPlayer } from "@/components/AutoFormationBuilder";
import type { InternalSide, InternalSideConfig } from "@/lib/internalSides";
import { INTERNAL_SIDES } from "@/lib/internalSides";

/**
 * 풋살 키퍼·교대 순번 카드 ("번호 뽑기") — 전술 탭, 풋살 전용.
 *
 * 풋살은 실점 시 키퍼 교체 + 쿼터 쉬는 순서를 즉석 뽑은 번호로 돌리는 팀이 많다.
 * 각 팀(자체전 A/B/C) 또는 참석 인원 전체에 1~N 랜덤 번호를 공정 배정·공유한다.
 *
 * - 고정 키퍼(필드 안 뜀)는 번호에서 제외. 선호 포지션이 GK '단독'인 선수는 자동 후보(탭으로 해제 가능).
 * - 배정·재추첨은 STAFF+(canManage), 조회는 전원.
 * - 저장: /api/keeper-rotation (matches.keeper_rotation JSONB). 전술판 배치와는 독립.
 */

type GuestLite = { id: string; name: string };
type InternalTeamAssignment = { playerId: string; side: InternalSide };
type Rotation = { keepers: string[]; groups: Record<string, string[]> };

type Group = {
  key: string;
  label: string;
  cfg: InternalSideConfig | null;
  players: AttendingPlayer[];
};

/** 선호 포지션이 GK '단독'이면 고정 키퍼로 추정 (GK + 다른 포지션은 로테이션) */
function isGkOnly(p: AttendingPlayer): boolean {
  const list =
    p.preferredPositions && p.preferredPositions.length > 0
      ? p.preferredPositions
      : p.preferredPosition
        ? [p.preferredPosition]
        : [];
  return list.length === 1 && list[0] === "GK";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function KeeperRotationCard({
  matchId,
  attendingPlayers,
  guests,
  isInternal,
  internalTeams,
  canManage,
}: {
  matchId: string;
  attendingPlayers: AttendingPlayer[];
  guests?: GuestLite[];
  isInternal: boolean;
  internalTeams?: InternalTeamAssignment[];
  canManage: boolean;
}) {
  const [keepers, setKeepers] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [staleKeepers, setStaleKeepers] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // 그룹 구성 — 자체전이면 side(A/B/C)별, 일반전이면 참석 인원 한 묶음(TEAM)
  const groups: Group[] = useMemo(() => {
    if (isInternal && internalTeams && internalTeams.length > 0) {
      return INTERNAL_SIDES.filter((s) => internalTeams.some((t) => t.side === s.side)).map((s) => {
        const ids = internalTeams.filter((t) => t.side === s.side).map((t) => t.playerId);
        const players = ids
          .map((id) => attendingPlayers.find((p) => p.id === id))
          .filter((p): p is AttendingPlayer => !!p);
        return { key: s.side as string, label: s.label, cfg: s, players };
      });
    }
    const guestPlayers: AttendingPlayer[] = (guests ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      preferredPosition: "CM",
      isGuest: true,
    }));
    return [{ key: "TEAM", label: "참석 인원", cfg: null, players: [...attendingPlayers, ...guestPlayers] }];
  }, [attendingPlayers, guests, isInternal, internalTeams]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) for (const p of g.players) m.set(p.id, p.name);
    return m;
  }, [groups]);

  // 저장된 번호 로드 (없으면 GK 단독 선수를 고정 키퍼 후보로 자동 선택)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/keeper-rotation?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const rot: Rotation | null = d?.rotation ?? null;
        if (rot && Array.isArray(rot.keepers)) {
          setKeepers(new Set(rot.keepers));
          setOrder(rot.groups ?? {});
        } else {
          const auto = new Set<string>();
          for (const p of attendingPlayers) if (isGkOnly(p)) auto.add(p.id);
          setKeepers(auto);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // attendingPlayers 는 자동 후보 계산에만 쓰고 의존성에서 제외 — 편집 중 리셋 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function persist(keeperIds: string[], grps: Record<string, string[]>) {
    if (!canManage) return;
    setSaving(true);
    try {
      await fetch("/api/keeper-rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, keepers: keeperIds, groups: grps }),
      });
    } catch {
      /* 참고용 카드라 실패해도 화면 유지 */
    } finally {
      setSaving(false);
    }
  }

  function roll() {
    const next: Record<string, string[]> = {};
    for (const g of groups) {
      const pool = g.players.filter((p) => !keepers.has(p.id)).map((p) => p.id);
      next[g.key] = shuffle(pool);
    }
    setOrder(next);
    setStaleKeepers(false);
    void persist(Array.from(keepers), next);
  }

  function toggleKeeper(id: string) {
    setKeepers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setOrder({}); // 키퍼 구성이 바뀌면 기존 번호 무효 → 재추첨 유도
    setStaleKeepers(true);
  }

  function buildShareText(): string {
    const lines: string[] = ["⚽ 키퍼·교대 순번"];
    for (const g of groups) {
      if (groups.length > 1) lines.push(`\n[${g.label}]`);
      const kps = g.players.filter((p) => keepers.has(p.id));
      if (kps.length) lines.push(`🧤 고정 키퍼: ${kps.map((p) => p.name).join(", ")}`);
      (order[g.key] ?? []).forEach((id, i) => lines.push(`${i + 1}. ${nameOf.get(id) ?? "?"}`));
    }
    return lines.join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 미지원 무시 */
    }
  }

  if (!loaded) return null;

  const totalPlayers = groups.reduce((s, g) => s + g.players.length, 0);
  const hasOrder = Object.values(order).some((arr) => arr.length > 0);

  // 자체전인데 팀 미편성
  if (isInternal && (!internalTeams || internalTeams.length === 0)) {
    return (
      <Card className="rounded-xl border-border/30">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-foreground">키퍼·교대 순번</p>
          <p className="mt-1.5 text-xs text-muted-foreground">먼저 A/B 팀을 편성하면 팀별로 번호를 뽑을 수 있어요.</p>
        </CardContent>
      </Card>
    );
  }
  if (totalPlayers === 0) return null;

  return (
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <CardContent className="p-4">
        {/* 헤더 + 설명 토글 */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">키퍼·교대 순번</span>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={showHelp}
          >
            <Info className="h-3.5 w-3.5" />
            이게 뭐예요?
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">실점 시 키퍼 바꾸고, 쉬는 순서도 번호대로 — 공정하게 뽑아요.</p>

        {showHelp && (
          <div className="mt-2 space-y-1 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p>• 풋살은 실점하면 키퍼를 다음 사람으로 바꾸고, 쉬는 순서도 정하죠. 매번 제비뽑기하던 걸 앱이 공정하게 번호로 뽑아줘요.</p>
            <p>
              • <b className="text-foreground">1번이 첫 키퍼</b>, 실점하면 2번이 키퍼… 쉬는 순서도 이 번호대로 쓰면 공평해요.
            </p>
            <p>
              • 골문만 보는 <b className="text-foreground">고정 키퍼</b>가 있으면 그 사람은 빼고 나머지 번호를 뽑아요. (선호 포지션이 GK만인 선수는 자동으로 잡혀요)
            </p>
          </div>
        )}

        {/* 액션 */}
        {canManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={roll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Dices className="h-4 w-4" />
              {hasOrder ? "다시 뽑기" : "번호 뽑기"}
            </button>
            {hasOrder && (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40"
              >
                {copied ? <Check className="h-4 w-4 text-[hsl(var(--success))]" /> : <Copy className="h-4 w-4" />}
                {copied ? "복사됨" : "결과 복사"}
              </button>
            )}
          </div>
        )}

        {canManage && staleKeepers && (
          <p className="mt-2 text-xs text-[hsl(var(--warning))]">키퍼를 바꿨어요 — 다시 뽑아주세요.</p>
        )}

        {!hasOrder && (
          <p className="mt-2 text-xs text-muted-foreground">
            {canManage
              ? "🎲 번호 뽑기를 누르면 팀별로 키퍼·교대 순번이 정해져요."
              : "아직 순번이 정해지지 않았어요. 운영진이 정하면 표시됩니다."}
          </p>
        )}

        {/* 그룹 — 구분선 기반 (박스 안 박스 X) */}
        <div className="mt-2 divide-y divide-border/30">
          {groups.map((g) => {
            const keeperPlayers = g.players.filter((p) => keepers.has(p.id));
            const ordered = order[g.key] ?? [];
            const showHeader = groups.length > 1 || keeperPlayers.length > 0;
            return (
              <div key={g.key} className="py-3 first:pt-2">
                {showHeader && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {groups.length > 1 && (
                      <span className={cn("text-sm font-bold", g.cfg?.text ?? "text-foreground")}>
                        {g.cfg?.emoji} {g.label}
                      </span>
                    )}
                    {keeperPlayers.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        🧤 고정 키퍼 <b className="text-foreground/90">{keeperPlayers.map((p) => p.name).join(", ")}</b>
                      </span>
                    )}
                  </div>
                )}

                {ordered.length > 0 && (
                  <>
                    <ol className="mt-2 space-y-1">
                      {ordered.map((id, i) => (
                        <li key={id} className="flex items-center gap-2 text-sm">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary">
                            {i + 1}
                          </span>
                          <span className="text-foreground/90">{nameOf.get(id) ?? "?"}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {keeperPlayers.length > 0
                        ? "번호 = 필드·휴식 교대 순서"
                        : "1번이 첫 키퍼 · 실점하면 다음 번호로 (쉬는 순서도 번호순)"}
                    </p>
                  </>
                )}

                {canManage && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                      키퍼 바꾸기
                    </summary>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      골문만 보는 사람(필드 안 뜀)을 골라주세요. 나머지는 번호로 돌아갑니다.
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.players.map((p) => {
                        const on = keepers.has(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleKeeper(p.id)}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs transition-colors",
                              on
                                ? "bg-primary/15 font-medium text-primary"
                                : "border border-border/60 text-muted-foreground hover:bg-secondary/40",
                            )}
                          >
                            {on ? "🧤 " : ""}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
