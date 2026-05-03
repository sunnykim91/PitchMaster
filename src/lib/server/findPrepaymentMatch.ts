import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 선납(PREPAID) 등록 시 회비 기록(dues_records)에서 입금 거래 자동 매칭.
 *
 * 정밀도 우선 정책:
 *   - 후보가 정확히 1건일 때만 자동 매칭
 *   - 0건(미존재) 또는 2건 이상(모호) → null 반환 → 수동 매칭 UI 위임
 *
 * 매칭 우선순위:
 *   1순위: user_id 정확 일치 + amount 정확 일치 + recorded_at ±2개월
 *   2순위 (1순위 0건일 때): description에 회원 이름 포함 + amount 일치 + recorded_at ±2개월
 *
 * 잘못된 자동 매칭은 회계 데이터 오염을 일으키므로 보수적으로 동작.
 */

const MATCH_WINDOW_MONTHS = 2;

export type PrepaymentMatchInput = {
  teamId: string;
  /** 선납자 user_id. unlinked_xxx 형식이거나 null이면 description 매칭으로 fallback. */
  userId: string | null;
  memberName: string;
  /** 받은 금액 (actualPaidAmount) */
  amount: number;
  /** 시작월 YYYY-MM-01 — 이 시점 ±2개월 내 입금 후보로 한정 */
  startMonth: string;
};

export type PrepaymentMatchResult = {
  matched: true;
  recordId: string;
} | {
  matched: false;
  reason: "no_candidate" | "ambiguous" | "db_unavailable";
  candidateCount: number;
};

function shiftMonth(yyyymmdd: string, deltaMonths: number): string {
  const [y, m, d] = yyyymmdd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + deltaMonths, d || 1));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export async function findPrepaymentMatch(
  input: PrepaymentMatchInput,
): Promise<PrepaymentMatchResult> {
  const db = getSupabaseAdmin();
  if (!db) return { matched: false, reason: "db_unavailable", candidateCount: 0 };

  const startBound = shiftMonth(input.startMonth, -MATCH_WINDOW_MONTHS);
  const endBound = shiftMonth(input.startMonth, MATCH_WINDOW_MONTHS);

  // 1순위: user_id 일치 (가장 신뢰할 수 있는 매칭)
  // 이미 다른 선납에 연결된 입금은 filterUnlinked 에서 제외
  if (input.userId && !input.userId.startsWith("unlinked_")) {
    const cands = await db
      .from("dues_records")
      .select("id")
      .eq("team_id", input.teamId)
      .eq("type", "INCOME")
      .eq("user_id", input.userId)
      .eq("amount", input.amount)
      .gte("recorded_at", startBound)
      .lte("recorded_at", endBound + "T23:59:59");

    const candidateIds = (cands.data ?? []).map((r) => r.id);
    const filtered = await filterUnlinked(db, candidateIds);
    if (filtered.length === 1) return { matched: true, recordId: filtered[0] };
    if (filtered.length >= 2) return { matched: false, reason: "ambiguous", candidateCount: filtered.length };
    // 0건이면 description 매칭으로 fallback
  }

  // 2순위: description 텍스트 매칭 (user_id 매칭 실패 또는 unlinked 회원)
  if (input.memberName) {
    const byName = await db
      .from("dues_records")
      .select("id")
      .eq("team_id", input.teamId)
      .eq("type", "INCOME")
      .eq("amount", input.amount)
      .ilike("description", `%${input.memberName}%`)
      .gte("recorded_at", startBound)
      .lte("recorded_at", endBound + "T23:59:59");

    const candidateIds = (byName.data ?? []).map((r) => r.id);
    const filtered = await filterUnlinked(db, candidateIds);
    if (filtered.length === 1) return { matched: true, recordId: filtered[0] };
    if (filtered.length >= 2) return { matched: false, reason: "ambiguous", candidateCount: filtered.length };
  }

  return { matched: false, reason: "no_candidate", candidateCount: 0 };
}

/** 이미 다른 선납에 연결된 dues_record는 후보에서 제외 (중복 매칭 방지). */
async function filterUnlinked(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  candidateIds: string[],
): Promise<string[]> {
  if (candidateIds.length === 0) return [];
  const { data: linked } = await db
    .from("member_dues_exemptions")
    .select("linked_dues_record_id")
    .in("linked_dues_record_id", candidateIds);
  const linkedSet = new Set((linked ?? []).map((r) => r.linked_dues_record_id).filter(Boolean));
  return candidateIds.filter((id) => !linkedSet.has(id));
}

/**
 * 수동 매칭용 후보 목록 조회 — 모달에서 사용.
 * 자동 매칭보다 넓은 범위(±3개월·금액 ±0)로 후보 노출.
 */
export async function listPrepaymentCandidates(
  input: PrepaymentMatchInput,
): Promise<{ id: string; amount: number; description: string; recordedAt: string; userId: string | null }[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const startBound = shiftMonth(input.startMonth, -3);
  const endBound = shiftMonth(input.startMonth, 3);

  const { data } = await db
    .from("dues_records")
    .select("id, amount, description, recorded_at, user_id")
    .eq("team_id", input.teamId)
    .eq("type", "INCOME")
    .eq("amount", input.amount)
    .gte("recorded_at", startBound)
    .lte("recorded_at", endBound + "T23:59:59")
    .order("recorded_at", { ascending: false });

  const ids = (data ?? []).map((r) => r.id);
  const unlinked = new Set(await filterUnlinked(db, ids));

  return (data ?? [])
    .filter((r) => unlinked.has(r.id))
    .map((r) => ({
      id: r.id,
      amount: r.amount,
      description: r.description,
      recordedAt: r.recorded_at,
      userId: r.user_id,
    }));
}
