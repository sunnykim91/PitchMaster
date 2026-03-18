import { NextRequest, NextResponse } from "next/server";
import { auth, updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** GET: 현재 유저가 속한 모든 팀 목록 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const { data, error } = await db
    .from("team_members")
    .select("team_id, role, teams(id, name, invite_code, sport_type)")
    .eq("user_id", session.user.id)
    .eq("status", "ACTIVE");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const teams = (data ?? []).map((row) => {
    const teamsRaw = row.teams as unknown;
    const team = (Array.isArray(teamsRaw) ? teamsRaw[0] : teamsRaw) as { id: string; name: string; invite_code: string; sport_type?: string } | null;
    return {
      id: team?.id ?? row.team_id,
      name: team?.name ?? "알 수 없는 팀",
      inviteCode: team?.invite_code ?? "",
      sportType: team?.sport_type ?? "SOCCER",
      role: row.role,
      isCurrent: team?.id === session.user.teamId,
    };
  });

  return NextResponse.json({ teams });
}

/** POST: 팀 전환 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const targetTeamId = String(body.teamId || "");
  if (!targetTeamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // 해당 유저가 실제로 이 팀의 ACTIVE 멤버인지 확인
  const { data: membership } = await db
    .from("team_members")
    .select("role, teams(id, name, invite_code)")
    .eq("user_id", session.user.id)
    .eq("team_id", targetTeamId)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });
  }

  const teamsRaw = membership.teams as unknown;
  const team = (Array.isArray(teamsRaw) ? teamsRaw[0] : teamsRaw) as { id: string; name: string; invite_code: string };

  await updateSession({
    teamId: team.id,
    teamName: team.name,
    teamRole: membership.role,
    inviteCode: team.invite_code,
  });

  return NextResponse.json({ ok: true, teamName: team.name, role: membership.role });
}
