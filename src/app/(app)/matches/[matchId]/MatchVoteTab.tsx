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
    <div className="grid gap-4">
      {/* ── 내 참석 투표 ── */}
      {match.status !== "COMPLETED" && myMember && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground">내 참석 투표</p>
                <p className={cn("mt-0.5 text-sm font-semibold", !myVote && "text-[hsl(var(--warning))]")}>
                  {myVote === "ATTEND" ? "참석" : myVote === "ABSENT" ? "불참" : myVote === "MAYBE" ? "미정" : "미투표"}
                </p>
              </div>
              {isExpired ? (
                <p className="text-xs text-muted-foreground shrink-0">투표 마감됨</p>
              ) : (
                <div className="flex gap-1.5 shrink-0">
                  {([ { value: "ATTEND" as const, label: "참석" }, { value: "MAYBE" as const, label: "미정" }, { value: "ABSENT" as const, label: "불참" } ]).map((opt) => (
                    <button key={opt.value} type="button"
                      disabled={pendingVote}
                      className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                        myVote === opt.value ? styles[opt.value].active : styles[opt.value].inactive
                      )}
                      onClick={() => handleMyVote(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 투표 마감하기 (운영진, 마감 전에만) ── */}
      {canManage && match.status !== "COMPLETED" && !isExpired && (
        <button
          type="button"
          onClick={async () => {
            const { error: err } = await apiMutate("/api/matches", "PUT", {
              id: matchId,
              voteDeadline: new Date().toISOString(),
            });
            if (!err) {
              setIsExpired(true);
              showToast("투표가 마감되었습니다.");
            }
          }}
          className="rounded-xl border border-[hsl(var(--loss)/0.3)] bg-[hsl(var(--loss)/0.1)] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.2)] transition-colors w-full"
        >
          투표 마감하기
        </button>
      )}

      {/* ── 투표 현황 요약 ── */}
      <Card>
        <CardContent className="p-4">
          {/* 프로그레스 바 */}
          {(() => {
            const voted = attend.length + absent.length + maybe.length;
            const total = voted || 1;
            return (
              <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-secondary/50">
                <div className="bg-[hsl(var(--success))] transition-all duration-500" style={{ width: `${(attend.length / total) * 100}%` }} />
                <div className="bg-[hsl(var(--loss))] transition-all duration-500" style={{ width: `${(absent.length / total) * 100}%` }} />
                <div className="bg-[hsl(var(--warning))] transition-all duration-500" style={{ width: `${(maybe.length / total) * 100}%` }} />
              </div>
            );
          })()}
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <span className="text-[hsl(var(--success))]">참석 {attend.length}</span>
            <span className="text-[hsl(var(--loss))]">불참 {absent.length}</span>
            <span className="text-[hsl(var(--warning))]">미정 {maybe.length}</span>
            <span className="text-muted-foreground">미투표 {noVote.length}</span>
            {guestCount > 0 && <span className="text-[hsl(var(--info))]">용병 {guestCount}</span>}
            <span className="text-muted-foreground/50">· 총 {baseRoster.length + guestCount}명</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 투표 관리 (운영진) 또는 현황 (평회원) ── */}
      {canManage ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">투표 관리</CardTitle>
            <input type="text" placeholder="이름 검색..." value={voteSearch}
              onChange={(e) => setVoteSearch(e.target.value)} list="vote-member-names" autoComplete="off"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <datalist id="vote-member-names">
              {baseRoster.map((m) => <option key={m.memberId} value={m.name} />)}
            </datalist>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {([{ v: "all" as const, l: "전체" }, { v: "unvoted" as const, l: "미투표" }]).map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setVoteFilter(v)}
                    className={cn("rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                      voteFilter === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}>
                    {l}{v === "unvoted" && noVote.length > 0 && (
                      <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold leading-tight",
                        voteFilter === "unvoted" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/15 text-destructive"
                      )}>{noVote.length}</span>
                    )}
                  </button>
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
                      className={cn("rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                        isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {isActive ? labels[idx] : labels[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            {noVote.length > 0 && (
              <button type="button"
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/push/vote-nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: match.id }) });
                    const data = await res.json();
                    showToast(`미투표자 ${data.unvoted ?? 0}명에게 알림을 보냈습니다`);
                  } catch { showToast("알림 발송에 실패했습니다", "error"); }
                }}>
                <Bell className="h-3.5 w-3.5" />투표독려 알림 보내기
              </button>
            )}
          </CardHeader>
          <CardContent>
            <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
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
                  <div key={member.id} className={cn("flex items-center justify-between rounded-lg px-3 py-2.5",
                    !currentVote ? "bg-destructive/5 ring-1 ring-destructive/20" : "bg-secondary"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{member.name}</span>
                      {!member.isLinked && <Badge variant="outline" className="text-xs text-muted-foreground">미가입</Badge>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {([{ value: "ATTEND" as const, label: "참석" }, { value: "MAYBE" as const, label: "미정" }, { value: "ABSENT" as const, label: "불참" }]).map((opt) => (
                        <button key={opt.value} type="button"
                          className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
                            currentVote === opt.value ? styles[opt.value].active : styles[opt.value].inactive
                          )}
                          onClick={() => handleProxyVote(member.memberId, opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* 평회원 참석 현황 */
        baseRoster.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              {attend.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--success))]">참석</p>
                  <div className="flex flex-wrap gap-1.5">
                    {attend.map((m) => <span key={m.id} className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">{m.name}</span>)}
                  </div>
                </div>
              )}
              {maybe.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--warning))]">미정</p>
                  <div className="flex flex-wrap gap-1.5">
                    {maybe.map((m) => <span key={m.id} className="rounded-full bg-[hsl(var(--warning)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--warning))]">{m.name}</span>)}
                  </div>
                </div>
              )}
              {absent.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--loss))]">불참</p>
                  <div className="flex flex-wrap gap-1.5">
                    {absent.map((m) => <span key={m.id} className="rounded-full bg-[hsl(var(--loss)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--loss))]">{m.name}</span>)}
                  </div>
                </div>
              )}
              {noVote.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">미투표</p>
                  <div className="flex flex-wrap gap-1.5">
                    {noVote.map((m) => <span key={m.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">{m.name}</span>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

export const MatchVoteTab = memo(MatchVoteTabInner);
