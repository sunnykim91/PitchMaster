"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowUpDown, ArrowDown, Download, Share2, Trophy, Sparkles, Info, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { isStaffOrAbove } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import MembersPairsClient from "@/app/(app)/members/pairs/MembersPairsClient";
import type { PairMatrix } from "@/lib/server/getPairSynergy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
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
  /** 시즌 출전 경기 수 (vote=ATTEND 기준) */
  matches: number;
  attendanceRate: number;
  preferredPositions: string[];
  jerseyNumber: number | null;
  teamRole: string | null;
  /** 토글 ON 팀에만 채워짐. OFF면 undefined */
  avgRating?: number;
  ratingCount?: number;
  /** 통합 수비 포인트 = 키퍼 무실점쿼터×2 + 필드수비 무실점쿼터×1. 무실점 쿼터가 있을 때만 채워짐 */
  defensePoints?: number;
  defenseGkQuarters?: number;
  defenseFieldQuarters?: number;
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

/**
 * ① 종합 랭킹 — 밸런스 점수(정규화). 서경카페 피드백 2026-07-12, 실팀 11개 심층분석으로 확정.
 *
 * 각 부문(골·도움·MVP·수비·출석)에서 "팀 1등 대비 얼마나 가까운지"를 20점 만점으로 환산해 합산(만점 100).
 * 선형 배점(골×N)은 조기축구 특성상 골·어시만 잘 기록돼 수비수·키퍼가 구조적으로 소외되고(대부분 팀
 * 6~8위), 수비 가중치를 올리면 촘촘한 팀에선 키퍼가 한 스탯으로 독주(편중 66%)하는 딜레마가 있었다.
 * 정규화는 (a) 수비 기록이 부실한 팀에서도 수비 대표를 상위 노출, (b) 한 스탯 독주 방지(편중 32%),
 * (c) 여러 부문 골고루 잘한 다재다능한 선수를 1위로 → 데이터상 유일하게 포지션 공정.
 */
type BalanceMax = { g: number; a: number; mvp: number; def: number; att: number };
function computeBalanceScore(s: RecordStat, max: BalanceMax): number {
  return Math.round(
    20 * (s.goals / max.g) +
      20 * (s.assists / max.a) +
      20 * (s.mvp / max.mvp) +
      20 * ((s.defensePoints ?? 0) / max.def) +
      20 * (s.matches / max.att)
  );
}

/** 랭킹 카드의 "점수 기준" 펼침 — 어떤 기준으로 순위가 매겨졌는지 사용자에게 설명 */
function ScoreCriteria({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <Info className="h-3 w-3" />
        점수 기준
        <span className="text-[9px] transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-1.5 rounded-lg bg-background p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

function mapRecord(raw: Record<string, unknown>): RecordStat {
  return {
    memberId: String(raw.memberId ?? raw.member_id ?? ""),
    memberName: String(raw.name ?? raw.member_name ?? ""),
    goals: Number(raw.goals ?? 0),
    assists: Number(raw.assists ?? 0),
    mvp: Number(raw.mvp ?? 0),
    matches: Number(raw.matches ?? raw.attended ?? 0),
    attendanceRate: Number(raw.attendanceRate ?? raw.attendance_rate ?? 0),
    preferredPositions: Array.isArray(raw.preferredPositions ?? raw.preferred_positions)
      ? (raw.preferredPositions ?? raw.preferred_positions) as string[]
      : [],
    jerseyNumber: (raw.jerseyNumber as number) ?? null,
    teamRole: (raw.teamRole as string) ?? null,
    avgRating: typeof raw.avgRating === "number" ? Number(raw.avgRating) : undefined,
    ratingCount: typeof raw.ratingCount === "number" ? Number(raw.ratingCount) : undefined,
    defensePoints: typeof raw.defensePoints === "number" ? Number(raw.defensePoints) : undefined,
    defenseGkQuarters: typeof raw.defenseGkQuarters === "number" ? Number(raw.defenseGkQuarters) : undefined,
    defenseFieldQuarters: typeof raw.defenseFieldQuarters === "number" ? Number(raw.defenseFieldQuarters) : undefined,
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
  totalSeasonMatches?: number;
};

export default function RecordsClient({
  userId,
  userName,
  userRole,
  initialData,
}: {
  userId: string;
  userName?: string;
  userRole?: Role;
  initialData?: InitialData;
}) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const searchParams = useSearchParams();

  // ── Tab state ──
  type RecordsTab = "my" | "ranking" | "all" | "awards" | "pairs";
  const isStaff = isStaffOrAbove(role);
  const validTabs: RecordsTab[] = isStaff
    ? ["my", "ranking", "all", "awards", "pairs"]
    : ["my", "ranking", "all", "awards"];
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
    { key: "awards" as const, label: "시즌 어워드" },
    ...(isStaff ? [{ key: "pairs" as const, label: "페어" }] : []),
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
  } = useApi<{ records: Record<string, unknown>[]; totalSeasonMatches?: number }>(
    recordsUrl,
    {
      records: (isInitialSeason && initialData?.records) ? initialData.records : [],
      totalSeasonMatches: (isInitialSeason ? initialData?.totalSeasonMatches : undefined),
    },
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

  const totalSeasonMatches = recordsPayload.totalSeasonMatches
    ?? (isInitialSeason ? initialData?.totalSeasonMatches : undefined)
    ?? 0;

  const season = seasons.find((s) => s.id === seasonId) ?? activeSeason;

  const myStats: RecordStat = stats.find((item) => item.memberId === userId) ?? {
    memberId: userId,
    memberName: userName ?? "",
    goals: 0,
    assists: 0,
    mvp: 0,
    matches: 0,
    attendanceRate: 0,
    preferredPositions: [],
    jerseyNumber: null,
    teamRole: null,
  };

  // 본인 랭킹 (각 스탯별, 1위부터). 0인 스탯은 랭킹 표시 안 함
  const myRanks = useMemo(() => {
    function rankOf(key: "goals" | "assists" | "mvp"): number | null {
      if (myStats[key] === 0) return null;
      const sorted = [...stats].sort((a, b) => b[key] - a[key]);
      const idx = sorted.findIndex((s) => s.memberId === userId);
      return idx >= 0 ? idx + 1 : null;
    }
    return {
      goals: rankOf("goals"),
      assists: rankOf("assists"),
      mvp: rankOf("mvp"),
    };
  }, [stats, userId, myStats.goals, myStats.assists, myStats.mvp]);

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
      if (!res.ok) { setDetailData([]); return; } // 4xx/5xx 를 빈 목록으로 조용히 처리하지 않음
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
  // 통합 수비 포인트 랭킹 — 키퍼(무실점쿼터×2)·필드수비(무실점쿼터×1)를 한 랭킹으로 (포인트 > 0)
  const topDefense = useMemo(
    () =>
      stats
        .filter((s) => (s.defensePoints ?? 0) > 0)
        .sort((a, b) => (b.defensePoints ?? 0) - (a.defensePoints ?? 0))
        .slice(0, 3),
    [stats]
  );
  // ① 종합 랭킹 — 밸런스 점수(정규화). 부문별 팀 1등 대비 환산 (서경카페 피드백 2026-07-12)
  // 최소 출전 가드: 소수 경기 요행으로 부문 1등을 차지하는 왜곡 방지 (시즌의 20%, 최소 3경기)
  const overallMinGames = Math.max(3, Math.ceil((totalSeasonMatches ?? 0) * 0.2));
  // 정규화 기준(팀 1등)은 규정 경기 이상 pool로 고정 — 카드 top5와 전체 시트가 같은 점수를 쓰도록 공유
  const overallMax = useMemo<BalanceMax>(() => {
    const qualified = stats.filter((s) => s.matches >= overallMinGames);
    const pool = qualified.length >= 3 ? qualified : stats; // 소규모 팀 보호
    return {
      g: Math.max(1, ...pool.map((s) => s.goals)),
      a: Math.max(1, ...pool.map((s) => s.assists)),
      mvp: Math.max(1, ...pool.map((s) => s.mvp)),
      def: Math.max(1, ...pool.map((s) => s.defensePoints ?? 0)),
      att: Math.max(1, ...pool.map((s) => s.matches)),
    };
  }, [stats, overallMinGames]);
  // 카드 top 5 — 규정 경기 이상만 (소표본 요행 왜곡 방지)
  const topOverall = useMemo(() => {
    const qualified = stats.filter((s) => s.matches >= overallMinGames);
    const pool = qualified.length >= 3 ? qualified : stats;
    return pool
      .map((s) => ({ ...s, overall: computeBalanceScore(s, overallMax) }))
      .filter((s) => s.overall > 0)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);
  }, [stats, overallMinGames, overallMax]);
  // 제목 탭 시 전체 시트 — 전 회원 1등~꼴등 (점수 기준은 카드와 동일)
  const overallRankingFull = useMemo(
    () =>
      stats
        .map((s) => ({ ...s, overall: computeBalanceScore(s, overallMax) }))
        .sort((a, b) => b.overall - a.overall),
    [stats, overallMax]
  );

  // 랭킹 카드 제목 탭 → 부문별 1등~꼴등 전체 시트 (서경카페 노진우 피드백 2026-07-14)
  const [rankingSheet, setRankingSheet] = useState<
    null | "overall" | "goals" | "assists" | "mvp" | "defense"
  >(null);
  const rankingSheetData = useMemo(() => {
    if (!rankingSheet) return null;
    if (rankingSheet === "overall") {
      return {
        title: "종합 랭킹",
        unit: "점",
        rows: overallRankingFull.map((s) => ({
          memberId: s.memberId,
          memberName: s.memberName,
          jerseyNumber: s.jerseyNumber,
          value: s.overall,
          subtitle: [
            s.goals > 0 ? `${s.goals}골` : null,
            s.assists > 0 ? `${s.assists}도움` : null,
            s.mvp > 0 ? `MVP ${s.mvp}` : null,
            (s.defensePoints ?? 0) > 0 ? `수비 ${s.defensePoints}` : null,
            `${s.matches}출전`,
          ].filter(Boolean).join(" · "),
        })),
      };
    }
    const cfg = {
      goals: { title: "득점왕", unit: "골", get: (s: RecordStat) => s.goals },
      assists: { title: "어시스트왕", unit: "도움", get: (s: RecordStat) => s.assists },
      mvp: { title: "MVP왕", unit: "회", get: (s: RecordStat) => s.mvp },
      defense: { title: "수비 포인트", unit: "점", get: (s: RecordStat) => s.defensePoints ?? 0 },
    }[rankingSheet];
    const rows = stats
      .map((s) => ({ s, value: cfg.get(s) }))
      .sort((a, b) => b.value - a.value)
      .map(({ s, value }) => ({
        memberId: s.memberId,
        memberName: s.memberName,
        jerseyNumber: s.jerseyNumber,
        value,
        subtitle:
          rankingSheet === "defense"
            ? [
                (s.defenseGkQuarters ?? 0) > 0 ? `키퍼 무실점 ${s.defenseGkQuarters}쿼터` : null,
                (s.defenseFieldQuarters ?? 0) > 0 ? `수비 무실점 ${s.defenseFieldQuarters}쿼터` : null,
              ].filter(Boolean).join(" · ")
            : `${s.matches}경기`,
      }));
    return { title: cfg.title, unit: cfg.unit, rows };
  }, [rankingSheet, stats, overallRankingFull]);

  const [sortKey, setSortKey] = useState<"points" | "goals" | "assists" | "mvp" | "attendanceRate" | "avgRating">("points");
  const allStats = useMemo(() => {
    const withPoints = stats.map((s) => ({ ...s, points: s.goals + s.assists }));
    return [...withPoints].sort((a, b) => {
      if (sortKey === "points") return b.points - a.points;
      if (sortKey === "attendanceRate") return b.attendanceRate - a.attendanceRate;
      if (sortKey === "avgRating") return (b.avgRating ?? -1) - (a.avgRating ?? -1);
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

  // 선수 시즌 기록 CSV 내보내기 (운영진 전용) — 현재 보고 있는 시즌 기준
  function handleExportRecords() {
    const headers = ["이름", "등번호", "경기수", "골", "어시스트", "공격P", "MVP", "출석률(%)", "평점"];
    const rows = stats.map((s) => {
      const rating = (s as { avgRating?: number }).avgRating;
      return [
        s.memberName,
        s.jerseyNumber ?? "",
        s.matches,
        s.goals,
        s.assists,
        s.goals + s.assists,
        s.mvp,
        Math.round(s.attendanceRate * 100),
        rating != null ? rating : "",
      ];
    });
    const label = isAllTime ? "전체통합" : ((season as { name?: string } | undefined)?.name ?? "시즌");
    downloadCsv(`선수기록_${label}.csv`, headers, rows);
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
      {/* ── Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-[hsl(var(--background)_/_0.98)] border-b border-border">
        <div role="tablist" aria-label="기록 탭" className="flex">
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
      </div>

      {/* ── Season Selector (탭 바 아래 독립 줄) + 내보내기(운영진) ── */}
      <div className="flex items-center justify-between -mt-1 -mb-2">
        {isStaff && stats.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportRecords}
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            내보내기
          </Button>
        ) : (
          <span />
        )}
        <Select value={seasonId} onValueChange={handleSeasonChange}>
          <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs">
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

      {/* ── Tab: 내 기록 ── (비활성 탭은 마운트하지 않음 — 초기 렌더/차트 비용 절감) */}
      {activeTab === "my" && (
      <div className="grid gap-5">
      {/* ── 시즌 요약 + 레이더 ── */}
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

      {/* ── 내 기록 — 히어로 헤더 + 4(또는 5) 카드 + 랭킹 배지 (탭 최상단 고정) ── */}
      <Card style={{ order: -1 }}>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase">
            내 기록
          </CardTitle>
          {/* 히어로 한 줄 — 풀 한국어 라벨로 약어·기호 제거 */}
          {(myStats.memberName || myStats.jerseyNumber || myStats.preferredPositions.length > 0) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[
                myStats.memberName,
                myStats.jerseyNumber ? `등번호 ${myStats.jerseyNumber}번` : null,
                myStats.preferredPositions[0] ? `주포지션 ${myStats.preferredPositions[0]}` : null,
                myStats.preferredPositions.length > 1
                  ? `서브포지션 ${myStats.preferredPositions.length - 1}개`
                  : null,
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {(() => {
            const showRating = myStats.avgRating !== undefined;
            const showDefense = (myStats.defensePoints ?? 0) > 0;
            const points = myStats.goals + myStats.assists;
            const attendancePercent = Math.round(myStats.attendanceRate * 100);

            type Item = {
              label: string;
              value: string | number;
              color: string;
              bg: string;
              rank: number | null;
              sub?: string;
            };
            const items: Item[] = [
              {
                label: "득점",
                value: myStats.goals,
                color: "text-[hsl(var(--success))]",
                bg: "bg-[hsl(var(--success)/0.1)]",
                rank: myRanks.goals,
                sub: points > 0 ? `공격포인트 ${points}` : undefined,
              },
              {
                label: "어시스트",
                value: myStats.assists,
                color: "text-[hsl(var(--info))]",
                bg: "bg-[hsl(var(--info)/0.1)]",
                rank: myRanks.assists,
              },
              {
                label: "MVP",
                value: myStats.mvp,
                color: "text-[hsl(var(--warning))]",
                bg: "bg-[hsl(var(--warning)/0.1)]",
                rank: myRanks.mvp,
              },
              {
                label: "출전",
                value: myStats.matches,
                color: "text-[hsl(var(--accent))]",
                bg: "bg-[hsl(var(--accent)/0.1)]",
                rank: null,
                sub:
                  totalSeasonMatches > 0
                    ? `시즌 ${totalSeasonMatches}경기 · 출석률 ${attendancePercent}%`
                    : myStats.matches > 0
                    ? `출석률 ${attendancePercent}%`
                    : undefined,
              },
              ...(showDefense
                ? [{
                    label: "수비 포인트",
                    value: myStats.defensePoints ?? 0,
                    color: "text-teal-400",
                    bg: "bg-teal-500/10",
                    rank: null as number | null,
                    sub: [
                      (myStats.defenseGkQuarters ?? 0) > 0 ? `키퍼 무실점 ${myStats.defenseGkQuarters}쿼터` : null,
                      (myStats.defenseFieldQuarters ?? 0) > 0 ? `수비 무실점 ${myStats.defenseFieldQuarters}쿼터` : null,
                    ].filter(Boolean).join(" · ") || undefined,
                  } as Item]
                : []),
              ...(showRating
                ? [{
                    label: `평점 (${myStats.ratingCount ?? 0}회)`,
                    value: myStats.avgRating!.toFixed(1),
                    color: "text-[hsl(var(--warning))]",
                    bg: "bg-[hsl(var(--warning)/0.1)]",
                    rank: null as number | null,
                  } as Item]
                : []),
            ];
            const extraCols = (showRating ? 1 : 0) + (showDefense ? 1 : 0);
            const gridCols =
              extraCols === 2 ? "grid-cols-2 md:grid-cols-6"
              : extraCols === 1 ? "grid-cols-2 md:grid-cols-5"
              : "grid-cols-2 md:grid-cols-4";
            if (loadingRecords) {
              return (
                <div className={cn("grid gap-3", gridCols)}>
                  {Array.from({ length: items.length }).map((_, i) => (
                    <Card key={i} className="border-0 p-4">
                      <Skeleton className="h-3 w-16 mb-2" />
                      <Skeleton className="h-8 w-12" />
                    </Card>
                  ))}
                </div>
              );
            }

            // 전체 0 = 빈 응원 카피 분기
            const allEmpty =
              myStats.goals === 0 &&
              myStats.assists === 0 &&
              myStats.mvp === 0 &&
              myStats.matches === 0 &&
              !showRating &&
              !showDefense;

            return (
              <>
                <div className={cn("grid gap-3", gridCols)}>
                  {items.map((item) => {
                    const isEmpty = item.value === 0 || item.value === "0";
                    return (
                      <div key={item.label} className={cn("card-stat relative", isEmpty ? "" : item.bg)}>
                        {item.rank !== null && (
                          <span
                            aria-label={`팀 ${item.rank}위`}
                            className="absolute right-2 top-2 rounded-full bg-[hsl(var(--warning)_/_0.15)] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--warning))]"
                          >
                            {item.rank === 1 ? "🥇 1위" : item.rank === 2 ? "🥈 2위" : item.rank === 3 ? "🥉 3위" : `${item.rank}위`}
                          </span>
                        )}
                        <p className="type-overline">{item.label}</p>
                        <p className={cn("mt-1 type-stat", isEmpty ? "text-muted-foreground/40" : item.color)}>
                          {isEmpty ? "-" : item.value}
                        </p>
                        {item.sub && !isEmpty && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.sub}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {allEmpty && (
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    아직 기록이 없어요. 다음 경기에 첫 골 노려보세요! ⚽
                  </p>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      </div>
      )}

      {/* ── Tab: 팀 랭킹 ── */}
      {activeTab === "ranking" && (
      <div className="grid gap-5">

      {/* ── 팀 전적 (시즌 누적 승무패·득실·최근 5경기) ── */}
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

      {/* ── 종합 랭킹 — 골·도움·MVP·수비·출석 합산 공헌점수 (서경카페 피드백 2026-07-12) ── */}
      {!loadingRecords && topOverall.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setRankingSheet("overall")}
              className="group -mx-1 flex items-center gap-1.5 rounded-md px-1 text-left"
              aria-label="종합 랭킹 전체 순위 보기"
            >
              <CardTitle className="mt-1 font-heading text-lg sm:text-2xl font-bold uppercase transition-colors group-hover:text-primary">종합 랭킹</CardTitle>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </button>
            <p className="mt-0.5 text-xs text-muted-foreground">골·도움·MVP·수비·출석을 고루 반영한 밸런스 점수</p>
            <ScoreCriteria>
              각 부문에서 <span className="font-medium text-foreground/80">팀 1등에 얼마나 가까운지</span>를 점수로 환산해 합쳤어요.
              <span className="mt-1.5 block font-medium text-foreground/80">
                골 · 도움 · MVP · 수비 · 출석 — 부문마다 팀 1등이면 20점, 절반이면 10점
              </span>
              <span className="mt-1 block">한 부문만 잘해선 1위가 어렵고, 여러 부문을 골고루 잘해야 종합 상위예요. 그래서 골·어시가 잘 기록되는 조기축구에서도 수비수·키퍼가 소외되지 않아요. ({overallMinGames}경기 이상 출전 대상)</span>
            </ScoreCriteria>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxScore = topOverall[0]?.overall || 1;
              return (
                <div className="space-y-1.5">
                  {topOverall.map((item, index) => {
                    const isFirst = index === 0;
                    const pct = Math.max(8, Math.round((item.overall / maxScore) * 100));
                    const breakdown = [
                      item.goals > 0 ? `${item.goals}골` : null,
                      item.assists > 0 ? `${item.assists}도움` : null,
                      item.mvp > 0 ? `MVP ${item.mvp}` : null,
                      (item.defensePoints ?? 0) > 0 ? `수비 ${item.defensePoints}` : null,
                      `${item.matches}출전`,
                    ].filter(Boolean).join(" · ");
                    return (
                      <div key={item.memberId} className={cn("relative overflow-hidden rounded-lg", isFirst ? "py-2.5" : "py-2")}>
                        {/* 점수 비례 리더보드 막대 (배경 채움) */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg"
                          style={{ width: `${pct}%`, background: isFirst ? "hsl(var(--warning) / 0.16)" : "hsl(var(--secondary))" }}
                          aria-hidden
                        />
                        <div className="relative flex items-center justify-between gap-2 px-2.5">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className={cn(
                              "inline-flex shrink-0 items-center justify-center rounded-md font-bold",
                              isFirst
                                ? "h-7 w-7 bg-[hsl(var(--warning)_/_0.28)] text-[hsl(var(--warning))]"
                                : "h-6 w-6 bg-background text-xs text-muted-foreground"
                            )}>
                              {isFirst ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className={cn("block truncate", isFirst ? "text-[15px] font-bold text-foreground" : "text-sm text-foreground/90")}>
                                {item.memberName ?? "-"}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">{breakdown}</span>
                            </span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-right">
                            <span className={cn(
                              "font-bold font-[family-name:var(--font-display)]",
                              isFirst ? "text-xl text-[hsl(var(--warning))]" : "text-lg text-foreground"
                            )}>{item.overall}</span>
                            <span className="ml-0.5 text-xs text-muted-foreground">점</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

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
              description="경기 1개만 완료해도 선수 카드·시즌 어워드가 자동으로 만들어져요."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link href="/matches">경기 일정 보기</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {[{
                title: "득점왕", sheetKey: "goals" as const, list: topGoals, getValue: (s: RecordStat) => s.goals, color: "#22c55e",
              }, {
                title: "어시스트왕", sheetKey: "assists" as const, list: topAssists, getValue: (s: RecordStat) => s.assists, color: "#38bdf8",
              }, {
                title: "MVP왕", sheetKey: "mvp" as const, list: topMvp, getValue: (s: RecordStat) => s.mvp, color: "#f59e0b",
              },
              // 통합 수비 포인트 — 키퍼·필드수비를 한 랭킹으로 (전술판에 수비/GK로 선 선수가 있을 때만 노출)
              ...(topDefense.length > 0 ? [{
                title: "수비 포인트", sheetKey: "defense" as const, desc: "무실점 쿼터 · 키퍼2 · 수비1", list: topDefense, getValue: (s: RecordStat) => s.defensePoints ?? 0, color: "#14b8a6",
              }] : []),
              ].map((group) => (
                <Card key={group.title} className="bg-secondary border-0 p-4">
                  <button
                    type="button"
                    onClick={() => setRankingSheet(group.sheetKey)}
                    className="group flex w-full items-center gap-1 text-left"
                    aria-label={`${group.title} 전체 순위 보기`}
                  >
                    <span className="text-sm font-bold transition-colors group-hover:text-primary">{group.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                  {"desc" in group && group.desc ? (
                    <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">{group.desc}</p>
                  ) : null}
                  {group.title === "수비 포인트" ? (
                    <ScoreCriteria>
                      실점 없이(0실점) 지킨 쿼터마다 점수를 줘요.
                      <span className="mt-1.5 block font-medium text-foreground/80">키퍼 2점 · 필드 수비수(센터백·풀백·윙백) 1점</span>
                      <span className="mt-1 block">전술판에 수비로 선 쿼터가 기준이에요.</span>
                    </ScoreCriteria>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {group.list.map((item, index) => (
                      <div
                        key={item.memberId}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                            index === 0 ? "bg-[hsl(var(--warning)_/_0.2)] text-[hsl(var(--warning))]"
                              : index === 1 ? "bg-secondary text-foreground/60"
                              : "bg-secondary text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          <span className={cn("truncate", index === 0 && "font-bold text-foreground")}>{item.memberName ?? "-"}</span>
                        </span>
                        <span className="shrink-0 text-lg font-bold font-[family-name:var(--font-display)] text-foreground">
                          {group.getValue(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {group.list.some((item) => group.getValue(item) > 0) && (
                    <div className="mt-3">
                      <BarRankingChart
                        data={group.list
                          .filter((item) => group.getValue(item) > 0)
                          .map((item) => ({ name: item.memberName ?? "-", value: group.getValue(item) }))}
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
      )}

      {/* ── Tab: 전체 기록 ── */}
      {activeTab === "all" && (
      <div className="grid gap-5">
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
                        isMe && "bg-[hsl(var(--primary)_/_0.08)] border-primary/20"
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
                            <span className="shrink-0 rounded bg-[hsl(var(--primary)_/_0.1)] px-1 py-0.5 text-xs font-bold text-primary">#{s.jerseyNumber}</span>
                          )}
                          <Link href={`/player/${s.memberId}${activeSeason?.teamId ? `?team=${activeSeason.teamId}` : ""}`} className="font-semibold text-sm truncate underline decoration-dotted decoration-muted-foreground/40 underline-offset-[3px] hover:text-primary hover:decoration-primary">{s.memberName || "-"}</Link>
                          {s.teamRole === "CAPTAIN" && <Badge variant="warning" className="text-xs px-1 py-0 shrink-0">C</Badge>}
                          {s.teamRole === "VICE_CAPTAIN" && <Badge variant="secondary" className="text-xs px-1 py-0 shrink-0">VC</Badge>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.avgRating !== undefined && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--warning)_/_0.15)] px-2 py-0.5 text-xs font-bold text-[hsl(var(--warning))] tabular-nums">
                              ⭐ {s.avgRating.toFixed(1)}
                              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">({s.ratingCount ?? 0})</span>
                            </span>
                          )}
                          <span className="text-sm font-bold text-primary">G+A {s.points}</span>
                        </div>
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
                            className="hover:bg-[hsl(var(--secondary)_/_0.5)] rounded-lg py-1 transition-colors disabled:opacity-50 disabled:cursor-default cursor-pointer"
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
                          ...(allStats.some((s) => s.avgRating !== undefined)
                            ? [{ key: "avgRating" as const, label: "평점" }]
                            : []),
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
                        const stickyBg = isMe ? "bg-[hsl(var(--primary)_/_0.08)]" : "bg-card";
                        return (
                          <tr key={s.memberId} className={cn(isMe && "[&>td]:bg-[hsl(var(--primary)_/_0.08)]")}>
                            <td className={cn("sticky left-0 z-1 py-2.5", stickyBg, isTop3 ? "text-primary font-bold" : "text-muted-foreground")}>{i + 1}</td>
                            <td className={cn("sticky left-8 z-1 py-2.5 font-semibold max-w-[120px] truncate", stickyBg)}>
                              <span className="flex items-center gap-1">
                                {s.jerseyNumber !== null && <span className="text-xs text-primary font-bold">#{s.jerseyNumber}</span>}
                                <Link href={`/player/${s.memberId}${activeSeason?.teamId ? `?team=${activeSeason.teamId}` : ""}`} className="underline decoration-dotted decoration-muted-foreground/40 underline-offset-[3px] hover:text-primary hover:decoration-primary">{s.memberName || "-"}</Link>
                                {s.teamRole === "CAPTAIN" && <Badge variant="warning" className="text-xs px-1 py-0">C</Badge>}
                                {s.teamRole === "VICE_CAPTAIN" && <Badge variant="secondary" className="text-xs px-1 py-0">VC</Badge>}
                              </span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-primary">{s.points}</td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.goals === 0} onClick={() => openDetail(s.memberId, s.memberName, "goals")} className="text-[hsl(var(--success))] hover:underline disabled:no-underline disabled:cursor-default">{s.goals}</button></td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.assists === 0} onClick={() => openDetail(s.memberId, s.memberName, "assists")} className="text-[hsl(var(--info))] hover:underline disabled:no-underline disabled:cursor-default">{s.assists}</button></td>
                            <td className="py-2.5 text-center"><button type="button" disabled={s.mvp === 0} onClick={() => openDetail(s.memberId, s.memberName, "mvp")} className="text-[hsl(var(--warning))] hover:underline disabled:no-underline disabled:cursor-default">{s.mvp}</button></td>
                            <td className="py-2.5 text-center"><button type="button" onClick={() => openDetail(s.memberId, s.memberName, "attendance")} className="text-primary hover:underline">{Math.round(s.attendanceRate * 100)}%</button></td>
                            {allStats.some((row) => row.avgRating !== undefined) && (
                              <td className="py-2.5 text-center tabular-nums">
                                {s.avgRating !== undefined ? (
                                  <span className="text-[hsl(var(--warning))]">
                                    {s.avgRating.toFixed(1)}
                                    <span className="ml-1 text-[11px] text-muted-foreground">({s.ratingCount ?? 0})</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            )}
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
      )}

      {/* ── Tab: 시즌 어워드 ── */}
      {activeTab === "awards" && (
      <div className="grid gap-5">
        {isAllTime ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              시즌을 선택하면 어워드가 표시됩니다 (전체 기간은 제외).
            </CardContent>
          </Card>
        ) : (
          <SeasonAwardsCard seasonId={seasonId} />
        )}
      </div>
      )}

      {/* ── Tab: 페어 시너지 (운영진 전용) ── */}
      {isStaff && (
        <div className={activeTab === "pairs" ? "grid gap-5" : "hidden"}>
          <PairsTabPanel active={activeTab === "pairs"} />
        </div>
      )}

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
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[hsl(var(--secondary)_/_0.5)] transition-colors"
                    >
                      {/* 승/무/패 인디케이터 */}
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        result === "W" ? "bg-[hsl(var(--success)_/_0.15)] text-[hsl(var(--success))]"
                          : result === "L" ? "bg-[hsl(var(--loss)_/_0.15)] text-[hsl(var(--loss))]"
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
                          detailType === "goals" ? "bg-[hsl(var(--success)_/_0.15)] text-[hsl(var(--success))]"
                            : detailType === "assists" ? "bg-[hsl(var(--info)_/_0.15)] text-[hsl(var(--info))]"
                            : "bg-[hsl(var(--warning)_/_0.15)] text-[hsl(var(--warning))]"
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

      {/* ── 부문별 전체 랭킹 Sheet (랭킹 카드 제목 탭) ── */}
      <Sheet open={rankingSheet !== null} onOpenChange={(o) => { if (!o) setRankingSheet(null); }} key="ranking-sheet">
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-0">
          <SheetHeader className="text-left px-5 pb-3 border-b border-border/30">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[hsl(var(--warning))]" />
              {rankingSheetData?.title ?? "랭킹"} 전체 순위
              {rankingSheetData && rankingSheetData.rows.length > 0 && (
                <Badge variant="secondary" className="text-xs">{rankingSheetData.rows.length}명</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 py-3">
            {rankingSheetData && rankingSheetData.rows.length > 0 ? (
              (() => {
                const maxVal = rankingSheetData.rows[0]?.value || 1;
                return (
                  <div className="space-y-1.5">
                    {rankingSheetData.rows.map((row, index) => {
                      const isTop = index === 0 && row.value > 0;
                      const isZero = row.value <= 0;
                      const pct = row.value > 0 ? Math.max(8, Math.round((row.value / maxVal) * 100)) : 0;
                      return (
                        <div key={row.memberId} className={cn("relative overflow-hidden rounded-lg", isTop ? "py-2.5" : "py-2")}>
                          {pct > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-lg"
                              style={{ width: `${pct}%`, background: isTop ? "hsl(var(--warning) / 0.16)" : "hsl(var(--secondary))" }}
                              aria-hidden
                            />
                          )}
                          <div className="relative flex items-center justify-between gap-2 px-2.5">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className={cn(
                                "inline-flex shrink-0 items-center justify-center rounded-md font-bold",
                                isTop
                                  ? "h-7 w-7 bg-[hsl(var(--warning)_/_0.28)] text-[hsl(var(--warning))]"
                                  : "h-6 w-6 bg-background text-xs text-muted-foreground"
                              )}>
                                {isTop ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
                              </span>
                              <span className="min-w-0">
                                <span className={cn(
                                  "flex items-center gap-1",
                                  isTop ? "text-[15px] font-bold text-foreground" : isZero ? "text-sm text-muted-foreground" : "text-sm text-foreground/90"
                                )}>
                                  {row.jerseyNumber !== null && <span className="shrink-0 text-xs font-bold text-primary">#{row.jerseyNumber}</span>}
                                  <span className="truncate">{row.memberName || "-"}</span>
                                </span>
                                {row.subtitle ? <span className="block truncate text-[11px] text-muted-foreground">{row.subtitle}</span> : null}
                              </span>
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-right">
                              <span className={cn(
                                "font-bold font-[family-name:var(--font-display)]",
                                isTop ? "text-xl text-[hsl(var(--warning))]" : isZero ? "text-lg text-muted-foreground" : "text-lg text-foreground"
                              )}>{row.value}</span>
                              <span className="ml-0.5 text-xs text-muted-foreground">{rankingSheetData.unit}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">아직 기록이 없어요.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

// ── 페어 시너지 탭 (운영진 전용, 활성 시 lazy fetch) ──
const EMPTY_PAIR_MATRIX: PairMatrix = { members: [], pairs: [], totalMatches: 0 };
function PairsTabPanel({ active }: { active: boolean }) {
  const { data, loading } = useApi<PairMatrix>(
    "/api/pair-synergy",
    EMPTY_PAIR_MATRIX,
    { skip: !active },
  );
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  return <MembersPairsClient initialData={data} hideHeader />;
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
          onClick={async () => {
            const url = `${window.location.origin}/player/${userId}`;
            try {
              await navigator.clipboard.writeText(url);
              setMessage("프로필 링크가 복사되었습니다");
            } catch {
              setMessage("복사에 실패했습니다. 주소를 직접 복사해주세요.");
            }
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
            // null·name 비어있으면 스킵 (데이터 없는 어워드)
            if (!award || !award.name) return null;
            return (
              <div key={key} className="flex items-center gap-3 rounded-xl bg-[hsl(var(--secondary)_/_0.5)] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none">{emoji}</span>
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
