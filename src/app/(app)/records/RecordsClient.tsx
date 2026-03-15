"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export default function RecordsClient({ userId, userRole }: { userId: string; userRole?: Role }) {
  // ── Fetch seasons ──
  const {
    data: seasonsPayload,
    loading: loadingSeasons,
    refetch: refetchSeasons,
  } = useApi<{ seasons: Record<string, unknown>[] }>("/api/seasons", { seasons: [] });

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

  // ── Fetch records for the selected season ──
  const {
    data: recordsPayload,
    loading: loadingRecords,
    refetch: refetchRecords,
  } = useApi<{ records: Record<string, unknown>[] }>(
    `/api/records?seasonId=${seasonId}`,
    { records: [] },
    { skip: !seasonId }
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

  const topGoals = [...stats].sort((a, b) => b.goals - a.goals).slice(0, 3);
  const topAssists = [...stats].sort((a, b) => b.assists - a.assists).slice(0, 3);
  const topMvp = [...stats].sort((a, b) => b.mvp - a.mvp).slice(0, 3);

  const teamAttendance = stats.length
    ? stats.reduce((sum, item) => sum + item.attendanceRate, 0) / stats.length
    : 0;

  async function handleAddSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { error } = await apiMutate("/api/seasons", "POST", {
      name: String(formData.get("name")),
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
      isActive: Boolean(formData.get("isActive")),
    });
    if (!error) {
      await refetchSeasons();
      event.currentTarget.reset();
    }
  }

  async function handleActivateSeason(id: string) {
    const { error } = await apiMutate("/api/seasons", "PUT", {
      id,
      isActive: true,
    });
    if (!error) {
      await refetchSeasons();
      setSeasonId(id);
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
      <Card className="p-6">
        <span className="text-muted-foreground">불러오는 중...</span>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
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
            <p className="text-sm text-muted-foreground">기록 불러오는 중...</p>
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
              <p className="text-sm text-muted-foreground">랭킹 불러오는 중...</p>
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
                <p className="text-sm text-muted-foreground">포지션 불러오는 중...</p>
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
          {isStaffOrAbove(userRole) && (
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
              <Button type="submit" size="sm">
                시즌 추가
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
                {isStaffOrAbove(userRole) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isActive ? "default" : "outline"}
                    onClick={() => handleActivateSeason(item.id)}
                  >
                    {item.isActive ? "활성" : "활성화"}
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
