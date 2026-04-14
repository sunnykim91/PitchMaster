import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getDuesData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { records: [], balance: null, balanceUpdatedAt: null, settings: [], penaltyRules: [], penaltyRecords: [], members: [] };

  const [duesRes, balanceRes, settingsRes, penRulesRes, penRecordsRes, membersRes] = await Promise.all([
    db.from("dues_records")
      .select("*, users:user_id(name), recorder:recorded_by(name)")
      .eq("team_id", teamId)
      .order("recorded_at", { ascending: false }),
    db.from("teams")
      .select("actual_balance, balance_updated_at")
      .eq("id", teamId)
      .single(),
    db.from("dues_settings")
      .select("*")
      .eq("team_id", teamId),
    db.from("penalty_rules")
      .select("*")
      .eq("team_id", teamId),
    db.from("penalty_records")
      .select("*, rule:penalty_rules!rule_id(name)")
      .eq("team_id", teamId)
      .order("date", { ascending: false }),
    db.from("team_members")
      .select("id, user_id, pre_name, users(id, name), status")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"]),
  ]);

  return {
    records: duesRes.data ?? [],
    balance: balanceRes.data?.actual_balance ?? null,
    balanceUpdatedAt: balanceRes.data?.balance_updated_at ?? null,
    settings: settingsRes.data ?? [],
    penaltyRules: penRulesRes.data ?? [],
    penaltyRecords: penRecordsRes.data ?? [],
    members: membersRes.data ?? [],
  };
}
