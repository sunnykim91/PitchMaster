import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { findPrepaymentMatch, listPrepaymentCandidates } from "@/lib/server/findPrepaymentMatch";

/**
 * GET: 활성 면제/휴회/부상 목록 조회
 * GET ?candidates=<exemptionId> : 등록 후 수동 매칭 모달용 후보 거래 목록
 * GET ?memberCandidates=<teamMemberId> : 등록 전 폼 인라인용 — 해당 회원 최근 6개월 입금 거래
 */
export async function GET(request: NextRequest) {
  // 수동 매칭 후보 조회 분기
  if (request.nextUrl.searchParams.get("candidates")) {
    return getCandidates(request);
  }
  if (request.nextUrl.searchParams.get("memberCandidates")) {
    return getMemberRecentIncomes(request);
  }

  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("member_dues_exemptions")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ exemptions: data ?? [] });
}

/** POST: 면제/선납/휴회/부상 등록 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const {
    memberId,
    exemptionType,
    reason,
    startDate,
    endDate,
    monthlyAmount,
    periodMonths,
    actualPaidAmount,
    linkedDuesRecordId: explicitLinkedId,
  } = body;

  if (!memberId || !exemptionType || !startDate) {
    return apiError("memberId, exemptionType, startDate are required", 400);
  }

  if (!["EXEMPT", "PREPAID", "LEAVE", "INJURED"].includes(exemptionType)) {
    return apiError("exemptionType must be EXEMPT, PREPAID, LEAVE, or INJURED", 400);
  }

  if (endDate && startDate && endDate < startDate) {
    return apiError("종료일은 시작일 이후여야 합니다.", 400);
  }

  // PREPAID 전용 검증
  let prepaidFields: { monthly_amount?: number; period_months?: number; actual_paid_amount?: number } = {};
  if (exemptionType === "PREPAID") {
    if (!endDate) return apiError("선납은 종료일이 필요합니다.", 400);
    if (typeof monthlyAmount !== "number" || monthlyAmount <= 0) {
      return apiError("선납 월 회비는 0보다 커야 합니다.", 400);
    }
    if (typeof periodMonths !== "number" || periodMonths <= 0) {
      return apiError("선납 기간은 1개월 이상이어야 합니다.", 400);
    }
    if (typeof actualPaidAmount !== "number" || actualPaidAmount <= 0) {
      return apiError("받은 금액은 0보다 커야 합니다.", 400);
    }
    prepaidFields = {
      monthly_amount: monthlyAmount,
      period_months: periodMonths,
      actual_paid_amount: actualPaidAmount,
    };
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // PREPAID 매칭 — 운영진 명시 선택 우선, 없으면 자동 매칭 fallback
  let linkedDuesRecordId: string | null = null;
  if (exemptionType === "PREPAID") {
    // 1) 운영진이 폼에서 명시 선택한 경우
    if (typeof explicitLinkedId === "string" && explicitLinkedId.length > 0) {
      // 검증: 같은 팀 + INCOME + 미연결
      const { data: rec } = await db
        .from("dues_records")
        .select("id, type, team_id")
        .eq("id", explicitLinkedId)
        .eq("team_id", ctx.teamId)
        .single();
      if (!rec || rec.type !== "INCOME") {
        return apiError("선택한 입금 거래가 유효하지 않습니다", 400);
      }
      const { data: dup } = await db
        .from("member_dues_exemptions")
        .select("id")
        .eq("linked_dues_record_id", explicitLinkedId)
        .maybeSingle();
      if (dup) return apiError("이 입금은 이미 다른 선납에 연결되어 있습니다", 409);
      linkedDuesRecordId = explicitLinkedId;
    } else {
      // 2) 자동 매칭 fallback (운영진 미선택 시)
      const { data: tm } = await db
        .from("team_members")
        .select("user_id, users(name)")
        .eq("id", memberId)
        .single();
      const targetUserId = (tm?.user_id as string | null) ?? null;
      const targetName = (tm?.users as { name?: string } | null)?.name ?? "";

      const match = await findPrepaymentMatch({
        teamId: ctx.teamId,
        userId: targetUserId,
        memberName: targetName,
        amount: actualPaidAmount,
        startMonth: startDate,
      });
      if (match.matched) linkedDuesRecordId = match.recordId;
    }
  }

  const { data, error } = await db
    .from("member_dues_exemptions")
    .insert({
      team_id: ctx.teamId,
      member_id: memberId,
      exemption_type: exemptionType,
      reason: reason || null,
      start_date: startDate,
      end_date: endDate || null,
      created_by: ctx.userId,
      linked_dues_record_id: linkedDuesRecordId,
      ...prepaidFields,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess({ ...data, autoMatched: linkedDuesRecordId !== null }, 201);
}

/** PATCH: 선납 ↔ 입금 거래 수동 매칭/해제 */
export async function PATCH(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id, linkedDuesRecordId } = body as { id?: string; linkedDuesRecordId?: string | null };
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 대상 선납 조회 + PREPAID 확인
  const { data: target, error: fetchErr } = await db
    .from("member_dues_exemptions")
    .select("id, team_id, exemption_type")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .single();
  if (fetchErr || !target) return apiError("선납을 찾을 수 없습니다", 404);
  if (target.exemption_type !== "PREPAID") {
    return apiError("선납(PREPAID)에만 입금 연결이 가능합니다", 400);
  }

  // linkedDuesRecordId === null → 연결 해제
  if (linkedDuesRecordId == null) {
    const { error } = await db
      .from("member_dues_exemptions")
      .update({ linked_dues_record_id: null })
      .eq("id", id)
      .eq("team_id", ctx.teamId);
    if (error) return apiError(error.message);
    return apiSuccess({ unlinked: true });
  }

  // 연결 시도 — 입금 거래가 같은 팀 + INCOME 인지 확인
  const { data: rec } = await db
    .from("dues_records")
    .select("id, type, team_id")
    .eq("id", linkedDuesRecordId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!rec) return apiError("입금 거래를 찾을 수 없습니다", 404);
  if (rec.type !== "INCOME") return apiError("INCOME 거래만 연결할 수 있습니다", 400);

  // 다른 선납에 이미 연결된 거래는 거부 (중복 방지)
  const { data: existing } = await db
    .from("member_dues_exemptions")
    .select("id")
    .eq("linked_dues_record_id", linkedDuesRecordId)
    .neq("id", id)
    .maybeSingle();
  if (existing) return apiError("이 입금은 이미 다른 선납에 연결되어 있습니다", 409);

  const { error } = await db
    .from("member_dues_exemptions")
    .update({ linked_dues_record_id: linkedDuesRecordId })
    .eq("id", id)
    .eq("team_id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ linked: true, recordId: linkedDuesRecordId });
}

/** GET ?candidates=<exemptionId> — 수동 매칭 모달용 후보 거래 목록 */
async function getCandidates(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const exemptionId = request.nextUrl.searchParams.get("candidates");
  if (!exemptionId) return apiError("candidates(exemptionId) 파라미터 필요", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: ex } = await db
    .from("member_dues_exemptions")
    .select("id, team_id, member_id, exemption_type, actual_paid_amount, start_date")
    .eq("id", exemptionId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!ex) return apiError("선납을 찾을 수 없습니다", 404);
  if (ex.exemption_type !== "PREPAID") return apiError("선납만 후보 조회 가능", 400);

  const { data: tm } = await db
    .from("team_members")
    .select("user_id, users(name)")
    .eq("id", ex.member_id)
    .single();
  const targetUserId = (tm?.user_id as string | null) ?? null;
  const targetName = (tm?.users as { name?: string } | null)?.name ?? "";

  const candidates = await listPrepaymentCandidates({
    teamId: ctx.teamId,
    userId: targetUserId,
    memberName: targetName,
    amount: ex.actual_paid_amount ?? 0,
    startMonth: ex.start_date,
  });
  return apiSuccess({ candidates });
}

/**
 * GET ?memberCandidates=<teamMemberId>&monthsBack=<n>
 *   PREPAID 등록 폼 인라인용 — 해당 회원 최근 N개월 입금 거래 목록 (금액 무관, 미연결만).
 *   운영진이 직접 보고 선택. 기본 6개월.
 */
async function getMemberRecentIncomes(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const teamMemberId = request.nextUrl.searchParams.get("memberCandidates");
  if (!teamMemberId) return apiError("memberCandidates 파라미터 필요", 400);
  const monthsBack = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("monthsBack") ?? "6", 10) || 6, 1),
    24,
  );

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // team_members.id → user_id, name lookup
  const { data: tm } = await db
    .from("team_members")
    .select("user_id, users(name), team_id")
    .eq("id", teamMemberId)
    .single();
  if (!tm || tm.team_id !== ctx.teamId) {
    return apiError("회원을 찾을 수 없습니다", 404);
  }
  const targetUserId = (tm.user_id as string | null) ?? null;
  const targetName = (tm.users as { name?: string } | null)?.name ?? "";

  const cutoff = new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000).toISOString();

  // 회원 매칭: user_id 또는 description 이름 포함
  let query = db
    .from("dues_records")
    .select("id, amount, description, recorded_at, user_id")
    .eq("team_id", ctx.teamId)
    .eq("type", "INCOME")
    .gte("recorded_at", cutoff)
    .order("recorded_at", { ascending: false })
    .limit(50);

  if (targetUserId) {
    query = query.or(`user_id.eq.${targetUserId},description.ilike.%${targetName}%`);
  } else if (targetName) {
    query = query.ilike("description", `%${targetName}%`);
  } else {
    return apiSuccess({ candidates: [] });
  }

  const { data: rows, error } = await query;
  if (error) return apiError(error.message);

  // 이미 다른 선납에 연결된 거래 제외
  const ids = (rows ?? []).map((r) => r.id);
  let unlinkedSet = new Set(ids);
  if (ids.length > 0) {
    const { data: linked } = await db
      .from("member_dues_exemptions")
      .select("linked_dues_record_id")
      .in("linked_dues_record_id", ids);
    const linkedSet = new Set((linked ?? []).map((r) => r.linked_dues_record_id).filter(Boolean));
    unlinkedSet = new Set(ids.filter((id) => !linkedSet.has(id)));
  }

  const candidates = (rows ?? [])
    .filter((r) => unlinkedSet.has(r.id))
    .map((r) => ({
      id: r.id,
      amount: r.amount,
      description: r.description,
      recordedAt: r.recorded_at,
      userId: r.user_id,
    }));

  return apiSuccess({ candidates });
}

/** PUT: 면제 종료 (is_active = false) */
export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id } = body;
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("member_dues_exemptions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      ended_by: ctx.userId,
    })
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ended: true });
}
