import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { sendTeamPush } from "@/lib/server/sendPush";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return apiError("Database not available", 503);
  }

  // 데모 사용자 차단
  if (session.user.isDemo) {
    return apiError("데모 모드에서는 사용할 수 없는 기능입니다", 403);
  }

  const body = await request.json();
  const { teamId, name, phone, position, message } = body as {
    teamId?: string;
    name?: string;
    phone?: string;
    position?: string;
    message?: string;
  };

  if (!teamId) {
    return apiError("teamId는 필수입니다");
  }

  const userId = session.user.id;

  // 사용자 정보 조회 (kakao_id는 team_join_requests에 필수)
  const { data: userInfo } = await db
    .from("users")
    .select("kakao_id, name, phone, preferred_positions")
    .eq("id", userId)
    .single();

  if (!userInfo?.kakao_id) {
    return apiError("사용자 정보를 찾을 수 없습니다", 404);
  }

  const resolvedName = name?.trim() || userInfo.name || session.user.name || "사용자";
  const resolvedPhone = phone ?? userInfo.phone ?? null;
  const resolvedPosition = position ?? userInfo.preferred_positions?.[0] ?? null;

  // 팀 존재 여부 + is_searchable 확인
  const { data: team } = await db
    .from("teams")
    .select("id, name, is_searchable")
    .eq("id", teamId)
    .single();

  if (!team) {
    return apiError("팀을 찾을 수 없습니다", 404);
  }
  if (!team.is_searchable) {
    return apiError("가입 신청을 받지 않는 팀입니다", 403);
  }

  // 이미 해당 팀 소속(ACTIVE)인지 확인
  const { data: existing } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (existing) {
    return apiError("이미 해당 팀의 멤버입니다", 400);
  }

  // 기존 신청 내역 조회
  const { data: prevRequest } = await db
    .from("team_join_requests")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("kakao_id", userInfo.kakao_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevRequest) {
    if (prevRequest.status === "PENDING") {
      return apiError("이미 해당 팀에 가입 신청 중입니다", 409);
    }
    if (prevRequest.status === "REJECTED") {
      // REJECTED 후 재신청 → 기존 row를 PENDING으로 업데이트
      const { error } = await db
        .from("team_join_requests")
        .update({
          name: resolvedName,
          phone: resolvedPhone,
          preferred_position: resolvedPosition,
          message: message ?? null,
          status: "PENDING",
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", prevRequest.id);

      if (error) {
        return apiError(error.message);
      }

      // 운영진에게 알림 발송
      await notifyManagers(db, teamId, team.name, resolvedName);

      return apiSuccess({ ok: true, reapplied: true }, 201);
    }
  }

  // 신규 신청 INSERT
  const { error } = await db.from("team_join_requests").insert({
    team_id: teamId,
    kakao_id: userInfo.kakao_id,
    name: resolvedName,
    phone: resolvedPhone,
    preferred_position: resolvedPosition,
    message: message ?? null,
    status: "PENDING",
  });

  if (error) {
    return apiError(error.message);
  }

  // 운영진에게 알림 발송
  await notifyManagers(db, teamId, team.name, resolvedName);

  return apiSuccess({ ok: true }, 201);
}

/** 팀의 PRESIDENT/STAFF에게 가입 신청 알림 발송 */
async function notifyManagers(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  teamId: string,
  teamName: string,
  applicantName: string
) {
  // 운영진(PRESIDENT, STAFF) user_id 목록 조회
  const { data: managers } = await db
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .in("role", ["PRESIDENT", "STAFF"]);

  const managerIds = (managers ?? []).map((m) => m.user_id).filter((id): id is string => !!id);
  if (managerIds.length === 0) return;

  await sendTeamPush(teamId, {
    title: `${teamName} 가입 신청`,
    body: `${applicantName}님이 가입을 신청했습니다.`,
    url: "/members",
    userIds: managerIds,
  });
}
