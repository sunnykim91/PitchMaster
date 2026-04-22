import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ApiDuesRecord,
  ApiDuesSetting,
  ApiPenaltyRule,
  ApiPenaltyRecord,
  ApiMemberRow,
  DuesInitialData,
} from "@/app/(app)/dues/initialData.types";

export async function getDuesData(teamId: string): Promise<DuesInitialData> {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      records: [],
      balance: null,
      balanceUpdatedAt: null,
      settings: [],
      penaltyRules: [],
      penaltyRecords: [],
      members: [],
    };
  }

  const [duesRes, balanceRes, settingsRes, penRulesRes, penRecordsRes, membersRes] = await Promise.all([
    db.from("dues_records")
      .select("*, users:user_id(name), recorder:recorded_by(name)")
      .eq("team_id", teamId)
      .order("recorded_at", { ascending: false })
      .returns<ApiDuesRecord[]>(),
    db.from("teams")
      .select("actual_balance, balance_updated_at")
      .eq("id", teamId)
      .single<{ actual_balance: number | null; balance_updated_at: string | null }>(),
    db.from("dues_settings")
      .select("*")
      .eq("team_id", teamId)
      .returns<ApiDuesSetting[]>(),
    db.from("penalty_rules")
      .select("*")
      .eq("team_id", teamId)
      .returns<ApiPenaltyRule[]>(),
    db.from("penalty_records")
      .select("*, rule:penalty_rules!rule_id(name)")
      .eq("team_id", teamId)
      .order("date", { ascending: false })
      .returns<ApiPenaltyRecord[]>(),
    db.from("team_members")
      .select("id, user_id, pre_name, users(id, name), status")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"])
      .returns<ApiMemberRow[]>(),
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
