import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEMO_KAKAO_ID = "demo_kakao_id_pitchmaster";

export async function POST() {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // 데모 유저 조회
  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("kakao_id", DEMO_KAKAO_ID)
    .single();

  if (!user) {
    return NextResponse.json({ error: "데모 계정이 설정되지 않았습니다" }, { status: 404 });
  }

  // 데모 유저의 팀 멤버십 조회
  const { data: membership } = await db
    .from("team_members")
    .select("team_id, role, teams(name, invite_code)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "데모 팀이 설정되지 않았습니다" }, { status: 404 });
  }

  const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;

  // 세션 설정
  await setSession({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      preferredPositions: user.preferred_positions ?? [],
      preferredFoot: user.preferred_foot ?? "RIGHT",
      profileImageUrl: user.profile_image_url ?? "",
      isProfileComplete: true,
      teamId: membership.team_id,
      teamName: team?.name ?? "데모FC",
      teamRole: membership.role,
      inviteCode: team?.invite_code ?? "",
      isDemo: true,
    },
  });

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
