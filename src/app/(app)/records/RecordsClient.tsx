"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, ArrowUpDown, ArrowDown } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import dynamic from "next/dynamic";

const PlayerRadarChart = dynamic(() => import("@/components/charts/PlayerRadarChart"), { ssr: false });
const BarRankingChart = dynamic(() => import("@/components/charts/BarRankingChart"), { ssr: false });

type Season = {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

type RecordStat = {
  memberId: string;
  memberName: string;
  goals: number;
  assists: number;
  mvp: number;
  attendanceRate: number;
  preferredPositions: string[];
};

function mapSeason(raw: Record<string, unknown>): Season {
  return {
    id: String(raw.id),
    teamId: String(raw.team_id ?? ""),
    name: String(raw.name),
    startDate: String(raw.start_date),
    endDate: String(raw.end_date),
    isActive: Boolean(raw.is_active),
    createdAt: String(raw.created_at ?? ""),
  };
}

function mapRecord(raw: Record<string, unknown>): RecordStat {
  return {
    memberId: String(raw.memberId ?? raw.member_id ?? ""),
    memberName: String(raw.name ?? raw.member_name ?? ""),
    goals: Number(raw.goals ?? 0),
    assists: Number(raw.assists ?? 0),
    mvp: Number(raw.mvp ?? 0),
    attendanceRate: Number(raw.attendanceRate ?? raw.attendance_rate ?? 0),
    preferredPositions: Array.isArray(raw.preferredPositions ?? raw.preferred_positions)
      ? (raw.preferredPositions ?? raw.preferred_positions) as string[]
      : [],
  };
}

type TeamRecord = {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recent5: ("W" | "D" | "L")[];
};

type InitialData = {
  seasons: Record<string, unknown>[];
  activeSeasonId?: string | null;
  records?: Record<string, unknown>[];
  teamRecord?: TeamRecord;
};

export default function RecordsClient({
  userId,
  userRole,
  initialData,
}: {
  userId: string;
  userRole?: Role;
  initialData?: InitialData;
}) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  // ── Seasons (SSR 데이터 사용) ──
  const {
    data: seasonsPayload,
    loading: loadingSeasons,
    error: seasonsError,
    refetch: refetchSeasons,
  } = useApi<{ seasons: Record<string, unknown>[] }>(
    "/api/seasons",
    { seasons: initialData?.seasons ?? [] },
    { skip: !!initialData }
  );

  const seasons: Season[] = useMemo(
    () => seasonsPayload.seasons.map(mapSeason),
    [seasonsPayload]
  );

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const [seasonId, setSeasonId] = useState<string>(initialData?.activeSeasonId ?? "");

  // 기간 필터: 년/반기/분기
  type PeriodType = "season" | "year" | "h1" | "h2" | "q1" | "q2" | "q3" | "q4";
  const [periodType, setPeriodType] = useState<PeriodType>("season");
  const PERIOD_LABELS: Record<PeriodType, string> = {
    season: "시즌 전체",
    year: "연간",
    h1: "상반기",
    h2: "하반기",
    q1: "1분기",
    q2: "2분기",
    q3: "3분기",
    q4: "4분기",
  };

  // 선택한 시즌의 연도 기준으로 기간 계산
  const periodYear = useMemo(() => {
    const season = seasons.find((s) => s.id === seasonId);
    if (season?.startDate) return parseInt(season.startDate.slice(0, 4));
    return new Date().getFullYear();
  }, [seasonId, seasons]);

  const periodDateRange = useMemo((): { startDate: string; endDate: string } | null => {
    if (periodType === "season") return null; // use seasonId
    const y = periodYear;
    const ranges: Record<Exclude<PeriodType, "season">, [string, string]> = {
      year: [`${y}-01-01`, `${y}-12-31`],
      h1: [`${y}-01-01`, `${y}-06-30`],
      h2: [`${y}-07-01`, `${y}-12-31`],
      q1: [`${y}-01-01`, `${y}-03-31`],
      q2: [`${y}-04-01`, `${y}-06-30`],
      q3: [`${y}-07-01`, `${y}-09-30`],
      q4: [`${y}-10-01`, `${y}-12-31`],
    };
    const [s, e] = ranges[periodType as Exclude<PeriodType, "season">];
    return { startDate: s, endDate: e };
  }, [periodType, periodYear]);

  // Sync seasonId when seasons load (SSR 없는 경우)
  useEffect(() => {
    if (seasons.length > 0 && !seasonId) {
      setSeasonId(activeSeason?.id ?? seasons[0].id);
    }
  }, [seasons, seasonId, activeSeason]);

  // ── Records (SSR 데이터 사용, 시즌 변경 시 클라이언트 fetch) ──
  const isInitialSeason = seasonId === (initialData?.activeSeasonId ?? "") && periodType === "season";
  const recordsUrl = useMemo(() => {
    if (periodDateRange) {
      return `/api/records?startDate=${periodDateRange.startDate}&endDate=${periodDateRange.endDate}`;
    }
    return seasonId ? `/api/records?seasonId=${seasonId}` : "/api/records";
  }, [seasonId, periodDateRange]);

  const {
    data: recordsPayload,
    loading: loadingRecords,
  } = useApi<{ records: Record<string, unknown>[] }>(
    recordsUrl,
    { records: (isInitialSeason && initialData?.records) ? initialData.records : [] },
    { skip: (!seasonId && !periodDateRange) || (isInitialSeason && !!initialData?.records?.length) },
  );

  // SSR 초기 데이터 → 시즌 변경 시 API fetch로 전환
  const [initialRecordsUsed, setInitialRecordsUsed] = useState(false);
  const effectiveRecords = useMemo(() => {
    // SSR 데이터가 있고 아직 초기 시즌이면 SSR 데이터 사용
    if (isInitialSeason && initialData?.records?.length && !initialRecordsUsed) {
      return initialData.records;
    }
    return recordsPayload.records;
  }, [isInitialSeason, initialData, initialRecordsUsed, recordsPayload]);

  const stats: RecordStat[] = useMemo(
    () => (effectiveRecords ?? []).map(mapRecord),
    [effectiveRecords]
  );

  const season = seasons.find((s) => s.id === seasonId) ?? activeSeason;

  const myStats = stats.find((item) => item.memberId === userId) ?? {
    memberId: userId,
    memberName: "",
    goals: 0,
    assists: 0,
    mvp: 0,
    attendanceRate: 0,
    preferredPositions: [],
  };

  const topGoals = useMemo(() => [...stats].sort((a, b) => b.goals - a.goals).slice(0, 3), [stats]);
  const topAssists = useMemo(() => [...stats].sort((a, b) => b.assists - a.assists).slice(0, 3), [stats]);
  const topMvp = useMemo(() => [...stats].sort((a, b) => b.mvp - a.mvp).slice(0, 3), [stats]);

  const [sortKey, setSortKey] = useState<"points" | "goals" | "assists" | "mvp" | "attendanceRate">("points");
  const allStats = useMemo(() => {
    const withPoints = stats.map((s) => ({ ...s, points: s.goals + s.assists }));
    return [...withPoints].sort((a, b) => {
      if (sortKey === "points") return b.points - a.points;
      if (sortKey === "attendanceRate") return b.attendanceRate - a.attendanceRate;
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
  }, [stats, sortKey]);

  const teamAttendance = stats.length
    ? stats.reduce((sum, item) => sum + item.attendanceRate, 0) / stats.length
    : 0;

  function handleSeasonChange(value: string) {
    setSeasonId(value);
    setPeriodType("season"); // 시즌 변경 시 기간 필터 초기화
    setInitialRecordsUsed(true); // SSR 데이터 대신 API fetch 사용
  }

  function handlePeriodChange(value: string) {
    setPeriodType(value as PeriodType);
    setInitialRecordsUsed(true);
  }

  // 현재 표시 중인 기간 텍스트
  const displayPeriod = useMemo(() => {
    if (periodDateRange) {
      return `${periodDateRange.startDate} ~ ${periodDateRange.endDate}`;
    }
    return season ? `${season.startDate} ~ ${season.endDate}` : "";
  }, [periodDateRange, season]);

  // useApi already refetches when URL changes (seasonId in URL),
  // so no explicit refetch useEffect needed.

  if (seasonsError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {seasonsError}</span>
          <Button variant="outline" size="sm" onClick={refetchSeasons}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  if (loadingSeasons) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* ── Row 0: 팀 전적 ── */}
      {initialData?.teamRecord && (initialData.teamRecord.wins + initialData.teamRecord.draws + initialData.teamRecord.losses) > 0 && (() => {
        const tr = initialData.teamRecord;
        const total = tr.wins + tr.draws + tr.losses;
        const diff = tr.goalsFor - tr.goalsAgainst;
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">팀 전적</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="type-stat text-[hsl(var(--win))]">{tr.wins}승</span>
                    <span className="type-stat text-muted-foreground">{tr.draws}무</span>
                    <span className="type-stat text-[hsl(var(--loss))]">{tr.losses}패</span>
                  </div>
                  <Badge variant="outline" className="text-xs">승률 {Math.round((tr.wins / total) * 100)}%</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>득점 <strong className="text-foreground">{tr.goalsFor}</strong></span>
                  <span>실점 <strong className="text-foreground">{tr.goalsAgainst}</strong></span>
                  <span>득실차 <strong className={diff >= 0 ? "text-[hsl(var(--win))]" : "text-[hsl(var(--loss))]"}>{diff >= 0 ? "+" : ""}{diff}</strong></span>
                </div>
              </div>
              {tr.recent5.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">최근 {tr.recent5.length}경기</span>
                  {tr.recent5.map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                        r === "W" ? "bg-[hsl(var(--win)/0.2)] text-[hsl(var(--win))]" : r === "D" ? "bg-muted text-muted-foreground" : "bg-[hsl(var(--loss)/0.2)] text-[hsl(var(--loss))]"
                      )}
                    >
                      {r === "W" ? "승" : r === "D" ? "무" : "패"}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Row 1: 내 기록 + 시즌 요약 (PC: 2단) ── */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {/* 내 기록 */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
                내 기록
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              시즌
              <Select value={seasonId} onValueChange={handleSeasonChange}>
                <SelectTrigger className="w-auto min-w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-0 p-4">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                  { label: "득점", value: myStats.goals, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.1)]" },
                  { label: "어시스트", value: myStats.assists, color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/0.1)]" },
                  { label: "MVP", value: myStats.mvp, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/0.1)]" },
                  { label: "출석률", value: `${Math.round(myStats.attendanceRate * 100)}%`, color: "text-[hsl(var(--accent))]", bg: "bg-[hsl(var(--accent)/0.1)]" },
                ].map((item) => (
                  <div key={item.label} className={cn("card-stat", item.bg)}>
                    <p className="type-overline">{item.label}</p>
                    <p className={cn("mt-1 type-stat", item.color)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 시즌 요약 + 레이더 차트 */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              시즌 요약
            </CardTitle>
            <Select value={periodType} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-auto min-w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PERIOD_LABELS) as [PeriodType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {key === "season" ? (season?.name ?? label) : `${periodYear} ${label}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>기간: {displayPeriod}</p>
              <p>참여 인원: {stats.length}명</p>
              <p>평균 출석률: {Math.round(teamAttendance * 100)}%</p>
            </div>
            {!loadingRecords && (myStats.goals > 0 || myStats.assists > 0 || myStats.mvp > 0) && (
              <div className="mt-2">
                <PlayerRadarChart
                  goals={myStats.goals}
                  assists={myStats.assists}
                  mvp={myStats.mvp}
                  attendanceRate={myStats.attendanceRate}
                  maxGoals={Math.max(...stats.map((s) => s.goals), 1)}
                  maxAssists={Math.max(...stats.map((s) => s.assists), 1)}
                  maxMvp={Math.max(...stats.map((s) => s.mvp), 1)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: 팀 랭킹 (PC: 3열 가로 배치) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
            팀 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-secondary border-0 p-4">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : stats.length === 0 ? (
            <EmptyState icon={BarChart3} title="아직 기록이 없습니다" description="경기를 진행해보세요." />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {[{
                title: "득점왕", list: topGoals, key: "goals" as const, color: "#22c55e",
              }, {
                title: "어시스트왕", list: topAssists, key: "assists" as const, color: "#38bdf8",
              }, {
                title: "MVP왕", list: topMvp, key: "mvp" as const, color: "#f59e0b",
              }].map((group) => (
                <Card key={group.title} className="bg-secondary border-0 p-4">
                  <p className="text-sm font-bold">{group.title}</p>
                  <div className="mt-3 space-y-2">
                    {group.list.map((item, index) => (
                      <div
                        key={item.memberId}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {index === 0 ? (
                            <Badge variant="success" className="h-5 w-5 shrink-0 justify-center rounded-md px-0 py-0">
                              {index + 1}
                            </Badge>
                          ) : (
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                          <span className="truncate">{item.memberName ?? "-"}</span>
                        </span>
                        <span className="type-stat shrink-0 text-foreground">
                          {item[group.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {group.list.some((item) => item[group.key] > 0) && (
                    <div className="mt-3">
                      <BarRankingChart
                        data={group.list
                          .filter((item) => item[group.key] > 0)
                          .map((item) => ({ name: item.memberName ?? "-", value: item[group.key] }))}
                        color={group.color}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Row 3: 전체 회원 기록 (풀와이드 테이블) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
            전체 회원 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : allStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">아직 기록이 없습니다. 경기를 진행해보세요.</p>
            </div>
          ) : (
            <div className="relative">
            <div className="table-scroll-container overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="sticky left-0 z-1 bg-card pb-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="sticky left-8 z-1 bg-card pb-3 text-left font-medium text-muted-foreground">이름</th>
                    {([
                      { key: "points" as const, label: "공격포인트" },
                      { key: "goals" as const, label: "골" },
                      { key: "assists" as const, label: "어시" },
                      { key: "mvp" as const, label: "MVP" },
                      { key: "attendanceRate" as const, label: "출석률" },
                    ]).map((col) => (
                      <th
                        key={col.key}
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={sortKey === col.key ? "descending" : "none"}
                        className={cn(
                          "cursor-pointer pb-3 text-center font-medium transition hover:text-foreground",
                          sortKey === col.key ? "text-primary" : "text-muted-foreground"
                        )}
                        onClick={() => setSortKey(col.key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSortKey(col.key); } }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {allStats.map((s, i) => (
                    <tr key={s.memberId} className={cn(s.memberId === userId && "bg-primary/5")}>
                      <td className="sticky left-0 z-1 bg-card py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="sticky left-8 z-1 bg-card py-2.5 font-semibold max-w-[120px] truncate">{s.memberName || "-"}</td>
                      <td className="py-2.5 text-center font-bold text-primary">{s.points}</td>
                      <td className="py-2.5 text-center text-[hsl(var(--success))]">{s.goals}</td>
                      <td className="py-2.5 text-center text-[hsl(var(--info))]">{s.assists}</td>
                      <td className="py-2.5 text-center text-[hsl(var(--warning))]">{s.mvp}</td>
                      <td className="py-2.5 text-center text-[hsl(var(--accent))]">{Math.round(s.attendanceRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
