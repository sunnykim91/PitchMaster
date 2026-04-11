import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  // 로그인 여부만 체크 — teamId 없는 사용자도 검색 가능
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ teams: [] });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // is_searchable = true인 팀만 검색, 이름 부분 일치
  const { data: teams } = await db
    .from("teams")
    .select("id, name, sport_type")
    .eq("is_searchable", true)
    .ilike("name", `%${q}%`)
    .limit(10);

  // 각 팀의 활성 멤버 수 조회
  const results = await Promise.all(
    (teams ?? []).map(async (team) => {
      const { count } = await db
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "ACTIVE");
      return { ...team, memberCount: count ?? 0 };
    })
  );

  // 현재 사용자의 PENDING 신청 목록 조회 (kakao_id로 조회)
  const { data: me } = await db
    .from("users")
    .select("kakao_id")
    .eq("id", session.user.id)
    .single();
  const { data: myRequests } = me?.kakao_id
    ? await db
        .from("team_join_requests")
        .select("team_id")
        .eq("kakao_id", me.kakao_id)
        .eq("status", "PENDING")
    : { data: [] as { team_id: string }[] };

  const pendingTeamIds = new Set((myRequests ?? []).map((r) => r.team_id));

  return NextResponse.json({
    teams: results.map((t) => ({
      id: t.id,
      name: t.name,
      sportType: t.sport_type,
      memberCount: t.memberCount,
      hasPendingRequest: pendingTeamIds.has(t.id),
    })),
  });
}
