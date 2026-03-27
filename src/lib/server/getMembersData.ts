import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasMinRole } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export async function getMembersData(teamId: string, teamRole?: Role) {
  const db = getSupabaseAdmin();
  if (!db) return { members: [], isStaff: false };

  const isStaff = hasMinRole(teamRole, "STAFF");
  const select = isStaff
    ? "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, jersey_number, team_role, users(id, name, birth_date, phone, preferred_positions, preferred_foot, profile_image_url)"
    : "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, jersey_number, team_role, users(id, name, preferred_positions)";

  const { data } = await db
    .from("team_members")
    .select(select)
    .eq("team_id", teamId)
    .in("status", ["ACTIVE", "DORMANT"]);

  return { members: data ?? [], isStaff };
}
