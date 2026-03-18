import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DbMatchRow = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  vote_deadline: string | null;
  score?: string | null;
  created_by: string;
  created_at: string;
};

export async function getMatchesData(teamId: string): Promise<{ matches: DbMatchRow[] }> {
  const db = getSupabaseAdmin();
  if (!db) return { matches: [] };

  // select("*") intentional: all columns are spread and returned to the client via ...m
  const { data } = await db
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false });

  const matches = (data ?? []) as DbMatchRow[];

  // 완료된 경기의 스코어 계산
  const completedIds = matches.filter((m) => m.status === "COMPLETED").map((m) => m.id);
  if (completedIds.length === 0) {
    return { matches: matches.map((m) => ({ ...m, score: null })) };
  }

  const { data: goals } = await db.from("match_goals").select("match_id, scorer_id, is_own_goal").in("match_id", completedIds);
  const scoreMap: Record<string, { our: number; opp: number }> = {};
  for (const g of goals ?? []) {
    if (!scoreMap[g.match_id]) scoreMap[g.match_id] = { our: 0, opp: 0 };
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) scoreMap[g.match_id].opp++;
    else scoreMap[g.match_id].our++;
  }

  return {
    matches: matches.map((m) => ({
      ...m,
      score: scoreMap[m.id] ? `${scoreMap[m.id].our} : ${scoreMap[m.id].opp}` : null,
    })),
  };
}
