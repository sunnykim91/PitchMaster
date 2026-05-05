"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { CATEGORY_META } from "@/lib/playerAttributes/config";
import type { AttributeCategory, SportType } from "@/lib/playerAttributes/types";

type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

interface MemberRanking {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  position: string;
  overall: number;
  top_category: AttributeCategory | null;
  sample_count: number;
}

interface GroupResponse {
  group: PositionGroup;
  label: string;
  members: MemberRanking[];
}

interface RankingsResponse {
  groups: GroupResponse[];
  sport_type: SportType;
}

interface Props {
  teamId: string;
  sportType: SportType;
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

/**
 * Phase 3 (1차) — 팀 포지션별 PitchScore TOP 3.
 * GK/DEF/MID/FWD 4그룹, 각 TOP 3, 평가 5건+ 멤버만 노출.
 */
export default function TeamPositionRankings({ teamId, sportType }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ team_id: teamId, sport: sportType });
        const res = await fetch(`/api/team/position-rankings?${params.toString()}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "랭킹 로딩 실패");
        }
        const json: RankingsResponse = await res.json();
        if (cancelled) return;
        setGroups(json.groups);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [teamId, sportType]);

  const totalRanked = groups.reduce((acc, g) => acc + g.members.length, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
        <h2 className="text-base font-bold">포지션별 PitchScore™ TOP 3</h2>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          랭킹 불러오는 중…
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      ) : totalRanked === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          아직 랭킹에 오를 만큼 평가가 누적되지 않았어요. 평가 5건 이상 받은 멤버부터 노출돼요.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.group}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-bold">{g.label}</h3>
                <span className="text-[10px] text-muted-foreground">
                  {g.members.length === 0 ? "랭킹 부족" : `${g.members.length}명`}
                </span>
              </div>
              {g.members.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-muted-foreground">
                  평가가 부족해요
                </p>
              ) : (
                <div className="space-y-1.5">
                  {g.members.map((m, idx) => (
                    <Link
                      key={m.user_id}
                      href={`/player/${m.user_id}`}
                      className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-secondary/60"
                    >
                      <span aria-hidden="true" className="shrink-0 text-base">
                        {RANK_BADGES[idx] ?? `${idx + 1}.`}
                      </span>
                      <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                        {m.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.profile_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {m.name.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="truncate text-sm font-bold">{m.name}</span>
                          <span className="shrink-0 text-[9px] text-muted-foreground">
                            {m.position}
                          </span>
                        </div>
                        {m.top_category && (
                          <span className="text-[10px] text-muted-foreground">
                            강점 · {CATEGORY_META[m.top_category]?.name_ko ?? m.top_category}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-base font-black tabular-nums text-[hsl(var(--primary))]">
                        {m.overall.toFixed(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
