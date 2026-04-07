import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getSettingsData(userId: string, teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { profile: null, team: null };

  const [profileRes, teamRes] = await Promise.all([
    db.from("users").select("*").eq("id", userId).single(),
    db.from("teams")
      .select("id, name, logo_url, invite_code, invite_expires_at, join_mode, uniform_primary, uniform_secondary, uniform_pattern, uniforms, is_searchable, default_formation_id")
      .eq("id", teamId)
      .single(),
  ]);

  return {
    profile: profileRes.data ?? null,
    team: teamRes.data ?? null,
  };
}
