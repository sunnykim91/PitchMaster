import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getRulesData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { rules: [] };

  const { data } = await db
    .from("rules")
    .select("*, creator:created_by(name)")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  return { rules: data ?? [] };
}
