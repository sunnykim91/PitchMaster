import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteTeamMatches, shouldAutoComplete } from "@/lib/server/autoCompleteMatches";
import { computeMatchScore } from "@/lib/server/matchScore";

export type DbMatchRow = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  match_end_time: string | null;
  match_end_date: string | null;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  vote_deadline: string | null;
  match_type?: "REGULAR" | "INTERNAL" | "EVENT" | null;
  score?: string | null;
  created_by: string;
  created_at: string;
};

export async function getMatchesData(teamId: string): Promise<{ matches: DbMatchRow[] }> {
  const db = getSupabaseAdmin();
  if (!db) return { matches: [] };

  // 1단계: 자동 완료 + 전체 경기 조회 병렬
  const [, { data }] = await Promise.all([
    autoCompleteTeamMatches(db, teamId),
    db.from("matches").select("*").eq("team_id", teamId).order("match_date", { ascending: false }),
  ]);

  // 자동 완료된 경기 반영 (UPDATE가 SELECT보다 먼저 완료되면 이미 반영, 아니면 클라이언트에서 반영)
  const matches = ((data ?? []) as DbMatchRow[]).map((m) =>
    shouldAutoComplete(m) ? { ...m, status: "COMPLETED" as const } : m
  );

  // 2단계: 스코어 계산
  const completedIds = matches.filter((m) => m.status === "COMPLETED").map((m) => m.id);
  if (completedIds.length === 0) {
    return { matches: matches.map((m) => ({ ...m, score: null })) };
  }

  const { data: goals } = await db.from("match_goals").select("match_id, scorer_id, is_own_goal, side").in("match_id", completedIds);
  const internalIds = new Set(matches.filter((m) => m.match_type === "INTERNAL").map((m) => m.id));
  const byMatch: Record<string, Array<{ scorer_id: string; is_own_goal: boolean; side: string | null }>> = {};
  for (const g of goals ?? []) {
    (byMatch[g.match_id] ??= []).push(g as { scorer_id: string; is_own_goal: boolean; side: string | null });
  }

  function computeScore(m: DbMatchRow): string | null {
    if (m.status !== "COMPLETED") return null;
    // 행사(EVENT)는 점수 개념이 없어 스코어 영역을 숨긴다
    if (m.match_type === "EVENT") return null;
    // 완료된 상대전은 골 0건이어도 "0 : 0"(무승부). 골이 등록되면 그대로 반영. matches route 와 동일.
    return computeMatchScore(byMatch[m.id] ?? [], internalIds.has(m.id));
  }

  return {
    matches: matches.map((m) => ({ ...m, score: computeScore(m) })),
  };
}
