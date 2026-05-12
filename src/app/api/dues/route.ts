import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

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

  // 금액 검증: 양수만
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return apiError("금액은 0보다 큰 숫자여야 합니다");
  }
  if (body.type !== "INCOME" && body.type !== "EXPENSE") {
    return apiError("type은 INCOME 또는 EXPENSE여야 합니다");
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
      const incomeDate = data.recorded_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      let memberId = data.user_id;

      // user_id가 없으면 description에서 이름으로 매칭 시도
      if (!memberId && body.description) {
        const { data: members } = await db
          .from("team_members")
          .select("user_id, users(name)")
          .eq("team_id", ctx.teamId)
          .eq("status", "ACTIVE")
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

  const { error } = await db
    .from("dues_records")
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}
