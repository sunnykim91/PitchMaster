"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Users, TrendingUp, TrendingDown, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import type { PairMatrix, PairStat } from "@/lib/server/getPairSynergy";

const MIN_MATCHES_FOR_RANKING = 3; // 3경기 이상 함께 뛴 페어만 랭킹 노출

type Props = { initialData: PairMatrix };

export default function MembersPairsClient({ initialData }: Props) {
  const { members, pairs, totalMatches } = initialData;
  const [query, setQuery] = useState("");

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of members) m.set(x.id, x.name);
    return m;
  }, [members]);

  const significantPairs = useMemo(
    () => pairs.filter((p) => p.matches >= MIN_MATCHES_FOR_RANKING),
    [pairs],
  );

  const bestPairs = useMemo(
    () =>
      [...significantPairs]
        .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)
        .slice(0, 10),
    [significantPairs],
  );

  const worryPairs = useMemo(
    () =>
      [...significantPairs]
        .filter((p) => p.winRate <= 0.3)
        .sort((a, b) => a.winRate - b.winRate || b.matches - a.matches)
        .slice(0, 5),
    [significantPairs],
  );

  // 멤버 검색: 한 명을 고르면 그 사람의 모든 페어 (matches DESC)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const matchedMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 20);
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 20);
  }, [members, query]);

  const selectedPairs = useMemo(() => {
    if (!selectedMemberId) return [];
    return pairs
      .filter((p) => p.memberAId === selectedMemberId || p.memberBId === selectedMemberId)
      .filter((p) => p.matches >= 2)
      .sort((a, b) => b.matches - a.matches || b.winRate - a.winRate);
  }, [pairs, selectedMemberId]);

  if (totalMatches === 0) {
    return (
      <div className="space-y-4">
        <Header />
        <EmptyState
          icon={Users}
          title="시즌 데이터가 없습니다"
          description="시즌 안 완료된 경기가 쌓이면 페어 시너지가 표시돼요. 운영진만 볼 수 있습니다."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header totalMatches={totalMatches} />

      {/* 베스트 페어 */}
      {bestPairs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              베스트 페어 Top {Math.min(10, bestPairs.length)}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {MIN_MATCHES_FOR_RANKING}경기 이상 함께
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {bestPairs.map((p, i) => (
              <PairRow key={`${p.memberAId}-${p.memberBId}`} index={i + 1} pair={p} nameById={nameById} accent="success" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 걱정 페어 */}
      {worryPairs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <TrendingDown className="h-4 w-4 text-[hsl(var(--loss))]" />
              자주 고전하는 페어
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                승률 30% 이하
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {worryPairs.map((p, i) => (
              <PairRow key={`${p.memberAId}-${p.memberBId}`} index={i + 1} pair={p} nameById={nameById} accent="loss" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 멤버별 페어 검색 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Search className="h-4 w-4" />
            멤버별 페어 보기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 검색"
            className="text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {matchedMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id === selectedMemberId ? null : m.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-all active:scale-95",
                  m.id === selectedMemberId
                    ? "border-primary bg-primary/15 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>

          {selectedMemberId && selectedPairs.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {nameById.get(selectedMemberId)}님의 페어 — 함께 뛴 경기 수 순
              </p>
              {selectedPairs.map((p) => (
                <PairRow
                  key={`${p.memberAId}-${p.memberBId}`}
                  pair={p}
                  nameById={nameById}
                  highlightId={selectedMemberId}
                />
              ))}
            </div>
          )}
          {selectedMemberId && selectedPairs.length === 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {nameById.get(selectedMemberId)}님이 2경기 이상 함께 뛴 팀원이 아직 없어요.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground/70">
        시즌 누적 {totalMatches}경기 기준 · 운영진에게만 보입니다
      </p>
    </div>
  );
}

function Header({ totalMatches }: { totalMatches?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        회원 관리
      </Link>
      <h1 className="ml-2 text-base font-bold">페어 시너지</h1>
      {totalMatches !== undefined && totalMatches > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">{totalMatches}경기</span>
      )}
    </div>
  );
}

type PairRowProps = {
  pair: PairStat;
  nameById: Map<string, string>;
  index?: number;
  accent?: "success" | "loss";
  highlightId?: string;
};

function PairRow({ pair, nameById, index, accent, highlightId }: PairRowProps) {
  const ratePercent = Math.round(pair.winRate * 100);
  const accentColor =
    accent === "success"
      ? "text-[hsl(var(--success))]"
      : accent === "loss"
      ? "text-[hsl(var(--loss))]"
      : ratePercent >= 60
      ? "text-[hsl(var(--success))]"
      : ratePercent <= 30
      ? "text-[hsl(var(--loss))]"
      : "text-foreground";

  const nameA = nameById.get(pair.memberAId) ?? "이름 없음";
  const nameB = nameById.get(pair.memberBId) ?? "이름 없음";
  const otherId = highlightId === pair.memberAId ? pair.memberBId : highlightId === pair.memberBId ? pair.memberAId : null;
  const display = highlightId
    ? nameById.get(otherId!) ?? "이름 없음"
    : `${nameA} · ${nameB}`;

  // 1·2·3 위 메달 이모지, 4~10은 숫자만
  const rankBadge = index === 1 ? "🥇" : index === 2 ? "🥈" : index === 3 ? "🥉" : index !== undefined ? String(index) : null;

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2.5 transition-colors hover:bg-secondary/60">
      {rankBadge !== null && (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center text-sm font-bold",
            index! > 3 && "text-muted-foreground",
          )}
        >
          {rankBadge}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{display}</p>
      <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
        <span className="text-[hsl(var(--success))]">{pair.wins}</span>
        <span className="mx-0.5">·</span>
        <span>{pair.draws}</span>
        <span className="mx-0.5">·</span>
        <span className="text-[hsl(var(--loss))]">{pair.losses}</span>
      </p>
      <p className={cn("shrink-0 w-12 text-right text-sm font-bold tabular-nums", accentColor)}>
        {ratePercent}%
      </p>
    </div>
  );
}
