import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** GET: 회비 페이지에 필요한 모든 데이터를 한 번에 반환 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const [duesRes, balanceRes, settingsRes, penRulesRes, penRecordsRes] = await Promise.all([
    db
      .from("dues_records")
      .select("*, users:user_id(name), recorder:recorded_by(name)")
      .eq("team_id", ctx.teamId)
      .order("recorded_at", { ascending: false }),
    db
      .from("teams")
      .select("actual_balance, balance_updated_at")
      .eq("id", ctx.teamId)
      .single(),
    // select("*") intentional: all settings columns returned to client
    db
      .from("dues_settings")
      .select("*")
      .eq("team_id", ctx.teamId),
    // select("*") intentional: all penalty rule columns returned to client
    db
      .from("penalty_rules")
      .select("*")
      .eq("team_id", ctx.teamId),
    db
      .from("penalty_records")
      .select("*, rule:penalty_rules!rule_id(name)")
      .eq("team_id", ctx.teamId)
      .order("date", { ascending: false }),
  ]);

  return apiSuccess({
    records: duesRes.data ?? [],
    balance: balanceRes.data?.actual_balance ?? null,
    balanceUpdatedAt: balanceRes.data?.balance_updated_at ?? null,
    settings: settingsRes.data ?? [],
    penaltyRules: penRulesRes.data ?? [],
    penaltyRecords: penRecordsRes.data ?? [],
  });
}
