"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

export default function RecordsClient({
  userId,
  userRole,
  initialSeasons,
}: {
  userId: string;
  userRole?: Role;
  initialSeasons?: { seasons: any[] };
}) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();

  // ── Fetch seasons ──
  const {
    data: seasonsPayload,
    loading: loadingSeasons,
    refetch: refetchSeasons,
  } = useApi<{ seasons: Record<string, unknown>[] }>(
    "/api/seasons",
    initialSeasons ?? { seasons: [] },
    { skip: !!initialSeasons }
  );

  const seasons: Season[] = useMemo(
    () => seasonsPayload.seasons.map(mapSeason),
    [seasonsPayload]
  );

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const [seasonId, setSeasonId] = useState<string>("");

  // Sync seasonId when seasons load for the first time
  useEffect(() => {
    if (seasons.length > 0 && !seasonId) {
      setSeasonId(activeSeason?.id ?? seasons[0].id);
    }
  }, [seasons, seasonId, activeSeason]);

  // ── Fetch records for the selected season (시즌 없으면 전체) ──
  const {
    data: recordsPayload,
    loading: loadingRecords,
    refetch: refetchRecords,
  } = useApi<{ records: Record<string, unknown>[] }>(
    seasonId ? `/api/records?seasonId=${seasonId}` : "/api/records",
    { records: [] },
  );

  const stats: RecordStat[] = useMemo(
    () => recordsPayload.records.map(mapRecord),
    [recordsPayload]
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

  // ── Button loading states ──
  const [addingSeason, setAddingSeason] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function handleAddSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAddingSeason(true);
    const { error } = await apiMutate("/api/seasons", "POST", {
      name: String(formData.get("name")),
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
      isActive: Boolean(formData.get("isActive")),
    });
    setAddingSeason(false);
    if (!error) {
      await refetchSeasons();
      event.currentTarget.reset();
      showToast("시즌이 추가되었습니다.");
    } else {
      showToast("시즌 추가에 실패했습니다.", "error");
    }
  }

  async function handleActivateSeason(id: string) {
    setActivatingId(id);
    const { error } = await apiMutate("/api/seasons", "PUT", {
      id,
      isActive: true,
    });
    setActivatingId(null);
    if (!error) {
      await refetchSeasons();
      setSeasonId(id);
      showToast("시즌이 활성화되었습니다.");
    } else {
      showToast("시즌 활성화에 실패했습니다.", "error");
    }
  }

  function handleSeasonChange(value: string) {
    setSeasonId(value);
  }

  // Refetch records whenever seasonId changes
  useEffect(() => {
    if (seasonId) {
      refetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

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
      {/* ── 내 기록 (My Stats) ── */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">My Stats</p>
            <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">
              내 기록
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            시즌 선택
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
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-0 p-4">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </Card>
                ))}
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: "득점", value: myStats.goals, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "어시스트", value: myStats.assists, color: "text-sky-400", bg: "bg-sky-500/10" },
                  { label: "MVP", value: myStats.mvp, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "출석률", value: `${Math.round(myStats.attendanceRate * 100)}%`, color: "text-violet-400", bg: "bg-violet-500/10" },
                ].map((item) => (
                  <Card key={item.label} className={cn("border-0 p-4", item.bg)}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={cn("mt-1 font-heading text-2xl font-bold", item.color)}>
                      {item.value}
                    </p>
                  </Card>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {season?.name} 기준으로 {myStats.memberName || "나"}님의 기록을 보여줍니다.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 팀 랭킹 + 사이드바 ── */}
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* 팀 랭킹 */}
        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">Rankings</p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
              팀 랭킹
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loadingRecords ? (
              <div className="space-y-3">
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">아직 기록이 없습니다. 경기를 진행해보세요.</p>
              </div>
            ) : (
              [{
                title: "득점왕", list: topGoals, key: "goals" as const,
              }, {
                title: "어시스트왕", list: topAssists, key: "assists" as const,
              }, {
                title: "MVP왕", list: topMvp, key: "mvp" as const,
              }].map((group) => (
                <Card key={group.title} className="bg-secondary border-0 p-4">
                  <p className="text-sm font-bold">{group.title}</p>
                  <div className="mt-3 space-y-2">
                    {group.list.map((item, index) => (
                      <div
                        key={item.memberId}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span className="flex items-center gap-2">
                          {index === 0 ? (
                            <Badge variant="success" className="h-5 w-5 justify-center rounded-md px-0 py-0">
                              {index + 1}
                            </Badge>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-xs font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                          {item.memberName ?? "-"}
                        </span>
                        <span className="font-bold text-foreground">
                          {item[group.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* 전체 회원 기록 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-400">All Stats</p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
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
            ) : allStats.filter((s) => s.points > 0 || s.goals > 0 || s.assists > 0 || s.mvp > 0 || s.attendanceRate > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">아직 기록이 없습니다. 경기를 진행해보세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="pb-3 text-left font-medium text-muted-foreground">#</th>
                      <th className="pb-3 text-left font-medium text-muted-foreground">이름</th>
                      {([
                        { key: "points" as const, label: "공격P" },
                        { key: "goals" as const, label: "골" },
                        { key: "assists" as const, label: "어시" },
                        { key: "mvp" as const, label: "MVP" },
                        { key: "attendanceRate" as const, label: "출석률" },
                      ]).map((col) => (
                        <th
                          key={col.key}
                          className={cn(
                            "cursor-pointer pb-3 text-center font-medium transition hover:text-foreground",
                            sortKey === col.key ? "text-primary" : "text-muted-foreground"
                          )}
                          onClick={() => setSortKey(col.key)}
                        >
                          {col.label}{sortKey === col.key ? " ▼" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {allStats.filter((s) => s.points > 0 || s.goals > 0 || s.assists > 0 || s.mvp > 0 || s.attendanceRate > 0).map((s, i) => (
                      <tr key={s.memberId} className={cn(s.memberId === userId && "bg-primary/5")}>
                        <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 font-semibold">{s.memberName || "-"}</td>
                        <td className="py-2.5 text-center font-bold text-primary">{s.points}</td>
                        <td className="py-2.5 text-center text-emerald-400">{s.goals}</td>
                        <td className="py-2.5 text-center text-sky-400">{s.assists}</td>
                        <td className="py-2.5 text-center text-amber-400">{s.mvp}</td>
                        <td className="py-2.5 text-center text-violet-400">{Math.round(s.attendanceRate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 사이드바: 시즌 요약 + 포지션 */}
        <div className="space-y-5">
          {/* 시즌 요약 */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Summary</p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                시즌 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                시즌 기간: {season?.startDate} ~ {season?.endDate}
              </p>
              <p>참여 인원: {stats.length}명</p>
              <p>평균 출석률: {Math.round(teamAttendance * 100)}%</p>
              <p>기록 입력 기준: 골/어시스트/MVP 투표</p>
            </CardContent>
          </Card>

          {/* 선호 vs 실제 포지션 */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Position</p>
              <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
                선호 vs 실제 포지션
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingRecords ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : stats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">아직 기록이 없습니다. 경기를 진행해보세요.</p>
                </div>
              ) : (
                stats.map((member) => (
                  <Card
                    key={member.memberId}
                    className="flex items-center justify-between bg-secondary border-0 px-4 py-3"
                  >
                    <span className="text-sm font-semibold">{member.memberName}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        선호: {member.preferredPositions.length > 0 ? member.preferredPositions.join(" · ") : "-"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        실제: 데이터 수집 중
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── 시즌 관리 ── */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Seasons</p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            시즌 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isStaffOrAbove(role) && (
            <form
              onSubmit={handleAddSeason}
              className="mb-4 grid gap-4 rounded-xl bg-secondary p-5"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="season-name" className="text-sm font-semibold text-muted-foreground">
                    시즌명
                  </Label>
                  <Input
                    id="season-name"
                    name="name"
                    required
                    placeholder="예: 2026 하반기"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-start" className="text-sm font-semibold text-muted-foreground">
                    시작일
                  </Label>
                  <Input
                    id="season-start"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-end" className="text-sm font-semibold text-muted-foreground">
                    종료일
                  </Label>
                  <Input
                    id="season-end"
                    name="endDate"
                    type="date"
                    required
                  />
                </div>
              </div>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input name="isActive" type="checkbox" className="h-4 w-4 accent-primary" />
                새 시즌을 활성화
              </Label>
              <Button type="submit" size="sm" disabled={addingSeason}>
                {addingSeason ? "추가 중..." : "시즌 추가"}
              </Button>
            </form>
          )}
          <div className="space-y-2">
            {seasons.map((item) => (
              <Card
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-secondary border-0 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.startDate} ~ {item.endDate}
                  </p>
                </div>
                {isStaffOrAbove(role) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isActive ? "default" : "outline"}
                    onClick={() => handleActivateSeason(item.id)}
                    disabled={activatingId === item.id}
                  >
                    {activatingId === item.id ? "처리 중..." : item.isActive ? "활성" : "활성화"}
                  </Button>
                ) : (
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "활성" : "비활성"}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
