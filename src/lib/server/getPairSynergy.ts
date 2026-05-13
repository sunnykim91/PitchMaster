import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 페어 시너지 — 두 멤버가 같은 경기에 출석(vote=ATTEND)했을 때의 합산 전적.
 *
 * 정의:
 *   - 페어: team_members.id 쌍 (a<b 정렬, 중복 제거)
 *   - 매치 단위 카운트: 같은 경기에 한 번이라도 함께 출석하면 페어 1회 누적
 *   - 매치 결과(W/D/L): 우리 팀 골 vs 상대 골 — match_goals 집계
 *   - 시즌 범위 + REGULAR + stats_included 매치만 (records 와 동일 기준)
 *
 * 운영진 only 노출 정책 (옵션 B 정체성). 외부 공유·일반회원 노출 금지.
 */

export type PairStat = {
  memberAId: string;
  memberBId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // 0~1
};

export type PairMatrix = {
  members: { id: string; name: string }[];
  pairs: PairStat[];
  totalMatches: number;
};

const EMPTY: PairMatrix = { members: [], pairs: [], totalMatches: 0 };

export async function getPairSynergy(teamId: string): Promise<PairMatrix> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY;

  // 활성 시즌 범위 (없으면 빈 결과)
  const { data: seasons } = await db
    .from("seasons")
    .select("start_date, end_date, is_active")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });
  const active = seasons?.find((s) => s.is_active) ?? seasons?.[0] ?? null;
  if (!active) return EMPTY;

  // 시즌 완료 정규 경기
  const { data: matches } = await db
    .from("matches")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "COMPLETED")
    .eq("match_type", "REGULAR")
    .neq("stats_included", false)
    .gte("match_date", active.start_date)
    .lte("match_date", active.end_date);
  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return EMPTY;

  // 멤버 + 출석 + 골 병렬 fetch
  const [membersRes, attendRes, goalsRes] = await Promise.all([
    db.from("team_members")
      .select("id, user_id, pre_name, users(name)")
      .eq("team_id", teamId)
      .in("status", ["ACTIVE", "DORMANT"]),
    db.from("match_attendance")
      .select("match_id, user_id, member_id")
      .in("match_id", matchIds)
      .eq("vote", "ATTEND"),
    db.from("match_goals")
      .select("match_id, scorer_id, is_own_goal")
      .in("match_id", matchIds),
  ]);

  type MemberRow = { id: string; user_id: string | null; pre_name: string | null; users: { name: string } | { name: string }[] | null };
  const memberRows = (membersRes.data ?? []) as MemberRow[];

  // user_id → team_members.id 매핑 (attendance.user_id 들어올 때 변환)
  const userToMember = new Map<string, string>();
  for (const m of memberRows) {
    if (m.user_id) userToMember.set(m.user_id, m.id);
  }

  // 이름이 없는 멤버는 페어 통계에서 제외 — "이름 없음" 표시 방지
  const memberName = new Map<string, string>();
  const memberOrder: { id: string; name: string }[] = [];
  for (const m of memberRows) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const rawName = (u?.name ?? m.pre_name ?? "").trim();
    if (!rawName) continue;
    memberName.set(m.id, rawName);
    memberOrder.push({ id: m.id, name: rawName });
  }
  memberOrder.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  // 매치별 출석 멤버 집합 (team_members.id 기준, 이름 있는 멤버만)
  const attendees = new Map<string, Set<string>>();
  for (const row of attendRes.data ?? []) {
    const memberId = row.member_id ?? (row.user_id ? userToMember.get(row.user_id) : null);
    if (!memberId) continue;
    if (!memberName.has(memberId)) continue;
    if (!attendees.has(row.match_id)) attendees.set(row.match_id, new Set());
    attendees.get(row.match_id)!.add(memberId);
  }

  // 매치별 결과 (W/D/L)
  const matchResult = new Map<string, "W" | "D" | "L">();
  const matchScores = new Map<string, { our: number; opp: number }>();
  for (const g of goalsRes.data ?? []) {
    if (!matchScores.has(g.match_id)) matchScores.set(g.match_id, { our: 0, opp: 0 });
    const s = matchScores.get(g.match_id)!;
    if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
    else s.our++;
  }
  for (const mid of matchIds) {
    const s = matchScores.get(mid) ?? { our: 0, opp: 0 };
    matchResult.set(mid, s.our > s.opp ? "W" : s.our === s.opp ? "D" : "L");
  }

  // 페어별 누적
  const pairMap = new Map<string, { wins: number; draws: number; losses: number; matches: number }>();
  for (const [mid, ids] of attendees) {
    const result = matchResult.get(mid) ?? "D";
    const arr = [...ids];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i] < arr[j] ? arr[i] : arr[j];
        const b = arr[i] < arr[j] ? arr[j] : arr[i];
        const key = `${a}|${b}`;
        const cur = pairMap.get(key) ?? { wins: 0, draws: 0, losses: 0, matches: 0 };
        cur.matches++;
        if (result === "W") cur.wins++;
        else if (result === "D") cur.draws++;
        else cur.losses++;
        pairMap.set(key, cur);
      }
    }
  }

  const pairs: PairStat[] = [];
  for (const [key, stat] of pairMap) {
    const [a, b] = key.split("|");
    pairs.push({
      memberAId: a,
      memberBId: b,
      ...stat,
      winRate: stat.matches > 0 ? stat.wins / stat.matches : 0,
    });
  }

  return { members: memberOrder, pairs, totalMatches: matchIds.length };
}

/**
 * 특정 라인업(memberIds 배열) 안의 모든 페어 점수 평균.
 * 전술 탭 자동 편성 결과 검증용.
 */
export function summarizePairsForLineup(
  matrix: PairMatrix,
  memberIds: string[],
  minMatches = 2,
): { avgWinRate: number | null; goodPairs: number; weakPairs: number; sampledPairs: number } {
  if (memberIds.length < 2) return { avgWinRate: null, goodPairs: 0, weakPairs: 0, sampledPairs: 0 };

  // 빠른 lookup용 Map
  const pairLookup = new Map<string, PairStat>();
  for (const p of matrix.pairs) {
    pairLookup.set(`${p.memberAId}|${p.memberBId}`, p);
  }

  let sumRate = 0;
  let count = 0;
  let good = 0;
  let weak = 0;
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i] < memberIds[j] ? memberIds[i] : memberIds[j];
      const b = memberIds[i] < memberIds[j] ? memberIds[j] : memberIds[i];
      const p = pairLookup.get(`${a}|${b}`);
      if (!p || p.matches < minMatches) continue;
      sumRate += p.winRate;
      count++;
      if (p.winRate >= 0.6) good++;
      else if (p.winRate <= 0.3) weak++;
    }
  }
  return {
    avgWinRate: count > 0 ? sumRate / count : null,
    goodPairs: good,
    weakPairs: weak,
    sampledPairs: count,
  };
}
