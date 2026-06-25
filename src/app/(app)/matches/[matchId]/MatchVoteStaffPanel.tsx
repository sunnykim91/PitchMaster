"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/ToastContext";
import { useAsyncAction } from "@/lib/useAsyncAction";
import type { Match, RosterPlayer } from "./matchDetailTypes";
import { voteStyles as styles } from "@/lib/voteStyles";

type ExemptionInfo = { type: string; reason: string | null; endDate: string | null };
const DORMANT_ICON: Record<string, string> = { INJURED: "🏥", PERSONAL: "✈️", OTHER: "❓" };

type VoteSortBy = "none" | "name-asc" | "name-desc" | "time-asc" | "time-desc";
type VoteFilter = "all" | "unvoted";

export interface MatchVoteStaffPanelProps {
  match: Match;
  baseRoster: RosterPlayer[];
  visibleRoster: RosterPlayer[];
  memberVoteMap: Record<string, "ATTEND" | "ABSENT" | "MAYBE">;
  memberVoteTimeMap?: Record<string, string>;
  exemptions: Record<string, ExemptionInfo>;
  noVoteCount: number;
  handleProxyVote: (memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") => Promise<void>;
  /* 부모(MatchDetailClient)에서 보유 — vote 탭 unmount 후에도 유지 */
  voteSearch: string;
  setVoteSearch: (v: string) => void;
  voteFilter: VoteFilter;
  setVoteFilter: (v: VoteFilter) => void;
  voteSortBy: VoteSortBy;
  setVoteSortBy: (v: VoteSortBy) => void;
}

function MatchVoteStaffPanelInner({
  match,
  baseRoster,
  visibleRoster,
  memberVoteMap,
  memberVoteTimeMap,
  exemptions,
  noVoteCount,
  handleProxyVote,
  voteSearch,
  setVoteSearch,
  voteFilter,
  setVoteFilter,
  voteSortBy,
  setVoteSortBy,
}: MatchVoteStaffPanelProps) {
  const { showToast } = useToast();
  const [runNudge, nudgeLoading] = useAsyncAction();
  /* loadingProxy/shakeProxy 는 작업 중 일시 상태 — unmount 시 사라져도 무방.
   * 운영진이 대리투표 클릭 도중 다른 탭으로 이동할 가능성 낮고,
   * 이동해도 다음 클릭에서 새 상태로 시작하면 됨. */
  const [loadingProxy, setLoadingProxy] = useState<string | null>(null);
  const [shakeProxy, setShakeProxy] = useState<string | null>(null);

  const dormantIds = new Set(Object.keys(exemptions));

  async function handleProxyVoteWithFeedback(memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") {
    const key = `${memberId}:${vote}`;
    if (loadingProxy) return;
    setLoadingProxy(key);
    try {
      await handleProxyVote(memberId, vote);
    } catch (err) {
      setShakeProxy(key);
      setTimeout(() => setShakeProxy(null), 500);
      showToast(err instanceof Error ? err.message : "대리 투표에 실패했습니다.", "error");
    } finally {
      setLoadingProxy(null);
    }
  }

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">투표 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-11 items-center gap-2.5 rounded-lg border border-border bg-[hsl(var(--secondary)_/_0.5)] px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground translate-y-[0.5px]" />
          <input type="text" placeholder="이름 검색" value={voteSearch}
            onChange={(e) => setVoteSearch(e.target.value)} autoComplete="off"
            className="h-full w-full border-0 bg-transparent text-sm leading-none placeholder:text-muted-foreground focus:outline-none" />
        </div>

        <div className="flex items-center gap-2">
          {([{ v: "all" as const, l: "전체" }, { v: "unvoted" as const, l: "미투표" }]).map(({ v, l }) => (
            <Button key={v} variant={voteFilter === v ? "default" : "secondary"} size="sm" onClick={() => setVoteFilter(v)}
              className={cn("relative h-9 rounded-lg px-3 text-xs", voteFilter === v && "bg-primary text-primary-foreground")}>
              {l}
              {v === "unvoted" && noVoteCount > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 bg-destructive text-destructive-foreground text-[12px] px-1.5 min-w-[18px] h-[18px]">{noVoteCount}</Badge>
              )}
            </Button>
          ))}
          {([
            { key: "name", cycle: ["none", "name-asc", "name-desc"] as string[], labels: ["이름순", "이름 ↑", "이름 ↓"] },
            { key: "time", cycle: ["none", "time-asc", "time-desc"] as string[], labels: ["투표순", "투표 ↑", "투표 ↓"] },
          ]).map(({ key, cycle, labels }) => {
            const idx = cycle.indexOf(voteSortBy);
            const isActive = idx > 0;
            return (
              <button key={key} type="button"
                onClick={() => { const next = idx < 0 ? 1 : (idx + 1) % 3; setVoteSortBy(cycle[next] as typeof voteSortBy); }}
                className={cn("h-9 rounded-lg px-3 text-xs font-medium transition-colors",
                  isActive ? "bg-secondary text-foreground" : "bg-[hsl(var(--secondary)_/_0.5)] text-muted-foreground hover:text-foreground"
                )}>
                {isActive ? labels[idx] : labels[0]}
              </button>
            );
          })}
        </div>

        <ul className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain" role="list">
          {[...visibleRoster].filter((m) => {
            if (exemptions[m.id]) return false;
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
                !currentVote ? "bg-[hsl(var(--destructive)_/_0.1)] border border-destructive/30" : "bg-[hsl(var(--secondary)_/_0.5)]"
              )}>
                <span className={cn("text-sm font-medium", !currentVote && "text-destructive")}>{member.name}</span>
                <div className="flex gap-1" role="radiogroup">
                  {([{ value: "ATTEND" as const, label: "참석" }, { value: "MAYBE" as const, label: "미정" }, { value: "ABSENT" as const, label: "불참" }]).map((opt) => {
                    const proxyKey = `${member.memberId}:${opt.value}`;
                    const isLoading = loadingProxy === proxyKey;
                    const isShaking = shakeProxy === proxyKey;
                    return (
                      <button key={opt.value} role="radio" aria-checked={currentVote === opt.value}
                        disabled={!!loadingProxy}
                        className={cn("min-h-[32px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center gap-1",
                          currentVote === opt.value ? styles[opt.value].active : styles[opt.value].inactive,
                          loadingProxy && !isLoading && "opacity-50",
                          isShaking && "animate-shake ring-2 ring-destructive"
                        )}
                        onClick={() => handleProxyVoteWithFeedback(member.memberId, opt.value)}>
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {noVoteCount > 0 && (
          <Button
            className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-[hsl(var(--primary)_/_0.9)]"
            disabled={nudgeLoading}
            onClick={() => runNudge(async () => {
              try {
                const res = await fetch("/api/push/vote-nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: match.id }) });
                const data = await res.json();
                showToast(`미투표자 ${data.unvoted ?? 0}명에게 알림을 보냈습니다`);
              } catch { showToast("알림 발송에 실패했습니다", "error"); }
            })}
          >
            <Bell className="mr-2 h-4 w-4" />{nudgeLoading ? "발송 중..." : `미투표 ${noVoteCount}명에게 알림 보내기`}
          </Button>
        )}
        {/* 휴면 회원 (운영진 뷰) */}
        {dormantIds.size > 0 && (
          <div className="border-t border-border/30 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">휴면 ({dormantIds.size}명)</p>
            <div className="flex flex-wrap gap-1.5">
              {baseRoster.filter((m) => dormantIds.has(m.id)).map((m) => {
                const info = exemptions[m.id];
                return (
                  <Badge key={m.id} className="border-0 font-medium bg-[hsl(var(--secondary)_/_0.5)] text-muted-foreground/60">
                    {DORMANT_ICON[info?.type] ?? ""} {m.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const MatchVoteStaffPanel = memo(MatchVoteStaffPanelInner);
export default MatchVoteStaffPanel;
