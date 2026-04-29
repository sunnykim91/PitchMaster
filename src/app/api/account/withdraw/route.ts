import { NextResponse } from "next/server";
import { auth, clearSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/account/withdraw
 *
 * 회원 탈퇴 — 개인정보 즉시 익명화 + soft delete (14일 후 cron 으로 hard delete).
 *
 * 흐름 (순서 중요):
 *   0. 인증·세션 검증
 *   1. 회장(PRESIDENT) 인 팀이 있으면 탈퇴 차단 — 회장 0명 상태 방지
 *   2. users 레코드 anonymize + deleted_at 설정
 *   3. 해당 사용자 전체 team_members → status='LEFT'
 *   4. push_subscriptions 즉시 삭제 (본인 기기 알림 차단)
 *   5. notifications 즉시 삭제 (개인 알림 이력)
 *   6. match_mvp_votes 즉시 삭제 (투표 익명성 유지)
 *   7. 감사 로그(account_withdrawal_log) 기록
 *   8. 세션 쿠키 clear
 *
 * 유지되는 데이터 (팀 자산):
 *   - match_goals (scorer_id/assist_id TEXT, UI 에서 "탈퇴한 회원" 노출)
 *   - match_attendance (CASCADE 이지만 users hard delete 시점까지 유지)
 *   - posts / post_comments (동일)
 *   - dues_records (user_id SET NULL 이라 이름은 날아가도 금액 이력 유지)
 *
 * cron /api/cron/hard-delete-withdrawn 이 14일 경과 row 를 물리 삭제.
 *
 * Response:
 *   204 No Content — 정상 탈퇴
 *   401 unauthorized
 *   409 president_team_exists — 회장직 보유 시 탈퇴 차단
 *   503 db_unavailable
 *   500 withdraw_failed
 */
export async function POST() {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }

  const userId = session.user.id;

  try {
    // 회장 보호: PRESIDENT 인 팀이 있으면 탈퇴 차단 (회장 0명 상태 방지)
    const { data: presidentTeams } = await db
      .from("team_members")
      .select("team_id, teams(name)")
      .eq("user_id", userId)
      .eq("role", "PRESIDENT")
      .in("status", ["ACTIVE", "DORMANT"]);

    if (presidentTeams && presidentTeams.length > 0) {
      const names = presidentTeams
        .map((t) => (t as unknown as { teams: { name: string } | null }).teams?.name)
        .filter(Boolean)
        .join(", ");
      return NextResponse.json(
        {
          error: "president_team_exists",
          message: `회장으로 운영 중인 팀이 있어 탈퇴할 수 없습니다. ${names ? `[${names}]` : ""} 다른 회원에게 회장을 이임한 뒤 다시 시도해주세요.`,
          teams: presidentTeams.map((t) => ({
            teamId: t.team_id,
            teamName: (t as unknown as { teams: { name: string } | null }).teams?.name ?? "",
          })),
        },
        { status: 409 }
      );
    }

    // 감사 로그용 kakao_id 확보 (users 익명화 전)
    const { data: existingUser } = await db
      .from("users")
      .select("kakao_id")
      .eq("id", userId)
      .single();
    const kakaoId = existingUser?.kakao_id ?? null;

    // 1. users 익명화 + soft delete
    //    - 개인 식별 필드는 모두 NULL (개인정보 즉시 파기)
    //    - name 은 "탈퇴한 회원" (NOT NULL 제약 + 경기 기록 등에서 참조)
    //    - kakao_id 유지: 14일 내 복구 시 다시 연결. unique 제약이라 중복 없음.
    const { error: usersErr } = await db
      .from("users")
      .update({
        name: "탈퇴한 회원",
        phone: null,
        birth_date: null,
        profile_image_url: null,
        preferred_positions: [],
        preferred_foot: null,
        is_profile_complete: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (usersErr) {
      console.error("[/api/account/withdraw] users 익명화 실패:", usersErr);
      return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
    }

    // 2. 팀 멤버십 전체 LEFT 처리 (활성 명단에서 제외)
    await db
      .from("team_members")
      .update({ status: "LEFT" })
      .eq("user_id", userId);

    // 3. 푸시·알림·MVP 투표 즉시 삭제 (개인 식별 가능 데이터)
    await Promise.all([
      db.from("push_subscriptions").delete().eq("user_id", userId),
      db.from("notifications").delete().eq("user_id", userId),
      // match_mvp_votes 는 voter_id / candidate_id 모두 user 로 참조
      db.from("match_mvp_votes").delete().eq("voter_id", userId),
    ]);

    // 4. 감사 로그 (best-effort, 실패해도 탈퇴는 성공 처리)
    await db
      .from("account_withdrawal_log")
      .insert({
        user_id: userId,
        kakao_id: kakaoId,
        withdrawn_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn("[/api/account/withdraw] 감사 로그 기록 실패:", error.message);
      });

    // 5. 세션 쿠키 clear
    await clearSession();

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[/api/account/withdraw] 예외:", err);
    return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
  }
}
