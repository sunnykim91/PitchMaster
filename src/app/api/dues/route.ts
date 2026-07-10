import { NextRequest, NextResponse } from "next/server";
import { getKstNow, getKstToday } from "@/lib/kstDate";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { validateFreeText } from "@/lib/validators/safeText";
import { checkMutationRateLimit } from "@/lib/server/apiRateLimit";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const memberId = request.nextUrl.searchParams.get("memberId");
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  let query = db
    .from("dues_records")
    .select("*, users:user_id(name), recorder:recorded_by(name)")
    .eq("team_id", ctx.teamId)
    .order("recorded_at", { ascending: false });

  if (memberId) {
    query = query.eq("user_id", memberId);
  }

  const { data, error } = await query;
  if (error) return apiError(error.message);
  return apiSuccess({ records: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 남용 방지: 한 사용자가 60초에 30개 초과 회비 기록 차단
  // (recorded_at은 납부일이라 과거로 backdate 시 회피 가능하나, 기본 now() 스팸은 차단)
  const rl = await checkMutationRateLimit(db, {
    table: "dues_records",
    actorColumn: "recorded_by",
    actorId: ctx.userId,
    windowSec: 60,
    max: 30,
    timeColumn: "recorded_at",
  });
  if (!rl.allowed) return apiError("요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.", 429);

  // 금액 검증: 양수만
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return apiError("금액은 0보다 큰 숫자여야 합니다");
  }
  if (body.type !== "INCOME" && body.type !== "EXPENSE") {
    return apiError("type은 INCOME 또는 EXPENSE여야 합니다");
  }

  if (body.description) {
    const descCheck = validateFreeText(body.description, { maxLength: 200, fieldLabel: "내용" });
    if (!descCheck.ok) return apiError(descCheck.reason);
  }

  const recordedAtValue = body.recordedAt ? `${body.recordedAt}T${body.recordedTime || "00:00"}:00+09:00` : new Date().toISOString();

  // 중복 체크: 같은 팀 + type + amount + description + 분 단위 시각까지 같으면 중복으로 간주 (옵션 B)
  // 분 단위로 좁힌 이유: 정상 케이스(같은 사람이 같은 날 다른 입금 두 번)는 시각이 다름.
  //                     OCR/단톡방 정리 시 두 명이 거의 동시에 같은 입금 등록하는 race 만 잡힘.
  // 범위 비교: recordedAtValue 의 분 단위 ±59초 까지 fuzzy 매칭 (recordedTime 이 '00:00' 인 경우 등 보정)
  if (body.description && body.amount) {
    const baseDate = new Date(recordedAtValue);
    const minuteStart = new Date(Math.floor(baseDate.getTime() / 60_000) * 60_000).toISOString();
    const minuteEnd = new Date(Math.floor(baseDate.getTime() / 60_000) * 60_000 + 60_000).toISOString();
    const { data: existing } = await db
      .from("dues_records")
      .select("id")
      .eq("team_id", ctx.teamId)
      .eq("type", body.type)
      .eq("amount", body.amount)
      .eq("description", body.description)
      .gte("recorded_at", minuteStart)
      .lt("recorded_at", minuteEnd)
      .limit(1);
    if (existing && existing.length > 0) {
      return apiSuccess({ duplicate: true, id: existing[0].id });
    }
  }

  const resolvedUserId = (body.userId && !body.userId.startsWith("unlinked_")) ? body.userId : null;
  const insertPayload = {
    team_id: ctx.teamId,
    user_id: resolvedUserId,
    type: body.type,
    amount: body.amount,
    description: body.description || null,
    screenshot_url: body.screenshotUrl || null,
    recorded_by: ctx.userId,
    recorded_at: recordedAtValue,
  };

  let { data, error } = await db.from("dues_records").insert(insertPayload).select().single();

  // FK 에러 시 user_id를 null로 재시도 (연동 해제/삭제된 사용자)
  if (error && resolvedUserId && error.message.includes("foreign key")) {
    ({ data, error } = await db.from("dues_records").insert({ ...insertPayload, user_id: null }).select().single());
  }

  if (error) return apiError(error.message);

  // 벌금 자동 납부 매칭: 같은 멤버 + 같은 금액 + 벌금 발생일 이후 입금
  if (body.type === "INCOME") {
    try {
      // 회비 설정 금액과 같은 입금은 '회비 납부'로 보고 벌금 자동매칭에서 제외 —
      // 회비와 우연히 같은 금액의 미납 벌금이 있으면 회비 입금이 벌금 납부로 잘못 소진되던 문제.
      const { data: feeSettings } = await db
        .from("dues_settings")
        .select("monthly_amount")
        .eq("team_id", ctx.teamId);
      const isMembershipFeeAmount = (feeSettings ?? []).some(
        (s: { monthly_amount: number | null }) => s.monthly_amount === body.amount,
      );

      if (!isMembershipFeeAmount) {
      const incomeDate = data.recorded_at ? getKstNow(new Date(data.recorded_at).getTime()).toISOString().slice(0, 10) : getKstToday();
      let memberId = data.user_id;

      // user_id가 없으면 description에서 이름으로 매칭 시도
      if (!memberId && body.description) {
        const { data: members } = await db
          .from("team_members")
          .select("user_id, users(name)")
          .eq("team_id", ctx.teamId)
          .in("status", ["ACTIVE", "DORMANT"]) // 휴면 회원이 낸 입금도 이름 매칭 (LEFT/BANNED만 제외)
          .not("user_id", "is", null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = (members ?? []).find((m: any) => {
          const name = Array.isArray(m.users) ? m.users[0]?.name : m.users?.name;
          return name && body.description.includes(name);
        });
        if (match) memberId = match.user_id;
      }

      if (!memberId) throw new Error("no member");

      // 매칭 race 방지 멱등 패턴:
      // 1) 미납 후보 최대 3개 fetch (오래된 순)
      // 2) 각각 atomic claim 시도 — UPDATE 시 status='UNPAID' 조건으로 다른 입금이 먼저 점유했으면 자연 skip
      // 3) 한 건 성공하면 종료. 우선순위 정책(가장 오래된 미납부터) 유지.
      const { data: candidates } = await db
        .from("penalty_records")
        .select("id")
        .eq("team_id", ctx.teamId)
        .eq("member_id", memberId)
        .eq("amount", body.amount)
        .eq("status", "UNPAID")
        .lte("date", incomeDate)
        .order("date", { ascending: true })
        .limit(3);

      for (const p of (candidates ?? []) as { id: string }[]) {
        const { data: claimed } = await db
          .from("penalty_records")
          .update({ status: "PAID", is_paid: true, dues_record_id: data.id })
          .eq("id", p.id)
          .eq("status", "UNPAID") // 다른 입금이 먼저 PAID 처리한 경우 0 row → next candidate
          .select("id")
          .maybeSingle();
        if (claimed) break;
      }
      } // end if (!isMembershipFeeAmount)
    } catch {
      // 벌금 매칭 실패해도 입금 내역 등록은 성공
    }
  }

  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id, type, amount, description, userId, recordedAt, recordedTime } = body;
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // amount가 전달된 경우 양수 검증
  if (amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)) {
    return apiError("금액은 0보다 큰 숫자여야 합니다");
  }

  if (description !== undefined && description !== null && description !== "") {
    const descCheck = validateFreeText(description, { maxLength: 200, fieldLabel: "내용" });
    if (!descCheck.ok) return apiError(descCheck.reason);
  }

  const updates: Record<string, unknown> = {};
  if (type) updates.type = type;
  if (amount !== undefined) updates.amount = amount;
  if (description !== undefined) updates.description = description;
  if (userId !== undefined) updates.user_id = (userId && !userId.startsWith("unlinked_")) ? userId : null;
  if (recordedAt) {
    updates.recorded_at = `${recordedAt}T${recordedTime || "00:00"}:00+09:00`;
  }

  const { data, error } = await db
    .from("dues_records")
    .update(updates)
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 이 입금으로 자동 납부처리됐던 벌금을 '미납'으로 원복 — 삭제 후에도 벌금이 PAID로 남던 문제.
  // FK가 ON DELETE SET NULL 이라 반드시 삭제 '전에' 링크를 보고 원복해야 함.
  await db
    .from("penalty_records")
    .update({ status: "UNPAID", is_paid: false, dues_record_id: null })
    .eq("dues_record_id", id)
    .eq("team_id", ctx.teamId);

  const { error } = await db
    .from("dues_records")
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}
