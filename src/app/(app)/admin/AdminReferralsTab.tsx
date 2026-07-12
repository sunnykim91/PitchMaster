"use client";

import { useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ReferralRow = {
  id: string;
  status: "PENDING" | "ACTIVATED" | "REWARDED" | "VOID";
  created_at: string;
  activated_at: string | null;
  rewarded_at: string | null;
  reward_note: string | null;
  referred_team_id: string | null;
  referrer: { name: string | null; phone: string | null } | null;
  referred: { name: string | null } | null;
  team: { name: string | null } | null;
  stats: { completedMatches: number; linkedMembers: number; totalMembers: number };
};

/** 활성화 게이트: 완료경기≥1 && 카카오 연동멤버≥3 */
const MIN_LINKED = 3;

const STATUS_LABEL: Record<ReferralRow["status"], { label: string; cls: string }> = {
  PENDING: { label: "진행중", cls: "text-muted-foreground" },
  ACTIVATED: { label: "지급 대기", cls: "text-[hsl(var(--warning))]" },
  REWARDED: { label: "지급 완료", cls: "text-[hsl(var(--success))]" },
  VOID: { label: "무효", cls: "text-muted-foreground line-through" },
};

function fmt(d: string | null): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "-";
  }
}

export function AdminReferralsTab() {
  const { data, loading, refetch } = useApi<{ referrals: ReferralRow[] }>("/api/admin/referrals", { referrals: [] });
  const [busy, setBusy] = useState<string | null>(null);

  async function mark(id: string, action: "reward" | "void") {
    setBusy(id);
    await apiMutate("/api/admin/referrals", "PATCH", { id, action });
    await refetch();
    setBusy(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const refs = data.referrals;
  const pendingReward = refs.filter((r) => r.status === "ACTIVATED");
  const others = refs.filter((r) => r.status !== "ACTIVATED");

  const counts = {
    total: refs.length,
    pending: refs.filter((r) => r.status === "PENDING").length,
    toReward: pendingReward.length,
    rewarded: refs.filter((r) => r.status === "REWARDED").length,
  };

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "전체", value: counts.total },
          { label: "진행중", value: counts.pending },
          { label: "지급 대기", value: counts.toReward, hl: "text-[hsl(var(--warning))]" },
          { label: "지급 완료", value: counts.rewarded, hl: "text-[hsl(var(--success))]" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className={cn("text-2xl font-bold", s.hl)}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 지급 대기 — 활성화됐고 아직 안 준 것 */}
      <div>
        <h2 className="text-sm font-bold mb-2">🎁 지급 대기 ({pendingReward.length})</h2>
        {pendingReward.length === 0 ? (
          <p className="text-xs text-muted-foreground">지급할 추천이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {pendingReward.map((r) => {
              const s = r.stats ?? { completedMatches: 0, linkedMembers: 0, totalMembers: 0 };
              return (
              <Card key={r.id} className="border-[hsl(var(--warning)_/_0.3)]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {r.referrer?.name ?? "?"} <span className="text-muted-foreground font-normal">→ {r.team?.name ?? r.referred?.name ?? "?"} 활성화</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        연락처 {r.referrer?.phone ?? "없음"} · 활성 {fmt(r.activated_at)}
                      </div>
                      {/* 검수 신호 — 진짜 팀인지 판단 (연동멤버=실제 가입자, 완료경기=활동) */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                          연동 {s.linkedMembers}명
                        </span>
                        <span className="text-muted-foreground">전체 {s.totalMembers}명</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">완료경기 {s.completedMatches}</span>
                        {s.linkedMembers >= MIN_LINKED && s.completedMatches >= 1 ? (
                          <span className="text-[hsl(var(--success))]">✓ 기준 충족</span>
                        ) : (
                          <span className="text-[hsl(var(--warning))]">⚠ 확인 필요</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" disabled={busy === r.id} onClick={() => mark(r.id, "reward")}>
                        지급 완료
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => mark(r.id, "void")}>
                        무효
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 전체 이력 */}
      <div>
        <h2 className="text-sm font-bold mb-2">전체 이력 ({others.length})</h2>
        {others.length === 0 ? (
          <p className="text-xs text-muted-foreground">이력이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {others.map((r) => {
              const st = STATUS_LABEL[r.status];
              const s = r.stats ?? { completedMatches: 0, linkedMembers: 0, totalMembers: 0 };
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate">
                    {r.referrer?.name ?? "?"} → {r.team?.name ?? r.referred?.name ?? "가입만"}
                    {r.referred_team_id && (
                      <span className="text-muted-foreground"> · 연동{s.linkedMembers}/경기{s.completedMatches}</span>
                    )}
                  </span>
                  <span className={cn("shrink-0 font-semibold", st.cls)}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
