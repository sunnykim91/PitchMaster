"use client";

import { memo, useState } from "react";
import { BarChart3, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Poll } from "@/app/(app)/board/BoardClient";

export interface PollBlockProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll?: (pollId: string) => void;
  isStaff?: boolean;
  votingOptionId: string | null;
}

type VoteDetail = {
  options: { id: string; label: string; voters: { name: string }[] }[];
  notVoted: { name: string }[];
  totalMembers: number;
  totalVoted: number;
};

export const PollBlock = memo(function PollBlock({ poll, onVote, onClosePoll, isStaff, votingOptionId }: PollBlockProps) {
  const isPollExpired = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const hasVoted = !!poll.myVote;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<VoteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function handleOpenDetail() {
    setDetailOpen(true);
    if (detail) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/posts/vote/detail?pollId=${poll.id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{poll.question}</span>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0
            ? Math.round((option.votes / poll.totalVotes) * 100)
            : 0;
          const isMyVote = poll.myVote === option.id;
          const showResults = hasVoted || isPollExpired;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isPollExpired || votingOptionId === option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={cn(
                "relative w-full text-left rounded-lg px-3 py-2.5 text-sm transition-all overflow-hidden",
                showResults
                  ? "bg-muted/50"
                  : "bg-muted/30 hover:bg-muted/60 active:scale-[0.99]",
                isMyVote && "ring-1 ring-primary/50",
                isPollExpired && "opacity-70 cursor-default"
              )}
            >
              {/* Result bar */}
              {showResults && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-lg",
                    isMyVote ? "bg-primary/15" : "bg-muted-foreground/8"
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {!showResults && (
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0",
                      isMyVote ? "border-primary bg-primary" : "border-muted-foreground/40"
                    )} />
                  )}
                  <span className={cn(
                    "truncate",
                    isMyVote && "font-semibold"
                  )}>
                    {option.label}
                  </span>
                </div>
                {showResults && (
                  <span className={cn(
                    "text-xs shrink-0 tabular-nums",
                    isMyVote ? "font-bold text-primary" : "text-muted-foreground"
                  )}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{poll.totalVotes}명 투표</span>
          {isPollExpired ? (
            <>
              <span>&middot;</span>
              <span>마감됨</span>
            </>
          ) : poll.endsAt ? (
            <>
              <span>&middot;</span>
              <span>{relativeTime(poll.endsAt)} 마감</span>
            </>
          ) : null}
          {isStaff && !isPollExpired && onClosePoll && (
            <>
              <span>&middot;</span>
              <button
                type="button"
                onClick={() => onClosePoll(poll.id)}
                className="text-[hsl(var(--loss))] hover:underline font-medium"
              >
                투표 마감
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenDetail}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users className="h-3 w-3" />
          투표 현황
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* 투표 현황 Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-0">
          <SheetHeader className="text-left px-5 pb-3 border-b border-border/30">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              투표 현황
              {detail && (
                <span className="text-xs font-normal text-muted-foreground">
                  {detail.totalVoted}/{detail.totalMembers}명 참여
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 px-5 pb-5">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {detail.options.map((opt) => (
                  <div key={opt.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.voters.length}명</span>
                    </div>
                    {opt.voters.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {opt.voters.map((v, i) => (
                          <span key={i} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {v.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/50">없음</p>
                    )}
                  </div>
                ))}

                {detail.notVoted.length > 0 && (
                  <div className="border-t border-border/30 pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-muted-foreground">미투표</span>
                      <span className="text-xs text-muted-foreground">{detail.notVoted.length}명</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.notVoted.map((v, i) => (
                        <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                          {v.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">데이터를 불러올 수 없습니다.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
