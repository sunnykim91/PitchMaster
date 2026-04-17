import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * DEV ONLY: Impersonate a user by kakao_id
 * Gated by NODE_ENV !== 'production' + DEV_IMPERSONATE env flag
 */
export async function POST(request: NextRequest) {
  // Double gate: NODE_ENV + env flag
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  if (process.env.DEV_IMPERSONATE !== "1") {
    return NextResponse.json({ error: "DEV_IMPERSONATE not enabled" }, { status: 404 });
  }

  const { kakaoId } = await request.json();
  if (!kakaoId) {
    return NextResponse.json({ error: "kakaoId is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // 유저 조회
  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!user) {
    return NextResponse.json({ error: `User with kakao_id ${kakaoId} not found` }, { status: 404 });
  }

  // 팀 멤버십 조회 (ACTIVE 상태, 여러 팀이 있으면 첫 번째)
  const { data: memberships } = await db
    .from("team_members")
    .select("team_id, role, teams(name, invite_code)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: `${user.name}의 활성 팀이 없습니다` }, { status: 404 });
  }

  const membership = memberships[0];

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
      teamName: team?.name ?? "팀",
      teamRole: membership.role,
      inviteCode: team?.invite_code ?? "",
      isDemo: false,
    },
  });

  return NextResponse.json({ ok: true, redirect: "/dashboard", user: user.name });
}
