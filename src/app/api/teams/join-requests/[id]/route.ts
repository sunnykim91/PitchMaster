import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTeamPush } from "@/lib/server/sendPush";

/** PATCH: 가입 신청 승인 / 거절 (STAFF 이상) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const body = await request.json();
  const status = body.status as string;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return apiError("Invalid status. Must be APPROVED or REJECTED.");
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 1. 가입 신청 + 팀 이름 함께 조회
  const { data: joinReq, error: fetchErr } = await db
    .from("team_join_requests")
    .select("id, team_id, user_id, name, status")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .single();

  if (fetchErr || !joinReq) return apiError("Join request not found", 404);
  if (joinReq.status !== "PENDING") return apiError("Already processed");

  // 팀 이름 조회 (알림 메시지에 사용)
  const { data: team } = await db
    .from("teams")
    .select("name")
    .eq("id", ctx.teamId)
    .single();
  const teamName = team?.name ?? "팀";

  // 2. 상태 업데이트
  const { error: updateErr } = await db
    .from("team_join_requests")
    .update({
      status,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return apiError(updateErr.message);

  // 3. 승인 시: team_members에 추가 + 신청자에게 알림
  if (status === "APPROVED") {
    const { error: memberErr } = await db.from("team_members").upsert(
      {
        team_id: ctx.teamId,
        user_id: joinReq.user_id,
        role: "MEMBER",
        status: "ACTIVE",
      },
      { onConflict: "team_id,user_id" }
    );
    if (memberErr) return apiError(memberErr.message);

    await sendTeamPush(ctx.teamId, {
      title: "가입 승인",
      body: `${teamName} 가입이 승인되었습니다!`,
      url: "/dashboard",
      userIds: [joinReq.user_id],
    });
  } else {
    // 거절 시 알림
    await sendTeamPush(ctx.teamId, {
      title: "가입 거절",
      body: `${teamName} 가입 신청이 거절되었습니다.`,
      userIds: [joinReq.user_id],
    });
  }

  return apiSuccess({ ok: true });
}
