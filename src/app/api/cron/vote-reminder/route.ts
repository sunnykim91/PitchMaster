import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";
import { getActiveExemptions } from "@/lib/server/getActiveExemptions";

/** 투표 마감 하루 전 자동 알림 (Vercel Cron으로 매일 09:00 KST 실행) */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // KST 기준 내일 날짜
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(kstNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.toISOString().split("T")[0] + "T00:00:00";
  const tomorrowEnd = tomorrow.toISOString().split("T")[0] + "T23:59:59";

  // 1) 내일 마감인 경기 (vote_deadline 기준)
  const { data: deadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name, vote_deadline, match_type")
    .eq("status", "SCHEDULED")
    .gte("vote_deadline", tomorrowStart)
    .lte("vote_deadline", tomorrowEnd);

  // 2) 마감일 미설정이지만 내일 경기인 경우 (경기 전날 = 오늘 리마인드)
  const tomorrowDate = tomorrow.toISOString().split("T")[0];
  const { data: noDeadlineMatches } = await db
    .from("matches")
    .select("id, team_id, match_date, opponent_name, vote_deadline, match_type")
    .eq("status", "SCHEDULED")
    .eq("match_date", tomorrowDate)
    .is("vote_deadline", null);

  // 중복 제거 후 합치기
  const seenIds = new Set<string>();
  const matches = [...(deadlineMatches ?? []), ...(noDeadlineMatches ?? [])].filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  if (matches.length === 0) {
    return NextResponse.json({ message: "No reminders needed", sent: 0 });
  }

  let totalSent = 0;

  for (const match of matches) {
    // 미투표자만 대상
    const { data: members } = await db
      .from("team_members")
      .select("user_id")
      .eq("team_id", match.team_id)
      .eq("status", "ACTIVE")
      .not("user_id", "is", null);

    const allIdsRaw = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
    // 면제/휴회/부상 회원 제외
    const exemptions = await getActiveExemptions(match.team_id);
    const allIds = allIdsRaw.filter((uid) => !exemptions.has(uid));

    const { data: voted } = await db
      .from("match_attendance")
      .select("user_id")
      .eq("match_id", match.id)
      .not("user_id", "is", null);

    const votedIds = new Set((voted ?? []).map((v) => v.user_id));
    const unvotedIds = allIds.filter((uid) => !votedIds.has(uid));

    if (unvotedIds.length === 0) continue;

    const isEvent = (match as { match_type?: string }).match_type === "EVENT";
    const opponent = match.opponent_name || (isEvent ? "팀 일정" : "상대 미정");
    const result = await sendTeamPush(match.team_id, {
      title: isEvent ? "일정 참석 투표 마감이 내일입니다!" : "투표 마감이 내일입니다!",
      body: isEvent ? `${match.match_date} ${opponent} — 참석 여부를 투표해주세요` : `${match.match_date} vs ${opponent} — 참석 여부를 투표해주세요`,
      url: `/matches/${match.id}`,
      userIds: unvotedIds,
    });

    totalSent += result.sent;
  }

  return NextResponse.json({ matches: matches.length, sent: totalSent });
}
