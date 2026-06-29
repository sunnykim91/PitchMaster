"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, UserPlus } from "lucide-react";
import type {
  PendingRequest,
  RecentSignupUser,
  RecentSignupTeam,
  SignupSourceCohort,
} from "./admin.types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

type Props = {
  recentSignups: { users: RecentSignupUser[]; teams: RecentSignupTeam[] };
  signupSourceCohorts: SignupSourceCohort[];
  pendingRequests: PendingRequest[];
};

export function AdminAcquisitionTab({ recentSignups, signupSourceCohorts, pendingRequests }: Props) {
  const cohortMaxSignups = Math.max(1, ...signupSourceCohorts.map((c) => c.signups));

  return (
    <div className="space-y-4">
      {/* ── 최근 3일 신규 가입 ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              신규 회원 (3일)
              <Badge variant="secondary" className="ml-auto">{recentSignups.users.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSignups.users.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">최근 3일 내 신규 가입자가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {recentSignups.users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate">{u.name}</span>
                      <span className={cn("text-xs truncate", u.teamName ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                        {u.teamName ?? "팀 없음"}
                      </span>
                      {!u.profileComplete && (
                        <Badge variant="outline" className="text-[12px] px-1 py-0 shrink-0">프로필 미완성</Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0" suppressHydrationWarning>{timeAgo(u.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              신규 팀 (3일)
              <Badge variant="secondary" className="ml-auto">{recentSignups.teams.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSignups.teams.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">최근 3일 내 생성된 팀이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {recentSignups.teams.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[12px] px-1 py-0 shrink-0">
                        {t.sportType === "FUTSAL" ? "풋살" : "축구"}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{t.memberCount}명</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0" suppressHydrationWarning>{timeAgo(t.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 가입 출처별 코호트 (30일) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            가입 출처별 코호트 (30일)
            <Badge variant="secondary" className="ml-auto">{signupSourceCohorts.length}개 채널</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signupSourceCohorts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">최근 30일 가입자가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">출처</th>
                    <th className="py-2 pr-4 font-medium text-right">가입</th>
                    <th className="py-2 pr-4 font-medium text-right">활성</th>
                    <th className="py-2 pr-4 font-medium text-right">활성률</th>
                    <th className="py-2 font-medium">분포</th>
                  </tr>
                </thead>
                <tbody>
                  {signupSourceCohorts.map((c) => {
                    const widthPct = Math.round((c.signups / cohortMaxSignups) * 100);
                    const rateColor =
                      c.activeRate >= 50 ? "text-[hsl(var(--success))]"
                      : c.activeRate >= 25 ? "text-[hsl(var(--warning))]"
                      : "text-muted-foreground";
                    const isUntracked = c.source === "(미추적)";
                    return (
                      <tr key={c.source} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className={cn("font-medium", isUntracked && "text-muted-foreground italic")}>
                            {c.source}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{c.signups}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{c.activeUsers}</td>
                        <td className={cn("py-2.5 pr-4 text-right tabular-nums font-medium", rateColor)}>
                          {c.activeRate}%
                        </td>
                        <td className="py-2.5 min-w-[80px]">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--secondary)_/_0.5)]">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                활성 = 14일 내 투표·골·게시글·회비·매치등록 등 흔적 있음. signup_source 추적 시작 2026-05-12.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Join Requests ── */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              대기 중 가입 신청 ({pendingRequests.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{req.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.teamName} · {timeAgo(req.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
