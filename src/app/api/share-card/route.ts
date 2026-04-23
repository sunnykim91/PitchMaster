import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();

  let matchDate = "2026-02-01";
  let matchTime = "18:00";
  let location = "경기장";
  let opponent = "상대팀";
  let ourGoals = 0;
  let oppGoals = 0;
  let scorers: string[] = [];
  let mvpName = "-";
  let teamName = "PitchMaster";

  if (db) {
    const { data: match } = await db
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();
    if (match) {
      matchDate = match.match_date;
      matchTime = match.match_time || "";
      location = match.location || "";
      opponent = match.opponent_name || "상대팀";
    }

    const { data: goals } = await db
      .from("match_goals")
      .select("scorer_id, is_own_goal")
      .eq("match_id", matchId);
    if (goals) {
      ourGoals = goals.filter(
        (g: { scorer_id: string; is_own_goal: boolean }) => g.scorer_id !== "OPPONENT" && !g.is_own_goal
      ).length;
      oppGoals = goals.filter(
        (g: { scorer_id: string; is_own_goal: boolean }) => g.scorer_id === "OPPONENT" || g.is_own_goal
      ).length;
    }

    // Get scorers names
    const scorerIds =
      goals
        ?.filter((g: { scorer_id: string; is_own_goal: boolean }) => g.scorer_id !== "OPPONENT" && !g.is_own_goal)
        .map((g: { scorer_id: string }) => g.scorer_id) ?? [];
    if (scorerIds.length > 0) {
      const { data: users } = await db
        .from("users")
        .select("name")
        .in("id", scorerIds);
      scorers = users?.map((u: { name: string }) => u.name) ?? [];
    }

    // Get MVP — 참석자 70% 이상 투표 통과 시 최다득표자, 또는 운영진 직접 지정.
    // threshold 미달이면 "확정 MVP 없음" → 공유 카드엔 "-" 표기.
    const { data: mvpVotes } = await db
      .from("match_mvp_votes")
      .select("voter_id, candidate_id, is_staff_decision")
      .eq("match_id", matchId);

    if (mvpVotes && mvpVotes.length > 0) {
      const [attendanceResp, staffResp] = await Promise.all([
        db.from("match_attendance").select("id").eq("match_id", matchId).in("attendance_status", ["PRESENT", "LATE"]),
        // is_staff_decision 백필 누락 치유 — 현재 STAFF+ voter 투표를 확정 취급
        db.from("team_members").select("user_id").eq("team_id", ctx.teamId).in("role", ["STAFF", "PRESIDENT"]).not("user_id", "is", null),
      ]);
      const attendedCount = attendanceResp.data?.length ?? 0;
      const staffVoterIds = new Set<string>(
        (staffResp.data ?? []).map((m) => m.user_id).filter((id): id is string => !!id)
      );

      const { resolveValidMvp, pickStaffDecision } = await import("@/lib/mvpThreshold");
      type MvpRow = { voter_id: string; candidate_id: string; is_staff_decision: boolean | null };
      const rows = (mvpVotes as MvpRow[]).filter((v) => !!v.candidate_id);
      const staffPick = pickStaffDecision(rows, staffVoterIds);
      const votes = rows.map((v) => v.candidate_id);

      const winner = resolveValidMvp(votes, attendedCount, staffPick);
      if (winner) {
        const { data: mvpUser } = await db
          .from("users")
          .select("name")
          .eq("id", winner)
          .single();
        if (mvpUser) mvpName = mvpUser.name;
      }
    }

    const { data: team } = await db
      .from("teams")
      .select("name")
      .eq("id", ctx.teamId)
      .single();
    if (team) teamName = team.name;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b0f1a"/>
        <stop offset="100%" stop-color="#1a1230"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#bg)" rx="24"/>
    <text x="300" y="40" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">PITCHMASTER</text>
    <text x="300" y="80" text-anchor="middle" fill="#f8fafc" font-size="22" font-weight="bold" font-family="sans-serif">${teamName} vs ${opponent}</text>
    <text x="300" y="160" text-anchor="middle" fill="#ff7a45" font-size="64" font-weight="bold" font-family="sans-serif">${ourGoals} : ${oppGoals}</text>
    <text x="300" y="220" text-anchor="middle" fill="#c7d2fe" font-size="14" font-family="sans-serif">${matchDate} ${matchTime} · ${location}</text>
    <text x="300" y="270" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">득점: ${scorers.length > 0 ? scorers.join(", ") : "-"}</text>
    <text x="300" y="310" text-anchor="middle" fill="#2bd3b5" font-size="16" font-weight="bold" font-family="sans-serif">MVP: ${mvpName}</text>
    <text x="300" y="375" text-anchor="middle" fill="#64748b" font-size="10" font-family="sans-serif">pitchmaster.app</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
