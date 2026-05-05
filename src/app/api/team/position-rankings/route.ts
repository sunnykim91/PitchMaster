import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AttributeCode,
  AttributeCategory,
  SportType,
} from "@/lib/playerAttributes/types";

const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];
const TOP_PER_GROUP = 3;
const MIN_SAMPLES_FOR_RANK = 5; // 평가 5건 미만이면 랭킹 제외 (신뢰도)

type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

const GROUP_LABELS: Record<PositionGroup, string> = {
  GK: "골키퍼",
  DEF: "수비수",
  MID: "미드필더",
  FWD: "공격수",
};

const POSITION_TO_GROUP: Record<string, PositionGroup> = {
  GK: "GK",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  LCB: "DEF", RCB: "DEF", SW: "DEF",
  DM: "MID", CM: "MID", AM: "MID", LM: "MID", RM: "MID",
  LCM: "MID", RCM: "MID", LDM: "MID", RDM: "MID", LAM: "MID", RAM: "MID",
  LW: "FWD", RW: "FWD", ST: "FWD", CF: "FWD",
  LST: "FWD", RST: "FWD", LF: "FWD", RF: "FWD",
};

function classifyGroup(pos: string | null | undefined): PositionGroup | null {
  if (!pos) return null;
  return POSITION_TO_GROUP[pos.toUpperCase()] ?? null;
}

interface ScoreRow {
  user_id: string;
  attribute_code: AttributeCode;
  weighted_avg: number;
  sample_count: number;
}

interface CodeRow {
  code: AttributeCode;
  category: AttributeCategory;
}

interface UserRow {
  id: string;
  name: string | null;
  profile_image_url: string | null;
  preferred_positions: string[] | null;
}

interface MemberRanking {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  position: string;
  overall: number;
  top_category: AttributeCategory | null;
  sample_count: number;
}

interface GroupResponse {
  group: PositionGroup;
  label: string;
  members: MemberRanking[];
}

/**
 * Phase 3 (1차) — 팀 포지션별 PitchScore TOP 3.
 *
 * 그룹: 4그룹 (GK / DEF / MID / FWD) — preferred_positions[0] 으로 분류.
 * 정렬: 종합 PitchScore (22 능력치 weighted_avg 평균) 내림차순.
 * 신뢰도: MIN_SAMPLES_FOR_RANK 미만 멤버 제외.
 *
 * 권한: Feature Flag 통과 사용자만 (route 레벨 검증 X — 서버 컴포넌트에서 게이팅).
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const teamIdParam = request.nextUrl.searchParams.get("team_id");
  const teamId = teamIdParam ?? ctx.teamId;
  if (!teamId) return apiError("팀 정보가 없습니다", 400);

  // sport_type 결정
  const sportParam = request.nextUrl.searchParams.get("sport");
  let sportType: SportType;
  if (sportParam && VALID_SPORTS.includes(sportParam as SportType)) {
    sportType = sportParam as SportType;
  } else {
    const { data: team } = await sb
      .from("teams")
      .select("sport_type")
      .eq("id", teamId)
      .maybeSingle();
    const t = team?.sport_type;
    sportType = t === "SOCCER" || t === "FUTSAL" ? (t as SportType) : "SOCCER";
  }

  // 같은 팀 ACTIVE 멤버
  const { data: members, error: memErr } = await sb
    .from("team_members")
    .select(`
      user_id,
      users:user_id (
        id, name, profile_image_url, preferred_positions
      )
    `)
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);
  if (memErr) return apiError(memErr.message, 500);

  const memberMap = new Map<string, UserRow>();
  for (const row of (members ?? []) as Array<{ user_id: string | null; users: UserRow | UserRow[] | null }>) {
    if (!row.user_id) continue;
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    if (u) memberMap.set(row.user_id, u);
  }

  if (memberMap.size === 0) {
    return apiSuccess({
      groups: (["GK", "DEF", "MID", "FWD"] as PositionGroup[]).map((g) => ({
        group: g,
        label: GROUP_LABELS[g],
        members: [],
      })),
      sport_type: sportType,
    });
  }

  // 능력치 점수 + 카테고리 메타 동시 fetch
  const userIds = [...memberMap.keys()];
  const [scoresRes, codesRes] = await Promise.all([
    sb
      .from("player_attribute_scores")
      .select("user_id, attribute_code, weighted_avg, sample_count")
      .eq("sport_type", sportType)
      .in("user_id", userIds),
    sb.from("player_attribute_codes").select("code, category"),
  ]);

  if (scoresRes.error) return apiError(scoresRes.error.message, 500);
  if (codesRes.error) return apiError(codesRes.error.message, 500);

  const codeToCategory = new Map<AttributeCode, AttributeCategory>();
  for (const c of (codesRes.data ?? []) as CodeRow[]) {
    codeToCategory.set(c.code, c.category);
  }

  // user_id 별 종합 + 카테고리별 평균
  const aggrByUser = new Map<
    string,
    {
      sum: number;
      count: number;
      maxSample: number;
      catSums: Map<AttributeCategory, { sum: number; count: number }>;
    }
  >();
  for (const r of (scoresRes.data ?? []) as ScoreRow[]) {
    const existing = aggrByUser.get(r.user_id) ?? {
      sum: 0,
      count: 0,
      maxSample: 0,
      catSums: new Map<AttributeCategory, { sum: number; count: number }>(),
    };
    existing.sum += r.weighted_avg;
    existing.count += 1;
    existing.maxSample = Math.max(existing.maxSample, r.sample_count);
    const cat = codeToCategory.get(r.attribute_code);
    if (cat) {
      const c = existing.catSums.get(cat) ?? { sum: 0, count: 0 };
      c.sum += r.weighted_avg;
      c.count += 1;
      existing.catSums.set(cat, c);
    }
    aggrByUser.set(r.user_id, existing);
  }

  // 그룹별 멤버 모으기
  const groupMembers = new Map<PositionGroup, MemberRanking[]>();
  for (const g of ["GK", "DEF", "MID", "FWD"] as PositionGroup[]) {
    groupMembers.set(g, []);
  }

  for (const [uid, user] of memberMap) {
    const firstPos = user.preferred_positions?.[0];
    const group = classifyGroup(firstPos);
    if (!group) continue;

    const aggr = aggrByUser.get(uid);
    if (!aggr || aggr.count === 0) continue;
    if (aggr.maxSample < MIN_SAMPLES_FOR_RANK) continue;

    const overall = aggr.sum / aggr.count;

    // top category — 평균 점수 가장 높은 카테고리
    let topCategory: AttributeCategory | null = null;
    let topAvg = -Infinity;
    for (const [cat, { sum, count }] of aggr.catSums) {
      if (count === 0) continue;
      const avg = sum / count;
      if (avg > topAvg) {
        topAvg = avg;
        topCategory = cat;
      }
    }

    groupMembers.get(group)!.push({
      user_id: uid,
      name: user.name ?? "이름 없음",
      profile_image_url: user.profile_image_url ?? null,
      position: firstPos!,
      overall: Math.round(overall * 100) / 100,
      top_category: topCategory,
      sample_count: aggr.maxSample,
    });
  }

  // 각 그룹 정렬 + TOP N 슬라이스
  const groups: GroupResponse[] = (["GK", "DEF", "MID", "FWD"] as PositionGroup[]).map((g) => {
    const arr = groupMembers.get(g) ?? [];
    arr.sort((a, b) => b.overall - a.overall);
    return {
      group: g,
      label: GROUP_LABELS[g],
      members: arr.slice(0, TOP_PER_GROUP),
    };
  });

  return apiSuccess({ groups, sport_type: sportType });
}
