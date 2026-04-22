/**
 * DuesClient initialData 타입 정의 (서버 ↔ 클라이언트 공유).
 *
 * getDuesData (서버)와 DuesClient (클라) 양쪽에서 import 해 같은 타입을 공유.
 * 타입만 포함 — 런타임 코드 없음 → "use client" 경계 영향 없음.
 */

export type ApiDuesRecord = {
  id: string;
  team_id: string;
  user_id: string | null;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  screenshot_url: string | null;
  recorded_by: string;
  recorded_at: string;
  users: { name: string } | null;
  recorder: { name: string } | null;
};

export type ApiDuesSetting = {
  id: string;
  team_id: string;
  member_type: string;
  monthly_amount: number;
  description: string | null;
  created_at: string;
};

export type ApiPenaltyRule = {
  id: string;
  team_id: string;
  name: string;
  amount: number;
  trigger_type: string;
  is_active: boolean;
};

export type ApiPenaltyRecord = {
  id: string;
  team_id: string;
  rule_id: string;
  member_id: string;
  amount: number;
  date: string;
  status: string;
  is_paid: boolean;
  note: string | null;
  rule: { name: string };
  member: { name: string };
};

export type ApiMemberRow = {
  id: string;
  user_id: string | null;
  role: string;
  pre_name: string | null;
  users: { id: string; name: string } | null;
};

export type DuesInitialData = {
  records: ApiDuesRecord[];
  balance: number | null;
  balanceUpdatedAt: string | null;
  settings: ApiDuesSetting[];
  penaltyRules: ApiPenaltyRule[];
  penaltyRecords: ApiPenaltyRecord[];
  members?: ApiMemberRow[];
};
