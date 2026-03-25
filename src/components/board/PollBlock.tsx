"use client";

import { memo } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import type { Poll } from "@/app/(app)/board/BoardClient";

export interface PollBlockProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  votingOptionId: string | null;
}

export const PollBlock = memo(function PollBlock({ poll, onVote, votingOptionId }: PollBlockProps) {
  const isPollExpired = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const hasVoted = !!poll.myVote;

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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{poll.totalVotes}명 투표</span>
        {poll.endsAt && (
          <>
            <span>&middot;</span>
            <span>{isPollExpired ? "마감됨" : `${relativeTime(poll.endsAt)} 마감`}</span>
          </>
        )}
      </div>
    </div>
  );
});
