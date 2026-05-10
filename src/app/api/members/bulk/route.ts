/**
 * POST /api/members/bulk
 *
 * 회원 사전 등록 일괄 처리. 카카오톡 paste 또는 CSV 업로드 결과를 받아 검증·삽입.
 *
 * Input: { entries: [{ name: string, phone?: string | null }] }
 * Output: { created, skipped, errors }
 *   - created: 신규 삽입된 행 수
 *   - skipped: 중복(같은 전화번호 이미 등록)으로 건너뛴 entries
 *   - errors: 검증 실패 entries (이름 비어있음·금지 패턴·전화번호 형식 등)
 *
 * 권한: PRESIDENT (기존 pre_register와 동일 — MEMBER_ROLE_CHANGE)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { validateSafeName } from "@/lib/validators/safeText";

const MAX_ENTRIES = 200;

interface InputEntry {
  name?: unknown;
  phone?: unknown;
}

interface ValidEntry {
  name: string;
  phone: string | null;
}

interface ErrorEntry {
  index: number;
  name: string;
  phone: string | null;
  reason: string;
}

function normalizePhone(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // 한국 휴대폰 번호: 10~11자리, 010/011/016/017/018/019 prefix
  if (digits.length < 9 || digits.length > 11) return null;
  return digits;
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MEMBER_ROLE_CHANGE);
  if (roleCheck) return roleCheck;

  const body = await request.json().catch(() => ({}));
  const rawEntries = Array.isArray(body?.entries) ? body.entries : null;
  if (!rawEntries) return apiError("entries 배열이 필요합니다", 400);
  if (rawEntries.length === 0) return apiError("등록할 회원이 없습니다", 400);
  if (rawEntries.length > MAX_ENTRIES)
    return apiError(`한 번에 ${MAX_ENTRIES}명까지 등록 가능합니다`, 400);

  const valid: ValidEntry[] = [];
  const errors: ErrorEntry[] = [];

  rawEntries.forEach((raw: InputEntry, idx: number) => {
    const rawName = String(raw?.name ?? "").trim();
    const phone = normalizePhone(raw?.phone);

    if (!rawName) {
      errors.push({ index: idx, name: "", phone, reason: "이름이 비어 있습니다" });
      return;
    }

    const nameCheck = validateSafeName(rawName, {
      maxLength: 50,
      requireMeaningful: true,
    });
    if (!nameCheck.ok) {
      errors.push({
        index: idx,
        name: rawName,
        phone,
        reason: nameCheck.reason ?? "사용할 수 없는 이름입니다",
      });
      return;
    }

    valid.push({ name: nameCheck.value, phone });
  });

  if (valid.length === 0) {
    return apiSuccess({ created: 0, skipped: [], errors });
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 중복 확인 — 같은 팀 안 (pre_phone 또는 users.phone) 이미 등록된 전화번호
  const phonesToCheck = valid.filter((v) => v.phone).map((v) => v.phone as string);
  const dupPhones = new Set<string>();
  if (phonesToCheck.length > 0) {
    const { data: existingPre } = await db
      .from("team_members")
      .select("pre_phone")
      .eq("team_id", ctx.teamId)
      .in("status", ["ACTIVE", "DORMANT"])
      .in("pre_phone", phonesToCheck);
    existingPre?.forEach((r: { pre_phone: string | null }) => {
      if (r.pre_phone) dupPhones.add(r.pre_phone);
    });

    // users 테이블에 가입된 회원 phone 도 중복으로 처리
    const { data: linkedUsers } = await db
      .from("team_members")
      .select("user_id, users(phone)")
      .eq("team_id", ctx.teamId)
      .in("status", ["ACTIVE", "DORMANT"])
      .not("user_id", "is", null);
    linkedUsers?.forEach((r: { users: { phone: string | null } | { phone: string | null }[] | null }) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      if (u?.phone && phonesToCheck.includes(u.phone)) dupPhones.add(u.phone);
    });
  }

  const skipped: { name: string; phone: string | null; reason: string }[] = [];
  const toInsert = valid.filter((v) => {
    if (v.phone && dupPhones.has(v.phone)) {
      skipped.push({ name: v.name, phone: v.phone, reason: "이미 등록된 전화번호" });
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) {
    return apiSuccess({ created: 0, skipped, errors });
  }

  const rows = toInsert.map((v) => ({
    team_id: ctx.teamId,
    user_id: null,
    role: "MEMBER" as const,
    status: "ACTIVE" as const,
    pre_name: v.name,
    pre_phone: v.phone,
  }));

  const { data: inserted, error } = await db
    .from("team_members")
    .insert(rows)
    .select();

  if (error) return apiError(error.message);

  return apiSuccess({
    created: inserted?.length ?? 0,
    skipped,
    errors,
  });
}
