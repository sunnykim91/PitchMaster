import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS, hasMinRole } from "@/lib/permissions";
import { invalidateAuthSync } from "@/lib/auth";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const isStaff = hasMinRole(ctx.teamRole, "STAFF");

  // Staff+ see all info, members see limited info
  const select = isStaff
    ? "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, jersey_number, team_role, dormant_type, dormant_until, dormant_reason, users(id, name, birth_date, phone, preferred_positions, preferred_foot, profile_image_url)"
    : "id, user_id, role, status, joined_at, pre_name, pre_phone, dues_type, coach_positions, jersey_number, team_role, dormant_type, dormant_until, dormant_reason, users(id, name, preferred_positions)";

  // ACTIVE + DORMANT 멤버 + 팀 sport_type (평가 모달용) 동시 fetch
  const [membersRes, teamRes] = await Promise.all([
    db
      .from("team_members")
      .select(select)
      .eq("team_id", ctx.teamId)
      .in("status", ["ACTIVE", "DORMANT"]),
    db.from("teams").select("sport_type").eq("id", ctx.teamId).maybeSingle(),
  ]);

  if (membersRes.error) return apiError(membersRes.error.message);

  const rawSport = teamRes.data?.sport_type;
  const sportType: "SOCCER" | "FUTSAL" | null =
    rawSport === "SOCCER" || rawSport === "FUTSAL" ? rawSport : null;

  return apiSuccess({ members: membersRes.data, isStaff, sportType });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_ROLE_CHANGE);
  if (roleCheck) return roleCheck;

  const body = await request.json();

  // 사전 등록 (user_id 없이)
  if (body.action === "pre_register") {
    const name = String(body.name || "").trim();
    if (!name) return apiError("이름은 필수입니다");
    if (name.length > 50) return apiError("이름은 50자 이하로 입력해주세요");
    const phone = String(body.phone || "").replace(/\D/g, "") || null;

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { data, error } = await db
      .from("team_members")
      .insert({
        team_id: ctx.teamId,
        user_id: null,
        role: "MEMBER",
        status: "ACTIVE",
        pre_name: name,
        pre_phone: phone,
      })
      .select()
      .single();

    if (error) return apiError(error.message);
    return apiSuccess(data, 201);
  }

  // 수동 연동 (미연동 멤버에 실제 user_id 연결)
  if (body.action === "link") {
    const memberId = String(body.memberId || "");
    const userId = String(body.userId || "");
    if (!memberId || !userId) return apiError("memberId and userId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    // 해당 유저가 이미 이 팀에 별도 row로 가입되어 있으면 그 row 삭제
    await db
      .from("team_members")
      .delete()
      .eq("team_id", ctx.teamId)
      .eq("user_id", userId)
      .neq("id", memberId);

    const { error } = await db
      .from("team_members")
      .update({ user_id: userId, pre_name: null, pre_phone: null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  return apiError("Unknown action", 400);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();

  // 등번호 변경은 본인도 가능, 감독 지정은 운영진 이상 → 각각 별도 권한 체크
  if (body.action !== "update_jersey_number" && body.action !== "update_coach_positions") {
    const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_ROLE_CHANGE);
    if (roleCheck) return roleCheck;
  }

  // 감독 지정 포지션 변경 (운영진 이상)
  if (body.action === "update_coach_positions") {
    const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
    if (roleCheck) return roleCheck;
    const { memberId, coachPositions } = body;
    if (!memberId) return apiError("memberId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { error } = await db
      .from("team_members")
      .update({ coach_positions: coachPositions ?? null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 회원 상태 변경 (ACTIVE ↔ DORMANT, 세분화: INJURED / PERSONAL)
  if (body.action === "update_status") {
    const { memberId, status, dormantType, dormantUntil, dormantReason } = body;
    if (!memberId || !status) return apiError("memberId and status required");
    if (!["ACTIVE", "DORMANT"].includes(status)) return apiError("status must be ACTIVE or DORMANT");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const updates: Record<string, unknown> = { status };

    if (status === "DORMANT") {
      updates.dormant_type = dormantType || null;
      updates.dormant_until = dormantUntil || null;
      updates.dormant_reason = dormantReason || null;
    } else {
      // ACTIVE로 복귀 시 휴면 정보 초기화
      updates.dormant_type = null;
      updates.dormant_until = null;
      updates.dormant_reason = null;
    }

    const { error } = await db
      .from("team_members")
      .update(updates)
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 회비 유형 변경
  if (body.action === "update_dues_type") {
    const { memberId, duesType } = body;
    if (!memberId) return apiError("memberId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const { error } = await db
      .from("team_members")
      .update({ dues_type: duesType || null })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 일괄 회비 유형 변경
  if (body.action === "bulk_update_dues_type") {
    const { updates } = body as { updates: { memberId: string; duesType: string | null }[] };
    if (!updates?.length) return apiError("updates required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    const results = await Promise.all(
      updates.map((u) =>
        db.from("team_members")
          .update({ dues_type: u.duesType || null })
          .eq("id", u.memberId)
          .eq("team_id", ctx.teamId)
      )
    );
    const count = results.filter((r) => !r.error).length;
    return apiSuccess({ updated: count });
  }

  // 등번호 변경 (본인 또는 운영진)
  if (body.action === "update_jersey_number") {
    const { memberId, jerseyNumber } = body;
    if (!memberId) return apiError("memberId required");

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    // 본인이 아니면 STAFF+ 권한 필요
    const { data: target } = await db
      .from("team_members")
      .select("user_id")
      .eq("id", memberId)
      .eq("team_id", ctx.teamId)
      .single();

    if (target?.user_id !== ctx.userId && !hasMinRole(ctx.teamRole, "STAFF")) {
      return apiError("권한이 없습니다", 403);
    }

    const num = jerseyNumber === null || jerseyNumber === "" ? null : Number(jerseyNumber);
    if (num !== null && (isNaN(num) || num < 0 || num > 999)) {
      return apiError("등번호는 0~999 사이 숫자입니다");
    }

    const { error } = await db
      .from("team_members")
      .update({ jersey_number: num })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) {
      if (error.code === "23505") return apiError("이미 사용 중인 등번호입니다");
      return apiError(error.message);
    }
    return apiSuccess({ ok: true });
  }

  // 주장/부주장 지정 (운영진 전용)
  if (body.action === "update_team_role") {
    const { memberId, teamRole } = body;
    if (!memberId) return apiError("memberId required");
    if (teamRole !== null && teamRole !== "CAPTAIN" && teamRole !== "VICE_CAPTAIN") {
      return apiError("유효하지 않은 팀 역할입니다");
    }

    const db = getSupabaseAdmin();
    if (!db) return apiError("Database not available", 503);

    // 기존 동일 역할 해제 — 실패를 무시하면 새 역할 부여 후 동일 역할(주장/부주장)이 2명 남음 → 오류 시 중단
    if (teamRole) {
      const { error: clearErr } = await db
        .from("team_members")
        .update({ team_role: null })
        .eq("team_id", ctx.teamId)
        .eq("team_role", teamRole);
      if (clearErr) return apiError(clearErr.message);
    }

    const { error } = await db
      .from("team_members")
      .update({ team_role: teamRole })
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (error) return apiError(error.message);
    return apiSuccess({ ok: true });
  }

  // 기존 역할 변경
  if (!body.memberId || !body.role)
    return apiError("memberId and role required");

  const validRoles = ["PRESIDENT", "STAFF", "MEMBER"];
  if (!validRoles.includes(body.role))
    return apiError("유효하지 않은 역할입니다");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 자기 자신 역할 변경 차단 (회장이 스스로 강등하면 복구 불가)
  const { data: targetMember } = await db
    .from("team_members")
    .select("user_id, role")
    .eq("id", body.memberId)
    .eq("team_id", ctx.teamId)
    .single();

  if (targetMember?.user_id === ctx.userId) {
    return apiError(
      "본인 권한은 직접 변경할 수 없습니다. 회장 자리를 옮기려면 다른 회원에게 회장을 이임하세요 (이임 시 본인은 자동으로 운영진이 됩니다)."
    );
  }

  // 회장 보호: PRESIDENT 인 다른 회원을 STAFF·MEMBER 로 강등 금지
  if (targetMember?.role === "PRESIDENT" && body.role !== "PRESIDENT") {
    return apiError(
      "다른 회원이 회장을 강등할 수 없습니다. 회장이 직접 다른 회원에게 회장을 이임해야 합니다."
    );
  }

  // 회장 이임: 다른 회원을 PRESIDENT로 변경 시 기존 회장을 STAFF로 강등
  if (body.role === "PRESIDENT") {
    const { error: demoteError } = await db
      .from("team_members")
      .update({ role: "STAFF" })
      .eq("team_id", ctx.teamId)
      .eq("user_id", ctx.userId);

    if (demoteError) return apiError(demoteError.message);
    // 이임 시 본인(기존 회장)의 auth 캐시 무효화 — 다음 페이지 진입 시 STAFF 권한 즉시 반영
    invalidateAuthSync(ctx.userId, ctx.teamId);
  }

  const { error } = await db
    .from("team_members")
    .update({ role: body.role })
    .eq("id", body.memberId)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  // 변경된 회원의 auth 캐시 무효화 — 60초 지연 없이 즉시 새 권한 반영
  if (targetMember?.user_id) {
    invalidateAuthSync(targetMember.user_id, ctx.teamId);
  }
  return apiSuccess({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_KICK);
  if (roleCheck) return roleCheck;

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return apiError("memberId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 회장 보호: PRESIDENT 는 강퇴 금지 (회장 0명 상태 방지)
  const { data: target } = await db
    .from("team_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("team_id", ctx.teamId)
    .single();

  if (target?.role === "PRESIDENT") {
    return apiError(
      "회장은 강퇴할 수 없습니다. 회장이 직접 다른 회원에게 회장을 이임한 뒤 본인이 탈퇴하거나 강퇴해주세요."
    );
  }

  // 자기 자신 강퇴도 차단 (의도치 않은 본인 제명 방지)
  if (target?.user_id === ctx.userId) {
    return apiError("본인은 강퇴할 수 없습니다. 회원 탈퇴 기능을 이용해주세요.");
  }

  // 강퇴 시 등번호도 비운다. unique 인덱스(team_id, jersey_number)는 status 무관이라
  // 번호를 쥔 채 BANNED 되면 그 번호가 영구 점유돼 다른 회원(특히 본인 실계정)에게 재부여 불가.
  const { error } = await db
    .from("team_members")
    .update({ status: "BANNED", jersey_number: null })
    .eq("id", memberId)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  // 강퇴된 회원의 auth 캐시 무효화 — 60초 지연 없이 즉시 접근 차단
  if (target?.user_id) {
    invalidateAuthSync(target.user_id, ctx.teamId);
  }
  return apiSuccess({ ok: true });
}
