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
  created_by: string;
  created_at: string;
};

export async function getMatchesData(teamId: string): Promise<{ matches: DbMatchRow[] }> {
  const db = getSupabaseAdmin();
  if (!db) return { matches: [] };

  const { data } = await db
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false });

  return { matches: (data as DbMatchRow[]) ?? [] };
}
