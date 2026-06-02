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

  // LIKE 와일드카드(%, _, \) 이스케이프 — 사용자 입력의 %·_ 가 패턴으로 동작해 엉뚱한 매칭되는 것 방지
  const escapedQ = q.replace(/[\\%_]/g, (c) => `\\${c}`);

  // is_searchable = true인 팀만 검색, 이름 부분 일치
  const { data: teams } = await db
    .from("teams")
    .select("id, name, sport_type")
    .eq("is_searchable", true)
    .ilike("name", `%${escapedQ}%`)
    .limit(10);

  // 각 팀의 활성 멤버 수 — 팀별 개별 count(N+1) 대신 한 번에 조회 후 집계
  const teamIds = (teams ?? []).map((t) => t.id);
  const countByTeam = new Map<string, number>();
  if (teamIds.length > 0) {
    const { data: memberRows } = await db
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds)
      .eq("status", "ACTIVE");
    for (const r of memberRows ?? []) countByTeam.set(r.team_id, (countByTeam.get(r.team_id) ?? 0) + 1);
  }
  const results = (teams ?? []).map((team) => ({ ...team, memberCount: countByTeam.get(team.id) ?? 0 }));

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
