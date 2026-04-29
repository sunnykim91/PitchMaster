import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWeatherData } from "@/lib/server/getWeather";

/**
 * SSR 블로킹 제거 (2026-04-20):
 * 이전엔 enableAi + 후기 캐시 miss 시 getOrComputeTeamStats() + generateAiMatchSummary()를
 * SSR에서 await 해서 경기 상세 페이지 진입이 수초씩 블로킹됐다.
 * 이제는 캐시된 match.ai_summary 만 반환하고, 첫 생성은 클라이언트 MatchDiaryTab 이
 * mount 시 /api/ai/match-summary/[matchId] 를 자동 호출해 비동기로 처리한다.
 * 후기는 이미 결정론적 템플릿 (25차) 으로 전환돼 호출 지연도 ~0ms 수준.
 */
export async function getMatchDetailData(matchId: string, teamId: string, _enableAi: boolean = false, _userId: string | null = null) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const [matchRes, goalsRes, mvpRes, attendanceCheckRes, guestsRes, internalTeamsRes, diaryRes, membersRes, teamRes, voteRes, commentsRes] = await Promise.all([
    db.from("matches").select("*").eq("id", matchId).eq("team_id", teamId).single(),
    db.from("match_goals").select("*").eq("match_id", matchId).order("display_order", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    db.from("match_mvp_votes").select("*").eq("match_id", matchId),
    db.from("match_attendance").select("user_id, member_id, actually_attended, attendance_status").eq("match_id", matchId),
    db.from("match_guests").select("*").eq("match_id", matchId),
    db.from("match_internal_teams").select("player_id, side").eq("match_id", matchId),
    db.from("match_diaries").select("*").eq("match_id", matchId).maybeSingle(),
    db.from("team_members").select("id, role, user_id, status, pre_name, coach_positions, jersey_number, team_role, dormant_type, dormant_until, dormant_reason, users(id, name, preferred_positions)").eq("team_id", teamId).in("status", ["ACTIVE", "DORMANT"]),
    // select * 로 안전하게 — 마이그레이션 미적용 컬럼(예: mvp_vote_staff_only) 때문에
    // 전체 쿼리가 실패해 fallback UI(회색 유니폼 등)가 나오는 사태 방지
    db.from("teams").select("*").eq("id", teamId).single(),
    db.from("match_attendance").select("id, match_id, user_id, member_id, vote, voted_at, users(id, name, preferred_positions), member:team_members(id, pre_name, user_id, coach_positions, users(id, name, preferred_positions))").eq("match_id", matchId),
    db.from("match_comments").select("id, user_id, content, created_at, users(name)").eq("match_id", matchId).order("created_at", { ascending: true }),
  ]);

  // 날씨 prefetch — 미래 경기(≤5일)만 실제 호출, 아니면 null
  // COMPLETED 경기는 호출 생략. DB 컬럼은 match_date (클라 변환 전).
  const match = matchRes.data;
  const matchDate = (match as { match_date?: string } | null)?.match_date;
  let weather: Awaited<ReturnType<typeof getWeatherData>> = null;
  if (match && match.status !== "COMPLETED" && matchDate) {
    weather = await getWeatherData(matchDate, match.location ?? "");
  }

  // AI 경기 후기 — 캐시된 값만 SSR에서 반환. 첫 생성은 클라이언트 MatchDiaryTab 에서 트리거.
  // (이전 버전은 enableAi + 캐시 miss 경기마다 getOrComputeTeamStats + generateAiMatchSummary 를
  //  await 해서 수초 블로킹. 후기는 이미 템플릿화돼 호출 지연 ~0ms 이므로 클라 비동기로 충분.)
  const aiSummary: string | null = (match?.ai_summary as string | null) ?? null;

  return {
    matches: matchRes.data ? { matches: [matchRes.data] } : { matches: [] },
    goals: { goals: goalsRes.data ?? [] },
    mvp: { votes: mvpRes.data ?? [] },
    attendanceCheck: { attendance: attendanceCheckRes.data ?? [] },
    guests: { guests: guestsRes.data ?? [] },
    internalTeams: { teams: internalTeamsRes.data ?? [] },
    diary: { diary: diaryRes.data ?? null },
    members: { members: membersRes.data ?? [] },
    team: { team: teamRes.data ?? {} },
    vote: { attendance: voteRes.data ?? [] },
    comments: { comments: commentsRes.data ?? [] },
    weather,
    aiSummary,
    aiSummaryRegenerateCount: (match as Record<string, unknown>)?.ai_summary_regenerate_count as number ?? 0,
  };
}
