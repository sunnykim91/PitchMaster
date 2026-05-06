"use client";

import dynamic from "next/dynamic";
import PitchScoreRadar from "./PitchScoreRadar";
import type {
  AttributeCategory,
  SportType,
} from "@/lib/playerAttributes/types";

const PlayerRadarChart = dynamic(() => import("@/components/charts/PlayerRadarChart"), {
  ssr: false,
  loading: () => <RadarPlaceholder />,
});

interface CategoryAvg {
  category: AttributeCategory;
  avg: number;
  count: number;
}

export interface AttributesResponse {
  overall_pitch_score: number;
  total_samples: number;
  category_averages: CategoryAvg[];
}

interface MyStats {
  goals: number;
  assists: number;
  mvp: number;
  attendanceRate: number;
}

interface Props {
  userName: string;
  sportType: SportType;
  preferredPositions: string[];
  myStats: MyStats;
  maxGoals: number;
  maxAssists: number;
  maxMvp: number;
  isAllTime: boolean;
  seasonName?: string | null;
  participantCount: number;
  teamAttendanceRate: number;
  /** 부모(RecordsClient)가 fetch 한 attributes 데이터. 자체 fetch 안 함 (중복 round trip 회피). */
  pitchAttrs: AttributesResponse | null;
  pitchAttrsLoading: boolean;
}

function RadarPlaceholder() {
  return (
    <div className="flex h-[240px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function MyOverviewCard({
  userName,
  preferredPositions,
  myStats,
  maxGoals,
  maxAssists,
  maxMvp,
  isAllTime,
  seasonName,
  participantCount,
  teamAttendanceRate,
  pitchAttrs,
  pitchAttrsLoading,
}: Props) {
  const overall = pitchAttrs?.overall_pitch_score ?? 0;
  const totalSamples = pitchAttrs?.total_samples ?? 0;
  const hasPitchScore = totalSamples > 0;
  const hasMatchStats = myStats.goals > 0 || myStats.assists > 0 || myStats.mvp > 0 || myStats.attendanceRate > 0;
  const primaryPosition = preferredPositions[0] ?? null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{userName}</h2>
            {primaryPosition && (
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--primary))]">
                {primaryPosition}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAllTime ? "전체 시즌 통합" : seasonName ?? ""} · 참여 {participantCount}명 · 팀 평균 출석 {Math.round(teamAttendanceRate * 100)}%
          </p>
        </div>
        {hasPitchScore && (
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PitchScore™</div>
            <div className="text-2xl font-black leading-none text-[hsl(var(--primary))]">
              {overall.toFixed(1)}
              <span className="text-xs text-muted-foreground"> / 5</span>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              이번 시즌 활약
            </div>
            <div className="text-[11px] text-muted-foreground">
              {myStats.goals}G · {myStats.assists}A · {myStats.mvp} MVP
            </div>
          </div>
          {hasMatchStats ? (
            <PlayerRadarChart
              goals={myStats.goals}
              assists={myStats.assists}
              mvp={myStats.mvp}
              attendanceRate={myStats.attendanceRate}
              maxGoals={maxGoals}
              maxAssists={maxAssists}
              maxMvp={maxMvp}
            />
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-xs text-muted-foreground">
              아직 시즌 기록이 없어요
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              능력치 평가
            </div>
            <div className="text-[11px] text-muted-foreground">
              {hasPitchScore ? `${totalSamples}명 평가` : "-"}
            </div>
          </div>
          {pitchAttrsLoading ? (
            <RadarPlaceholder />
          ) : hasPitchScore && pitchAttrs ? (
            <PitchScoreRadar data={pitchAttrs.category_averages} height={240} />
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-xs text-muted-foreground">
              아직 능력치 평가가 없어요
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
