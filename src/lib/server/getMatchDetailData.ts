import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autoCompleteTeamMatches, shouldAutoComplete } from "@/lib/server/autoCompleteMatches";

/**
 * SSR 블로킹 제거:
 * - (2026-04-20) AI 후기: 캐시된 match.ai_summary 만 반환. 첫 생성은 클라이언트 MatchDiaryTab 이
 *   mount 시 /api/ai/match-summary/[matchId] 를 자동 호출해 비동기 처리. 후기는 결정론적 템플릿(25차)
 *   이라 호출 지연 ~0ms.
 * - (2026-06-15) 날씨: SSR 에서 조회하지 않음. MatchInfoTab 이 initialWeather=null 일 때 /api/weather 로
 *   클라에서 보강 fetch (기존 폴백 경로). 좌표(카카오)→OpenWeather 외부 호출이 타임아웃 없이 SSR 을
 *   블로킹하던 위험 제거 + 경기 상세 진입 속도 개선.
 * - (2026-06-15) 자동종료: 메인 쿼리 앞 직렬 await → Promise.all 합류(병렬). matchRes 가 업데이트 전
 *   상태를 읽을 수 있어 shouldAutoComplete 로 in-memory 보정 (getMatchesData 와 동일 패턴).
 */
export async function getMatchDetailData(matchId: string, teamId: string, _enableAi: boolean = false, _userId: string | null = null) {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const [, matchRes, goalsRes, mvpRes, attendanceCheckRes, guestsRes, internalTeamsRes, diaryRes, membersRes, teamRes, voteRes, commentsRes] = await Promise.all([
    // 페이지 진입 시 자동 종료 트리거 — 후기 탭 새로고침만 해도 MVP 투표 활성화됨.
    // 결과 SELECT 들과 병렬 실행(이전엔 앞에서 직렬 await). matchRes 가 업데이트 전 상태를 읽을 수
    // 있으므로 아래에서 shouldAutoComplete 로 in-memory 보정.
    autoCompleteTeamMatches(db, teamId),
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
    db.from("match_attendance").select("id, match_id, user_id, member_id, vote, attendance_status, voted_at, users(id, name, preferred_positions), member:team_members(id, pre_name, user_id, coach_positions, users(id, name, preferred_positions))").eq("match_id", matchId),
    db.from("match_comments").select("id, user_id, content, created_at, users(name)").eq("match_id", matchId).order("created_at", { ascending: true }),
  ]);

  // 자동 종료 반영 — autoComplete UPDATE 가 matchRes SELECT 보다 늦게 커밋되면 SCHEDULED 로
  // 읽힐 수 있어, 표시용으로 즉시 COMPLETED 보정 (getMatchesData 와 동일 규칙. 순수 in-memory 라
  // 푸시 등 부수효과 없음 — 푸시는 autoCompleteTeamMatches 의 실제 UPDATE 경로에서만 발생).
  const rawMatch = matchRes.data;
  const match = rawMatch && shouldAutoComplete(rawMatch as Parameters<typeof shouldAutoComplete>[0])
    ? { ...rawMatch, status: "COMPLETED" as const }
    : rawMatch;

  // 날씨는 SSR 에서 조회하지 않음 (위 주석 참고). MatchInfoTab 이 /api/weather 로 클라에서 보강.

  // AI 경기 후기 — 캐시된 값만 SSR에서 반환. 첫 생성은 클라이언트 MatchDiaryTab 에서 트리거.
  const aiSummary: string | null = (match?.ai_summary as string | null) ?? null;

  return {
    matches: match ? { matches: [match] } : { matches: [] },
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
    weather: null,
    aiSummary,
    aiSummaryRegenerateCount: (match as Record<string, unknown>)?.ai_summary_regenerate_count as number ?? 0,
  };
}
