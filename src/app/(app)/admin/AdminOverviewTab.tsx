"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, UserPlus } from "lucide-react";
import type { AdminOverview } from "./admin.types";

export function AdminOverviewTab({ overview }: { overview: AdminOverview }) {
  const profileRate =
    overview.totalUsers > 0
      ? Math.round((overview.profileComplete / overview.totalUsers) * 100)
      : 0;
  const activeUserRate =
    overview.totalUsers > 0
      ? Math.round((overview.activeUsers / overview.totalUsers) * 100)
      : 0;
  const activeTeamRate =
    overview.totalTeams > 0
      ? Math.round((overview.activeTeams / overview.totalTeams) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* ── Summary Cards Row 1 ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">전체 팀</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{overview.totalTeams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">전체 회원</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{overview.totalUsers}</p>
            <p className="text-xs text-muted-foreground">
              활성 <span className="text-foreground font-medium">{overview.activeUsers}명</span> ({activeUserRate}%) · 프로필 {profileRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">이번 주 신규</p>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {overview.newUsersThisWeek}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">활성 팀 (14일)</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{overview.activeTeams}</p>
            <p className="text-xs text-muted-foreground">
              전체의 {activeTeamRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Summary Cards Row 2 ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">총 경기</p>
            <p className="mt-1 text-2xl font-bold">{overview.totalMatches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">총 게시글</p>
            <p className="mt-1 text-2xl font-bold">{overview.totalPosts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">대기 가입 신청</p>
            <p className="mt-1 text-2xl font-bold">
              {overview.pendingJoinRequests > 0 ? (
                <span className="text-[hsl(var(--warning))]">
                  {overview.pendingJoinRequests}
                </span>
              ) : (
                overview.pendingJoinRequests
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">프로필 완료율</p>
            <p className="mt-1 text-2xl font-bold">{profileRate}%</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--secondary)_/_0.5)]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${profileRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
