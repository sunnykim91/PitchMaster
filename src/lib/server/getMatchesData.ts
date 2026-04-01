import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DbMatchRow = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  match_end_time: string | null;
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

  // 자동 완료 + matches 조회를 병렬 실행 (KST 기준)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = kstNow.toISOString().split("T")[0];

  // 1단계: 자동 완료 + 전체 경기 조회 병렬
  const [, { data }] = await Promise.all([
    db.from("matches").update({ status: "COMPLETED" }).eq("team_id", teamId).eq("status", "SCHEDULED").lt("match_date", today),
    db.from("matches").select("*").eq("team_id", teamId).order("match_date", { ascending: false }),
  ]);

  // 자동 완료된 경기 반영 (UPDATE가 SELECT보다 먼저 완료되면 이미 반영, 아니면 클라이언트에서 반영)
  const matches = ((data ?? []) as DbMatchRow[]).map((m) =>
    m.status === "SCHEDULED" && m.match_date < today ? { ...m, status: "COMPLETED" as const } : m
  );

  // 2단계: 스코어 계산
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
