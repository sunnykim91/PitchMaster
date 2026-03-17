import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getRecordsData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { seasons: [] };

  const { data: seasons } = await db
    .from("seasons")
    .select("*")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  return { seasons: seasons ?? [] };
}
