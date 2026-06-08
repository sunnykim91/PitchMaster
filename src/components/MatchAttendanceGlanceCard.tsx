"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendingPlayer } from "@/components/AutoFormationBuilder";

type RecentRow = {
  userId: string | null;
  memberId: string;
  attended: number;
  eligible: number;
  isNew: boolean;
  /** 경기별 상태 (왼쪽=최신). present=출석, late=지각, absent=결석, pre=합류전 */
  statuses: ("present" | "late" | "absent" | "pre")[];
};

/**
 * 참석자 최근 출석 카드 — 전술 탭, 감독·주장(STAFF+)만.
 * 스쿼드 짤 때 "이 인원이 요즘 잘 나오나"를 한눈에 보는 참고용.
 * 데이터는 /api/attendance/recent (최근 4경기 실제 출석). 신규(합류 표본 부족)는 별도 표시.
 * - 새 AI 아님(실제 출석 집계). 일반 회원에겐 노출 안 함(상위에서 canManage 게이트).
 */
export function MatchAttendanceGlanceCard({
  matchId,
  attendingPlayers,
}: {
  matchId: string;
  attendingPlayers: AttendingPlayer[];
}) {
  const [rows, setRows] = useState<RecentRow[] | null>(null);
  const [win, setWin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); // 항목 많아 기본 접힘 (feedback_card_collapse_pattern)

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attendance/recent?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setRows(d.members ?? []);
        setWin(d.window ?? 0);
      })
      .catch(() => { /* 조용히 무시 — 참고용 카드라 실패해도 화면 깨지지 않게 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading || !rows || win === 0) return null;

  const byMember = new Map<string, RecentRow>();
  const byUser = new Map<string, RecentRow>();
  for (const r of rows) {
    byMember.set(r.memberId, r);
    if (r.userId) byUser.set(r.userId, r);
  }
  const lookup = (p: AttendingPlayer): RecentRow | undefined =>
    (p.memberId ? byMember.get(p.memberId) : undefined) ??
    (p.userId ? byUser.get(p.userId) : undefined) ??
    byUser.get(p.id) ??
    byMember.get(p.id);

  const entries = attendingPlayers
    .filter((p) => !p.isGuest)
    .map((p) => ({ p, r: lookup(p) }))
    .filter((e): e is { p: AttendingPlayer; r: RecentRow } => !!e.r);

  const established = entries
    .filter((e) => !e.r.isNew)
    .sort((a, b) => a.r.attended / a.r.eligible - b.r.attended / b.r.eligible);
  const news = entries.filter((e) => e.r.isNew);

  if (established.length === 0 && news.length === 0) return null;

  const dotClass = (s: string) =>
    s === "present"
      ? "bg-[hsl(var(--success))]"
      : s === "late"
        ? "bg-[hsl(var(--warning))]"
        : "border border-muted-foreground/40"; // absent
  const colorOf = (pct: number) =>
    pct <= 25 ? "text-destructive" : pct <= 50 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]";

  const lowCount = established.filter((e) => e.r.attended / e.r.eligible <= 0.5).length;

  return (
    <Card className="rounded-xl border-border/30 overflow-hidden">
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between"
          aria-expanded={open}
        >
          <span className="text-sm font-semibold text-foreground">참석자 최근 출석</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            최근 {win}경기 · 감독·주장만
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </span>
        </button>

        {!open && (lowCount > 0 || news.length > 0) && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {lowCount > 0 && `최근 출석 50% 이하 ${lowCount}명`}
            {lowCount > 0 && news.length > 0 && " · "}
            {news.length > 0 && `신규 ${news.length}명`}
          </p>
        )}

        {open && (
          <>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />출석</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[hsl(var(--warning))]" />지각</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-muted-foreground/40" />결석</span>
              <span className="ml-auto">왼쪽=최신</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {established.map(({ p, r }) => {
                const pct = Math.round((r.attended / r.eligible) * 100);
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/90">{p.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {r.statuses.filter((s) => s !== "pre").map((s, i) => (
                          <span key={i} className={cn("h-2.5 w-2.5 rounded-full", dotClass(s))} />
                        ))}
                      </span>
                      <span className={cn("min-w-[2.4rem] text-right text-xs font-semibold tabular-nums", colorOf(pct))}>
                        {r.attended}/{r.eligible}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {news.length > 0 && (
              <div className="mt-3 border-t border-border/30 pt-2">
                <p className="mb-1 text-[11px] text-muted-foreground">신규 (최근 합류 — 출석 표본 부족)</p>
                <p className="text-xs text-muted-foreground/80">{news.map((e) => e.p.name).join(", ")}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
