"use client";

import { memo, useEffect, useState } from "react";
import { GA } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import type { Match, RosterPlayer } from "./matchDetailTypes";
import { voteStyles as styles } from "@/lib/voteStyles";

export interface MatchVoteTabProps {
  matchId: string;
  userId: string;
  match: Match;
  canManage: boolean;
  baseRoster: RosterPlayer[];
  memberVoteMap: Record<string, "ATTEND" | "ABSENT" | "MAYBE">;
  memberVoteTimeMap?: Record<string, string>;
  guestCount?: number;
  refetchVote: () => Promise<unknown>;
  handleProxyVote: (memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") => Promise<void>;
}

function MatchVoteTabInner({
  matchId,
  userId,
  match,
  canManage,
  baseRoster,
  memberVoteMap,
  memberVoteTimeMap,
  guestCount = 0,
  refetchVote,
  handleProxyVote,
}: MatchVoteTabProps) {
  const { showToast } = useToast();
  const [voteSearch, setVoteSearch] = useState("");
  const [voteFilter, setVoteFilter] = useState<"all" | "unvoted">("all");
  const [voteSortBy, setVoteSortBy] = useState<"none" | "name-asc" | "name-desc" | "time-asc" | "time-desc">("none");
  // Optimistic UI: undefined = 서버 데이터 사용, null | 값 = 즉시 반영된 낙관적 상태
  const [optimisticMyVote, setOptimisticMyVote] = useState<"ATTEND" | "ABSENT" | "MAYBE" | null | undefined>(undefined);
  // 연속 클릭 방지용 (300ms)
  const [pendingVote, setPendingVote] = useState(false);

  const myMember = baseRoster.find((m) => m.id === userId);
  const serverMyVote = myMember ? memberVoteMap[myMember.memberId] : undefined;
  // 낙관적 상태가 있으면 우선 사용
  const myVote = optimisticMyVote !== undefined ? (optimisticMyVote ?? undefined) : serverMyVote;

  async function handleMyVote(vote: "ATTEND" | "ABSENT" | "MAYBE") {
    if (myVote === vote) return;
    if (pendingVote) return;

    // 이전 상태 저장 (롤백용) — optimisticMyVote 타입과 동일하게 유지
    const prevVote: "ATTEND" | "ABSENT" | "MAYBE" | null | undefined =
      optimisticMyVote !== undefined ? optimisticMyVote : (serverMyVote ?? null);

    // 즉시 UI 반영 (낙관적 업데이트)
    setOptimisticMyVote(vote);

    // 연속 클릭 방지 (300ms)
    setPendingVote(true);
    setTimeout(() => setPendingVote(false), 300);

    // 백그라운드 API 호출
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    if (err) {
      // 실패 시 롤백
      setOptimisticMyVote(prevVote);
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      GA.voteComplete(vote, "match_detail");
      showToast(vote === "ATTEND" ? "참석으로 투표했습니다." : vote === "ABSENT" ? "불참으로 투표했습니다." : "미정으로 투표했습니다.");
      // 성공 시 백그라운드 refetch 후 낙관적 상태 초기화
      await refetchVote();
      setOptimisticMyVote(undefined);
    }
  }
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    setIsExpired(match.voteDeadline ? new Date(match.voteDeadline) < new Date() : false);
  }, [match.voteDeadline]);

  const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND");
  const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT");
  const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE");
  const noVote = baseRoster.filter((m) => !memberVoteMap[m.memberId]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ══ 내 참석 투표 ══ */}
      {match.status !== "COMPLETED" && myMember && (
        <Card className="rounded-xl border-border/30 overflow-hidden">
          <CardHeader className="pb-2"><CardTitle className="text-base font-bold">내 투표</CardTitle></CardHeader>
          <CardContent>
            {match.voteDeadline && (
              <div className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>마감: {new Date(match.voteDeadline).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            {isExpired ? (
              <div className="py-4 text-center"><Badge variant="secondary" className="text-sm">마감됨</Badge></div>
            ) : (
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="참석 투표">
                {([
                  { value: "ATTEND" as const, label: "참석", icon: "👤", activeClass: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" },
                  { value: "MAYBE" as const, label: "미정", icon: "❓", activeClass: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]" },
                  { value: "ABSENT" as const, label: "불참", icon: "🚫", activeClass: "bg-destructive text-destructive-foreground" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={myVote === opt.value}
                    disabled={pendingVote}
                    onClick={() => handleMyVote(opt.value)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-4 transition-all min-h-[80px]",
                      myVote === opt.value ? opt.activeClass : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                      pendingVote && "opacity-50"
                    )}
                  >
                    {myVote === opt.value && <span className="absolute right-2 top-2 text-xs">✓</span>}
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ 투표 현황 요약 ══ */}
      <Card className="rounded-xl border-border/30">
        <CardContent className="p-5">
          {(() => {
            const voted = attend.length + absent.length + maybe.length;
            const total = voted || 1;
            return (
              <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-[hsl(var(--success))] transition-all duration-500" style={{ width: `${(attend.length / total) * 100}%` }} />
                <div className="bg-[hsl(var(--loss))] transition-all duration-500" style={{ width: `${(absent.length / total) * 100}%` }} />
                <div className="bg-[hsl(var(--warning))] transition-all duration-500" style={{ width: `${(maybe.length / total) * 100}%` }} />
              </div>
            );
          })()}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div><div className="text-xl font-bold text-[hsl(var(--success))]">{attend.length}</div><div className="text-[10px] text-muted-foreground">참석</div></div>
            <div><div className="text-xl font-bold text-[hsl(var(--loss))]">{absent.length}</div><div className="text-[10px] text-muted-foreground">불참</div></div>
            <div><div className="text-xl font-bold text-[hsl(var(--warning))]">{maybe.length}</div><div className="text-[10px] text-muted-foreground">미정</div></div>
            <div><div className="text-xl font-bold text-muted-foreground">{noVote.length}</div><div className="text-[10px] text-muted-foreground">미투표</div></div>
            <div><div className="text-xl font-bold text-[hsl(var(--info))]">{guestCount}</div><div className="text-[10px] text-muted-foreground">용병</div></div>
          </div>
          <div className="mt-3 border-t border-border/30 pt-3 text-center text-xs text-muted-foreground">총 {baseRoster.length + guestCount}명</div>

          {canManage && match.status !== "COMPLETED" && (
            <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
              {isExpired ? (
                <>
                  <span className="text-xs text-muted-foreground">투표 마감됨</span>
                  <button type="button" onClick={async () => {
                    const future = new Date(); future.setMonth(future.getMonth() + 1);
                    const { error: err } = await apiMutate("/api/matches", "PUT", { id: matchId, voteDeadline: future.toISOString() });
                    if (!err) { setIsExpired(false); showToast("투표가 재개되었습니다."); }
                  }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    투표 재개
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">투표 진행 중</span>
                  <button type="button" onClick={async () => {
                    const { error: err } = await apiMutate("/api/matches", "PUT", { id: matchId, voteDeadline: new Date().toISOString() });
                    if (!err) { setIsExpired(true); showToast("투표가 마감되었습니다."); }
                  }} className="rounded-lg border border-[hsl(var(--loss)/0.3)] bg-[hsl(var(--loss)/0.08)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--loss))] transition-colors hover:bg-[hsl(var(--loss)/0.15)]">
                    투표 마감
                  </button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ 투표 관리 (운영진) / 현황 (평회원) ══ */}
      {canManage ? (
        <Card className="rounded-xl border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">{canManage ? "투표 관리" : "투표 현황"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <input type="text" placeholder="이름 검색" value={voteSearch}
                onChange={(e) => setVoteSearch(e.target.value)} list="vote-member-names" autoComplete="off"
                className="w-full min-h-[44px] rounded-lg border-0 bg-secondary pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
              <datalist id="vote-member-names">
                {baseRoster.map((m) => <option key={m.memberId} value={m.name} />)}
              </datalist>
            </div>

            <div className="flex gap-2">
              <div className="flex gap-1.5">
                {([{ v: "all" as const, l: "전체" }, { v: "unvoted" as const, l: "미투표" }]).map(({ v, l }) => (
                  <Button key={v} variant={voteFilter === v ? "default" : "secondary"} size="sm" onClick={() => setVoteFilter(v)}
                    className={cn("relative min-h-[36px]", voteFilter === v && "bg-primary text-primary-foreground")}>
                    {l}
                    {v === "unvoted" && noVote.length > 0 && (
                      <Badge className="absolute -right-1.5 -top-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 min-w-[18px] h-[18px]">{noVote.length}</Badge>
                    )}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 border-l border-border pl-2">
                {([
                  { key: "name", cycle: ["none", "name-asc", "name-desc"] as string[], labels: ["이름", "이름 ↑", "이름 ↓"] },
                  { key: "time", cycle: ["none", "time-asc", "time-desc"] as string[], labels: ["투표시간", "투표 ↑", "투표 ↓"] },
                ]).map(({ key, cycle, labels }) => {
                  const idx = cycle.indexOf(voteSortBy);
                  const isActive = idx > 0;
                  return (
                    <button key={key} type="button"
                      onClick={() => { const next = idx < 0 ? 1 : (idx + 1) % 3; setVoteSortBy(cycle[next] as typeof voteSortBy); }}
                      className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {isActive ? labels[idx] : labels[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="max-h-[50vh] space-y-2 overflow-y-auto" role="list">
              {[...baseRoster].filter((m) => {
                if (voteSearch && !m.name.includes(voteSearch)) return false;
                if (voteFilter === "unvoted" && memberVoteMap[m.memberId]) return false;
                return true;
              }).sort((a, b) => {
                if (voteSortBy === "name-asc") return a.name.localeCompare(b.name, "ko");
                if (voteSortBy === "name-desc") return b.name.localeCompare(a.name, "ko");
                if (voteSortBy === "time-asc") return (memberVoteTimeMap?.[a.memberId] ?? "").localeCompare(memberVoteTimeMap?.[b.memberId] ?? "") || a.name.localeCompare(b.name, "ko");
                if (voteSortBy === "time-desc") return (memberVoteTimeMap?.[b.memberId] ?? "").localeCompare(memberVoteTimeMap?.[a.memberId] ?? "") || a.name.localeCompare(b.name, "ko");
                const order: Record<string, number> = { ATTEND: 0, MAYBE: 1, ABSENT: 2 };
                const oA = memberVoteMap[a.memberId] ? (order[memberVoteMap[a.memberId]] ?? 3) : 4;
                const oB = memberVoteMap[b.memberId] ? (order[memberVoteMap[b.memberId]] ?? 3) : 4;
                return oA !== oB ? oA - oB : a.name.localeCompare(b.name, "ko");
              }).map((member) => {
                const currentVote = memberVoteMap[member.memberId];
                return (
                  <li key={member.id} className={cn("flex items-center justify-between rounded-xl p-3 transition-colors",
                    !currentVote ? "bg-destructive/15 ring-1 ring-inset ring-destructive/30" : "bg-secondary/50"
                  )}>
                    <span className={cn("text-sm font-medium", !currentVote && "text-destructive")}>{member.name}</span>
                    <div className="flex gap-1" role="radiogroup">
                      {([{ value: "ATTEND" as const, label: "참석" }, { value: "MAYBE" as const, label: "미정" }, { value: "ABSENT" as const, label: "불참" }]).map((opt) => (
                        <button key={opt.value} role="radio" aria-checked={currentVote === opt.value}
                          className={cn("min-h-[32px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                            currentVote === opt.value ? styles[opt.value].active : styles[opt.value].inactive
                          )}
                          onClick={() => handleProxyVote(member.memberId, opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>

            {noVote.length > 0 && (
              <Button className="w-full min-h-[48px] font-semibold" onClick={async () => {
                try {
                  const res = await fetch("/api/push/vote-nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: match.id }) });
                  const data = await res.json();
                  showToast(`미투표자 ${data.unvoted ?? 0}명에게 알림을 보냈습니다`);
                } catch { showToast("알림 발송에 실패했습니다", "error"); }
              }}>
                <Bell className="mr-2 h-4 w-4" />미투표 {noVote.length}명에게 알림 보내기
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        baseRoster.length > 0 && (
          <Card className="rounded-xl border-border/30">
            <CardContent className="space-y-5 p-5">
              {([
                { items: attend, label: "참석", color: "success" },
                { items: maybe, label: "미정", color: "warning" },
                { items: absent, label: "불참", color: "loss" },
                { items: noVote, label: "미투표", color: null },
              ]).filter(({ items }) => items.length > 0).map(({ items, label, color }) => (
                <div key={label}>
                  <div className="mb-2 flex items-center gap-2">
                    {color && <div className={`h-2 w-2 rounded-full bg-[hsl(var(--${color}))]`} />}
                    {!color && <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
                    <span className="text-sm font-semibold">{label}</span>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((m) => (
                      <Badge key={m.id} className={cn("border-0 font-medium",
                        color ? `bg-[hsl(var(--${color}))]/15 text-[hsl(var(--${color}))]` : "bg-secondary text-muted-foreground"
                      )}>{m.name}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

export const MatchVoteTab = memo(MatchVoteTabInner);
