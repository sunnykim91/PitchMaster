import { NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** GET: 현재 팀의 가입 신청 목록 (STAFF 이상) — PENDING 우선, 최신순 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("team_join_requests")
    .select(
      "id, user_id, name, phone, position, message, status, reviewed_by, reviewed_at, created_at, updated_at"
    )
    .eq("team_id", ctx.teamId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message);

  // PENDING을 맨 앞으로 정렬
  const requests = data ?? [];
  const sorted = [
    ...requests.filter((r) => r.status === "PENDING"),
    ...requests.filter((r) => r.status !== "PENDING"),
  ];

  return apiSuccess({ requests: sorted });
}
