import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** 벌금 기록 조회 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const month = request.nextUrl.searchParams.get("month"); // "2026-04"

  let query = db
    .from("penalty_records")
    .select("*, rule:penalty_rules!rule_id(name, trigger_type), match:matches!match_id(match_date, opponent_name)")
    .eq("team_id", ctx.teamId)
    .order("date", { ascending: false });

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    query = query.gte("date", `${month}-01`).lte("date", `${month}-${String(lastDay).padStart(2, "0")}`);
  }

  const { data: records, error } = await query;

  if (error) return apiError(error.message);

  // member_id → users 이름 매핑 (FK 힌트 문제 우회)
  const memberIds = [...new Set((records ?? []).map((r: { member_id: string }) => r.member_id))];
  let userMap = new Map<string, string>();
  if (memberIds.length > 0) {
    const { data: users } = await db.from("users").select("id, name").in("id", memberIds);
    for (const u of users ?? []) userMap.set(u.id, u.name);
  }

  const penalties = (records ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    users: { name: userMap.get(r.member_id as string) ?? null },
  }));

  return apiSuccess({ penalties });
}

/** 벌금 상태 변경 (PAID, WAIVED 등) */
export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) return apiError("id and status required");
  if (!["UNPAID", "PAID", "WAIVED"].includes(status)) return apiError("Invalid status");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = { status, is_paid: status === "PAID" };
  if (status === "PAID") updates.date = new Date().toISOString().slice(0, 10);

  const { data, error } = await db
    .from("penalty_records")
    .update(updates)
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

/** 벌금 기록 삭제 */
export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("penalty_records")
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}

/** 벌금 자동 생성 (경기별) */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { matchId } = body;

  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 경기 정보
  const { data: match } = await db
    .from("matches")
    .select("id, match_date, opponent_name, team_id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();

  if (!match) return apiError("Match not found", 404);

  // 활성 벌금 규칙
  const { data: rules } = await db
    .from("penalty_rules")
    .select("*")
    .eq("team_id", ctx.teamId)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return apiSuccess({ created: 0 });

  // 출석 체크 데이터
  const { data: attendance } = await db
    .from("match_attendance")
    .select("user_id, member_id, vote, actually_attended, attendance_status")
    .eq("match_id", matchId);

  // 팀 활성 멤버
  const { data: members } = await db
    .from("team_members")
    .select("id, user_id")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);

  // 기존 벌금 (중복 방지)
  const { data: existing } = await db
    .from("penalty_records")
    .select("member_id, rule_id")
    .eq("match_id", matchId)
    .eq("team_id", ctx.teamId);

  const existingSet = new Set(
    (existing ?? []).map((e) => `${e.member_id}:${e.rule_id}`)
  );

  const newPenalties: {
    team_id: string;
    match_id: string;
    member_id: string;
    rule_id: string;
    amount: number;
    date: string;
    note: string;
    status: string;
    is_paid: boolean;
  }[] = [];

  const ruleMap = new Map<string, typeof rules[0]>();
  for (const rule of rules) {
    ruleMap.set(rule.trigger_type, rule);
  }

  const attendanceByUser = new Map<string, NonNullable<typeof attendance>[0]>();
  for (const a of attendance ?? []) {
    if (a.user_id) attendanceByUser.set(a.user_id, a);
  }

  const opponent = match.opponent_name ?? "경기";

  for (const member of members ?? []) {
    const userId = member.user_id;
    if (!userId) continue;

    const att = attendanceByUser.get(userId);

    // 지각 체크
    const lateRule = ruleMap.get("LATE");
    if (lateRule && att?.attendance_status === "LATE") {
      const key = `${userId}:${lateRule.id}`;
      if (!existingSet.has(key)) {
        newPenalties.push({
          team_id: ctx.teamId,
          match_id: matchId,
          member_id: userId,
          rule_id: lateRule.id,
          amount: lateRule.amount,
          date: match.match_date,
          note: `${match.match_date} vs ${opponent} 지각`,
          status: "UNPAID",
          is_paid: false,
        });
      }
    }

    // 불참 체크
    const absentRule = ruleMap.get("ABSENT");
    if (absentRule && att?.actually_attended === false) {
      const key = `${userId}:${absentRule.id}`;
      if (!existingSet.has(key)) {
        newPenalties.push({
          team_id: ctx.teamId,
          match_id: matchId,
          member_id: userId,
          rule_id: absentRule.id,
          amount: absentRule.amount,
          date: match.match_date,
          note: `${match.match_date} vs ${opponent} 불참`,
          status: "UNPAID",
          is_paid: false,
        });
      }
    }

    // 미투표 체크
    const noVoteRule = ruleMap.get("NO_VOTE");
    if (noVoteRule && !att) {
      const key = `${userId}:${noVoteRule.id}`;
      if (!existingSet.has(key)) {
        newPenalties.push({
          team_id: ctx.teamId,
          match_id: matchId,
          member_id: userId,
          rule_id: noVoteRule.id,
          amount: noVoteRule.amount,
          date: match.match_date,
          note: `${match.match_date} vs ${opponent} 미투표`,
          status: "UNPAID",
          is_paid: false,
        });
      }
    }
  }

  if (newPenalties.length > 0) {
    const { error } = await db.from("penalty_records").insert(newPenalties);
    if (error) return apiError(error.message);
  }

  return apiSuccess({ created: newPenalties.length });
}
