"use client";

import { useMemo, useState } from "react";
import { Star, MessageCircle, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/useApi";
import { cn, formatTime } from "@/lib/utils";
import PlayerRatingDialog from "./PlayerRatingDialog";
import type { PlayerRating, PlayerRatingsResponse } from "./types";

interface Player {
  id: string;
  name: string;
}

interface Props {
  matchId: string;
  /** 평가 대상 후보 — 참석한 회원만 (용병 제외 권장) */
  candidates: Player[];
  /** 현재 viewer */
  viewerUserId: string;
  /** STAFF+ 여부 (입력·수정·삭제 권한) */
  canRate: boolean;
}

/**
 * 운영진 단방향 회원 평점·코멘트 카드.
 * 토글 ON 팀에서만 렌더 (호출자가 가드).
 */
export default function PlayerRatingCard({
  matchId,
  candidates,
  viewerUserId,
  canRate,
}: Props) {
  const { data, refetch } = useApi<PlayerRatingsResponse>(
    `/api/player-ratings?matchId=${encodeURIComponent(matchId)}`,
    { ratings: [] },
  );

  const [editingFor, setEditingFor] = useState<{ rateeId: string; rateeName: string; existing: PlayerRating | null } | null>(null);

  // ratee_id → 본인이 남긴 평가 (수정 진입용)
  const myRatingByRatee = useMemo(() => {
    const m = new Map<string, PlayerRating>();
    for (const r of data.ratings) {
      if (r.rater_id === viewerUserId) m.set(r.ratee_id, r);
    }
    return m;
  }, [data.ratings, viewerUserId]);

  // ratee_id → 전체 평가 묶음 (평점 평균·코멘트 표시)
  const ratingsByRatee = useMemo(() => {
    const m = new Map<string, PlayerRating[]>();
    for (const r of data.ratings) {
      const arr = m.get(r.ratee_id) ?? [];
      arr.push(r);
      m.set(r.ratee_id, arr);
    }
    return m;
  }, [data.ratings]);

  function handleOpenDialog(rateeId: string, rateeName: string) {
    if (!canRate) return;
    const existing = myRatingByRatee.get(rateeId) ?? null;
    setEditingFor({ rateeId, rateeName, existing });
  }

  async function handleSaved() {
    await refetch();
  }

  async function handleClose() {
    setEditingFor(null);
    await refetch();
  }

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Star className="h-4 w-4 text-[hsl(var(--warning))]" fill="currentColor" />
          회원 평점
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {canRate
            ? "운영진이 회원별 평점·코멘트를 남깁니다. 코멘트는 본인에게 달린 것만 본인이 봅니다."
            : "본인에 달린 평점·코멘트를 볼 수 있습니다. 다른 회원의 코멘트는 비공개입니다."}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {candidates.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            참석자 정보가 없어요.
          </p>
        ) : (
          candidates.map((player) => {
            const rows = ratingsByRatee.get(player.id) ?? [];
            const count = rows.length;
            const avg =
              count > 0
                ? Math.round((rows.reduce((s, r) => s + Number(r.score), 0) / count) * 10) / 10
                : null;
            const myRow = myRatingByRatee.get(player.id) ?? null;
            const isViewerRatee = player.id === viewerUserId;

            return (
              <div
                key={player.id}
                className="rounded-xl border border-border/40 bg-card/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{player.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {count > 0
                        ? `${count}명 평가 · 평균 ${avg?.toFixed(1)}`
                        : "아직 평가 없음"}
                    </p>
                  </div>
                  {canRate && (
                    <Button
                      type="button"
                      size="sm"
                      variant={myRow ? "outline" : "default"}
                      className="h-8 text-xs gap-1"
                      onClick={() => handleOpenDialog(player.id, player.name)}
                    >
                      {myRow ? (
                        <>
                          <Pencil className="h-3.5 w-3.5" />
                          내 평점 수정
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          평가하기
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {rows.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {rows.map((row) => {
                      const raterName = row.rater?.name ?? "운영진";
                      const isMyRow = row.rater_id === viewerUserId;
                      const canEdit = canRate;
                      const showComment = row.comment !== null && row.comment.length > 0;
                      return (
                        <li
                          key={row.id}
                          className={cn(
                            "flex items-start justify-between gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                              <span className="font-bold tabular-nums text-foreground">
                                {Number(row.score).toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">
                                {raterName}
                                {isMyRow && " (나)"}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatTime(row.created_at)}
                              </span>
                            </div>
                            {showComment ? (
                              <p className="mt-0.5 flex items-start gap-1 text-[12.5px] leading-snug text-foreground/90">
                                <MessageCircle className="mt-[2px] h-3 w-3 shrink-0 text-muted-foreground" />
                                <span>{row.comment}</span>
                              </p>
                            ) : !canRate && !isViewerRatee ? (
                              <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                                코멘트 비공개
                              </p>
                            ) : null}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFor({
                                  rateeId: row.ratee_id,
                                  rateeName: player.name,
                                  existing: row,
                                });
                              }}
                              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary"
                              aria-label="평점 수정"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {editingFor && (
        <PlayerRatingDialog
          matchId={matchId}
          rateeId={editingFor.rateeId}
          rateeName={editingFor.rateeName}
          existing={editingFor.existing}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      )}
    </Card>
  );
}
