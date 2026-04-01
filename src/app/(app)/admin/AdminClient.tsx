"use client";

import { useApi } from "@/lib/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield, Users, Activity, UserPlus } from "lucide-react";

// ── Types ──────────────────────────────────────────────

type TeamDetail = {
  id: string;
  name: string;
  sportType: string;
  isSearchable: boolean;
  createdAt: string;
  memberCount: number;
  matchCount: number;
  lastMatch: string | null;
  postCount: number;
  pendingRequests: number;
  status: "active" | "dormant" | "unused";
};

type PendingRequest = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  createdAt: string;
};

type AdminStats = {
  overview: {
    totalTeams: number;
    totalUsers: number;
    profileComplete: number;
    newUsersThisWeek: number;
    totalMatches: number;
    totalPosts: number;
    activeTeams: number;
    pendingJoinRequests: number;
  };
  teams: TeamDetail[];
  pendingRequests: PendingRequest[];
};

const emptyData: AdminStats = {
  overview: {
    totalTeams: 0,
    totalUsers: 0,
    profileComplete: 0,
    newUsersThisWeek: 0,
    totalMatches: 0,
    totalPosts: 0,
    activeTeams: 0,
    pendingJoinRequests: 0,
  },
  teams: [],
  pendingRequests: [],
};

// ── Helpers ────────────────────────────────────────────

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEMO_TEAM_NAME = "FC DEMO";

// ── Skeleton ───────────────────────────────────────────

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Additional summary row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────

export default function AdminClient() {
  const { data, loading, error, refetch } = useApi<AdminStats>(
    "/api/admin/stats",
    emptyData
  );

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-lg sm:text-2xl font-bold uppercase flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            관리자 대시보드
          </h1>
        </div>
        <AdminSkeleton />
      </div>
    );
  }

  const { overview, teams, pendingRequests } = data;
  const profileRate =
    overview.totalUsers > 0
      ? Math.round((overview.profileComplete / overview.totalUsers) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg sm:text-2xl font-bold uppercase flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          관리자 대시보드
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </Button>
      </div>

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
              <p className="text-sm text-muted-foreground">전체 유저</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{overview.totalUsers}</p>
            <p className="text-xs text-muted-foreground">
              프로필 완료 {overview.profileComplete}명 ({profileRate}%)
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
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${profileRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Team Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>팀별 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">팀명</th>
                  <th className="py-2 pr-4 font-medium">종목</th>
                  <th className="py-2 pr-4 font-medium text-right">멤버</th>
                  <th className="py-2 pr-4 font-medium text-right">경기</th>
                  <th className="py-2 pr-4 font-medium">최근 경기</th>
                  <th className="py-2 pr-4 font-medium text-right">게시글</th>
                  <th className="py-2 font-medium text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium">
                      <span className="flex items-center gap-1.5">
                        {team.name}
                        {team.name === DEMO_TEAM_NAME && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                          >
                            데모
                          </Badge>
                        )}
                        {team.pendingRequests > 0 && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0">
                            가입 {team.pendingRequests}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {team.sportType === "FUTSAL" ? "풋살" : "축구"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {team.memberCount}명
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {team.matchCount}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">
                      {team.lastMatch ? formatDate(team.lastMatch) : "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {team.postCount}
                    </td>
                    <td className="py-2.5 text-center">
                      <Badge
                        variant={team.status === "active" ? "success" : team.status === "dormant" ? "warning" : "secondary"}
                        className={team.status === "unused" ? "text-destructive border-destructive/30" : ""}
                      >
                        {team.status === "active" ? "활성" : team.status === "dormant" ? "휴면" : "미사용"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
