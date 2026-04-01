"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowUpDown, ArrowDown, Download, Share2, Trophy } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/EmptyState";
import dynamic from "next/dynamic";

// 차트 로딩 인디케이터
const ChartSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const PlayerRadarChart = dynamic(() => import("@/components/charts/PlayerRadarChart"), {
  ssr: false,
  loading: ChartSpinner,
});
const BarRankingChart = dynamic(() => import("@/components/charts/BarRankingChart"), {
  ssr: false,
  loading: ChartSpinner,
});

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
  jerseyNumber: number | null;
  teamRole: string | null;
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
    jerseyNumber: (raw.jerseyNumber as number) ?? null,
    teamRole: (raw.teamRole as string) ?? null,
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
  const searchParams = useSearchParams();

  // ── Tab state ──
  type RecordsTab = "my" | "ranking" | "all";
  const validTabs: RecordsTab[] = ["my", "ranking", "all"];
  const tabFromUrl = searchParams.get("tab") as RecordsTab | null;
  const [activeTab, setActiveTabState] = useState<RecordsTab>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "my"
  );
  function setActiveTab(tab: RecordsTab) {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }
  const tabItems = [
    { key: "my" as const, label: "내 기록" },
    { key: "ranking" as const, label: "팀 랭킹" },
    { key: "all" as const, label: "전체 기록" },
  ];

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
  const ALL_TIME_KEY = "__ALL__";

  // Sync seasonId when seasons load (SSR 없는 경우)
  useEffect(() => {
    if (seasons.length > 0 && !seasonId) {
      setSeasonId(activeSeason?.id ?? seasons[0].id);
    }
  }, [seasons, seasonId, activeSeason]);

  // ── Records (SSR 데이터 사용, 시즌 변경 시 클라이언트 fetch) ──
  const isAllTime = seasonId === ALL_TIME_KEY;
  const isInitialSeason = seasonId === (initialData?.activeSeasonId ?? "") && !isAllTime;
  const recordsUrl = useMemo(() => {
    if (isAllTime) return "/api/records?mode=all";
    return seasonId ? `/api/records?seasonId=${seasonId}` : "/api/records";
  }, [seasonId, isAllTime]);

  // SSR 초기 데이터 → 시즌 변경 시 API fetch로 전환
  const [initialRecordsUsed, setInitialRecordsUsed] = useState(false);

  const {
    data: recordsPayload,
    loading: loadingRecords,
  } = useApi<{ records: Record<string, unknown>[] }>(
    recordsUrl,
    { records: (isInitialSeason && initialData?.records) ? initialData.records : [] },
    { skip: !seasonId || (isInitialSeason && !!initialData?.records?.length && !initialRecordsUsed) },
  );
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
    jerseyNumber: null,
    teamRole: null,
  };

  // 드릴다운 상태
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<"goals" | "assists" | "mvp" | "attendance" | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [detailMemberName, setDetailMemberName] = useState("");
  const [detailData, setDetailData] = useState<{ matchId: string; matchDate: string; opponentName: string; count: number; score?: string }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  async function openDetail(memberId: string, memberName: string, type: "goals" | "assists" | "mvp" | "attendance") {
    setDetailMemberId(memberId);
    setDetailMemberName(memberName);
    setDetailType(type);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ memberId, type });
      if (isAllTime) { /* 전체 통합은 시즌 필터 없이 */ }
      else if (seasonId) params.set("seasonId", seasonId);
      const res = await fetch(`/api/records/detail?${params}`, { credentials: "include" });
      const json = await res.json();
      setDetailData(json.details ?? []);
    } catch {
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const typeLabels: Record<string, string> = { goals: "골", assists: "어시스트", mvp: "MVP", attendance: "출석" };

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
    setInitialRecordsUsed(true);
  }

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
    <div className="grid gap-5 stagger-children min-w-0">
      {/* ── Tab Bar + Season Selector ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="기록 탭" className="flex flex-1">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => { setActiveTab(tab.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Select value={seasonId} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-auto min-w-[80px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TIME_KEY} className="font-bold">
                전체 통합
              </SelectItem>
              {seasons.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tab: 내 기록 ── */}
      <div className={activeTab === "my" ? "grid gap-5" : "hidden"}>
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
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
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
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              내 기록
            </CardTitle>
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
                ].map((item) => {
                  const isEmpty = item.value === 0 || item.value === "0%";
                  return (
                    <div key={item.label} className={cn("card-stat", isEmpty ? "" : item.bg)}>
                      <p className="type-overline">{item.label}</p>
                      <p className={cn("mt-1 type-stat", isEmpty ? "text-muted-foreground/40" : item.color)}>
                        {isEmpty ? "-" : item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          {/* 선수 카드 버튼 — TODO: 디자인 개선 후 활성화
          {!loadingRecords && !isAllTime && (
            <div className="px-4 sm:px-6 pb-4">
              <PlayerCardButton userId={userId} seasonId={seasonId} />
            </div>
          )}
          */}
        </Card>

        {/* 시즌 요약 + 레이더 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
              {isAllTime ? "통합 기록" : "시즌 요약"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>기간: {isAllTime ? "전체 시즌 통합" : season ? `${season.startDate} ~ ${season.endDate}` : ""}</p>
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

      </div>

      {/* ── Tab: 팀 랭킹 ── */}
      <div className={activeTab === "ranking" ? "grid gap-5" : "hidden"}>

      {/* 시즌 어워드 — TODO: 디자인 개선 후 활성화
      {!isAllTime && <SeasonAwardsCard seasonId={seasonId} />}
      */}

      {/* ── Row 2: 팀 랭킹 (PC: 3열 가로 배치) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
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
            <EmptyState
              icon={BarChart3}
              title="아직 기록이 없습니다"
              description="경기를 진행해보세요."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link href="/matches">경기 일정 보기</Link>
                </Button>
              }
            />
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
                          <span className={cn(
                            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                            index === 0 ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                              : index === 1 ? "bg-secondary text-foreground/60"
                              : "bg-secondary text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          <span className={cn("truncate", index === 0 && "font-bold text-foreground")}>{item.memberName ?? "-"}</span>
                        </span>
                        <span className="shrink-0 text-lg font-bold font-[family-name:var(--font-display)] text-foreground">
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

      </div>

      {/* ── Tab: 전체 기록 ── */}
      <div className={activeTab === "all" ? "grid gap-5" : "hidden"}>
      {/* ── Row 3: 전체 회원 기록 (풀와이드 테이블) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
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
            <EmptyState
              icon={BarChart3}
              title="아직 기록이 없습니다"
              description="경기를 진행하면 전체 회원 기록이 집계됩니다."
              action={<Button size="sm" variant="outline" asChild><Link href="/matches">경기 일정 보기</Link></Button>}
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">숫자를 탭하면 해당 경기 목록을 볼 수 있습니다.</p>
              {/* 모바일 카드 레이아웃 (sm 미만) */}
              <div className="block sm:hidden space-y-2">
                {allStats.map((s, i) => {
                  const isMe = s.memberId === userId;
                  const isTop3 = i < 3 && s.points > 0;
                  return (
                    <div
                      key={s.memberId}
                      className={cn(
                        "rounded-xl px-4 py-3 border border-border/40",
                        isMe && "bg-primary/8 border-primary/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-xs font-bold shrink-0",
                            isTop3 ? "text-[hsl(var(--warning))]" : "text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          {s.jerseyNumber !== null && (
                            <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-xs font-bold text-primary">#{s.jerseyNumber}</span>
                          )}
                          <span className="font-semibold text-sm truncate">{s.memberName || "-"}</span>
                          {s.teamRole === "CAPTAIN" && <Badge variant="warning" className="text-xs px-1 py-0 shrink-0">C</Badge>}
                          {s.teamRole === "VICE_CAPTAIN" && <Badge variant="secondary" className="text-xs px-1 py-0 shrink-0">VC</Badge>}
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">G+A {s.points}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-xs">
                        {([
                          { key: "goals" as const, label: "골", value: s.goals, color: "text-[hsl(var(--success))]" },
                          { key: "assists" as const, label: "어시", value: s.assists, color: "text-[hsl(var(--info))]" },
                          { key: "mvp" as const, label: "MVP", value: s.mvp, color: "text-[hsl(var(--warning))]" },
                          { key: "attendance" as const, label: "출석", value: Math.round(s.attendanceRate * 100), color: "text-primary", suffix: "%" },
                        ] as const).map((stat) => (
                          <button
                            key={stat.key}
                            type="button"
                            disabled={stat.key !== "attendance" ? stat.value === 0 : false}
                            onClick={() => openDetail(s.memberId, s.memberName, stat.key)}
                            className="hover:bg-secondary/50 rounded-lg py-1 transition-colors disabled:opacity-50 disabled:cursor-default cursor-pointer"
                          >
                            <p className="text-muted-foreground">{stat.label}</p>
                            <p className={cn("font-semibold underline decoration-dotted underline-offset-2", stat.color)}>{stat.value}{"suffix" in stat ? stat.suffix : ""}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 데스크탑 테이블 (sm 이상) */}
              <div className="relative hidden sm:block">
                <div className="table-scroll-container overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="sticky left-0 z-1 bg-card pb-3 text-left font-medium text-muted-foreground">#</th>
                        <th className="sticky left-8 z-1 bg-card pb-3 text-left font-medium text-muted-foreground">이름</th>
                        {([
                          { key: "points" as const, label: "G+A" },
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
                              "cursor-pointer py-3 min-h-[44px] text-center font-medium transition hover:text-foreground",
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
                      {allStats.map((s, i) => {
                        const isMe = s.memberId === userId;
                        const isTop3 = i < 3 && s.points > 0;
                        const stickyBg = isMe ? "bg-primary/8" : "bg-card";
                        return (
                          <tr key={s.memberId} className={cn(isMe && "[&>td]:bg-primary/8")}>
                            <td className={cn("sticky left-0 z-1 py-2.5", stickyBg, isTop3 ? "text-primary font-bold" : "text-muted-foreground")}>{i + 1}</td>
                            <td className={cn("sticky left-8 z-1 py-2.5 font-semibold max-w-[120px] truncate", stickyBg)}>
                              <span className="flex items-center gap-1">
                                {s.jerseyNumber !== null && <span className="text-xs text-primary font-bold">#{s.jerseyNumber}</span>}
                                {s.memberName || "-"}
                                {s.teamRole === "CAPTAIN" && <Badge variant="warning" className="text-xs px-1 py-0">C</Badge>}
                                {s.teamRole === "VICE_CAPTAIN" && <Badge variant="secondary" className="text-xs px-1 py-0">VC</Badge>}
                              </span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-primary">{s.points}</td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.goals === 0} onClick={() => openDetail(s.memberId, s.memberName, "goals")} className="text-[hsl(var(--success))] hover:underline disabled:no-underline disabled:cursor-default">{s.goals}</button></td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.assists === 0} onClick={() => openDetail(s.memberId, s.memberName, "assists")} className="text-[hsl(var(--info))] hover:underline disabled:no-underline disabled:cursor-default">{s.assists}</button></td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.mvp === 0} onClick={() => openDetail(s.memberId, s.memberName, "mvp")} className="text-[hsl(var(--warning))] hover:underline disabled:no-underline disabled:cursor-default">{s.mvp}</button></td>
                            <td className="py-2.5 text-center"><button type="button" onClick={() => openDetail(s.memberId, s.memberName, "attendance")} className="text-primary hover:underline">{Math.round(s.attendanceRate * 100)}%</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-card to-transparent md:hidden" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* ── 드릴다운 Sheet ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen} key="detail-sheet">
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-0">
          <SheetHeader className="text-left px-5 pb-3 border-b border-border/30">
            <p className="text-xs text-muted-foreground">{detailMemberName}</p>
            <SheetTitle className="flex items-center gap-2">
              {detailType ? typeLabels[detailType] : ""} 상세
              {!detailLoading && detailData.length > 0 && (
                <Badge variant="secondary" className="text-xs">{detailData.length}경기</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 px-3">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : detailData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">해당 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {detailData.map((d) => {
                  const [our, their] = (d.score ?? "0:0").split(":").map(Number);
                  const result = our > their ? "W" : our < their ? "L" : "D";
                  return (
                    <Link
                      key={d.matchId}
                      href={`/matches/${d.matchId}`}
                      onClick={() => setDetailOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-secondary/50 transition-colors"
                    >
                      {/* 승/무/패 인디케이터 */}
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        result === "W" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                          : result === "L" ? "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]"
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {result === "W" ? "승" : result === "L" ? "패" : "무"}
                      </span>
                      {/* 경기 정보 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{d.opponentName || "경기"}</span>
                          {d.score && (
                            <span className="shrink-0 text-xs font-bold text-muted-foreground">{d.score}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{d.matchDate}</p>
                      </div>
                      {/* 기록 수 */}
                      {detailType !== "attendance" && (
                        <span className={cn(
                          "shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold",
                          detailType === "goals" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                            : detailType === "assists" ? "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]"
                            : "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                        )}>
                          {d.count}{detailType === "goals" ? "골" : detailType === "assists" ? "어시" : "표"}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── 선수 카드 버튼 컴포넌트 ──
function PlayerCardButton({ userId, seasonId }: { userId: string; seasonId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    try {
      const url = `/api/player-card?memberId=${userId}&seasonId=${seasonId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage("선수 카드가 클립보드에 복사되었습니다");
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "player-card.png";
        link.click();
        URL.revokeObjectURL(link.href);
        setMessage("선수 카드가 저장되었습니다");
      }
    } catch {
      setMessage("카드 생성에 실패했습니다");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 2500);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          선수 카드
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => {
            const url = `${window.location.origin}/player/${userId}`;
            navigator.clipboard.writeText(url);
            setMessage("프로필 링크가 복사되었습니다");
          }}
        >
          <Share2 className="h-4 w-4" />
          프로필 공유
        </Button>
      </div>
      {message && (
        <p className="text-xs text-center text-muted-foreground animate-in fade-in">{message}</p>
      )}
    </div>
  );
}

// ── 시즌 어워드 카드 컴포넌트 ──
type Award = { name: string; value: string | number; label: string };
type AwardsData = {
  awards: Record<string, Award | null>;
  seasonName: string;
  teamName: string;
  totalMatches: number;
  record: { wins: number; draws: number; losses: number };
};

function SeasonAwardsCard({ seasonId }: { seasonId: string }) {
  const { data, loading } = useApi<AwardsData>(
    seasonId ? `/api/season-awards?seasonId=${seasonId}` : "",
    { awards: {}, seasonName: "", teamName: "", totalMatches: 0, record: { wins: 0, draws: 0, losses: 0 } },
    { skip: !seasonId }
  );

  const [cardLoading, setCardLoading] = useState(false);
  const [cardMessage, setCardMessage] = useState<string | null>(null);

  const awards = data.awards;
  const hasAwards = awards && Object.values(awards).some((a) => a !== null);

  async function handleDownloadCard() {
    setCardLoading(true);
    try {
      const res = await fetch(`/api/season-award-card?seasonId=${seasonId}`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCardMessage("시상식 카드가 클립보드에 복사되었습니다");
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "season-awards.png";
        link.click();
        URL.revokeObjectURL(link.href);
        setCardMessage("시상식 카드가 저장되었습니다");
      }
    } catch {
      setCardMessage("카드 생성에 실패했습니다");
    } finally {
      setCardLoading(false);
      setTimeout(() => setCardMessage(null), 2500);
    }
  }

  if (loading || !hasAwards) return null;

  const awardItems: { key: string; emoji: string; fallbackLabel: string }[] = [
    { key: "topScorer", emoji: "⚽", fallbackLabel: "득점왕" },
    { key: "topAssist", emoji: "🅰️", fallbackLabel: "도움왕" },
    { key: "ironWall", emoji: "🛡️", fallbackLabel: "철벽수비" },
    { key: "topAttendance", emoji: "🏃", fallbackLabel: "출석왕" },
    { key: "luckyCharm", emoji: "🍀", fallbackLabel: "승리요정" },
    { key: "topMvp", emoji: "⭐", fallbackLabel: "MOM" },
    { key: "bestMatch", emoji: "⚡", fallbackLabel: "베스트매치" },
  ];

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
          <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
            {data.seasonName} 시즌 어워드
          </CardTitle>
        </div>
        {data.totalMatches > 0 && (
          <p className="text-xs text-muted-foreground">
            {data.totalMatches}경기 · {data.record.wins}승 {data.record.draws}무 {data.record.losses}패
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-2.5">
          {awardItems.map(({ key, emoji, fallbackLabel }) => {
            const award = awards[key] as Award | null;
            if (!award) return null;
            return (
              <div key={key} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                <span className="text-lg shrink-0">{emoji}</span>
                <span className="text-sm font-medium text-muted-foreground w-16 shrink-0">
                  {award.label || fallbackLabel}
                </span>
                <span className="text-sm font-bold flex-1 truncate">{award.name}</span>
                <span className="text-sm font-bold text-primary shrink-0">{award.value}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleDownloadCard}
            disabled={cardLoading}
          >
            {cardLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            시상식 카드 저장
          </Button>
          {cardMessage && (
            <p className="text-xs text-center text-muted-foreground animate-in fade-in">{cardMessage}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
