import { describe, it, expect } from "vitest";
import {
  aggregateDefenderPoints,
  mergeDefenderStats,
  computeDefenderPoints,
  isDefenderSlot,
  type DefenderSquadRow,
  type DefenderGoalRow,
  type DefenderStat,
} from "@/lib/server/getDefenderStats";

// 헬퍼: placement 생성
const at = (playerId: string, secondPlayerId?: string) => ({ x: 30, y: 75, playerId, ...(secondPlayerId ? { secondPlayerId } : {}) });

function squad(match_id: string, quarter_number: number, positions: Record<string, unknown>, side: string | null = null): DefenderSquadRow {
  return { match_id, quarter_number, positions, side };
}
function conceded(match_id: string, quarter_number: number | null, opts: Partial<DefenderGoalRow> = {}): DefenderGoalRow {
  return { match_id, quarter_number, scorer_id: "OPPONENT", is_own_goal: false, side: null, ...opts };
}
// 기대값 헬퍼 — 통합 산식: 필드수비 무실점 쿼터 1개당 1점 (키퍼는 호출부에서 ×2)
const stat = (cleanQuarters: number): DefenderStat => ({
  cleanQuarters,
  points: computeDefenderPoints(cleanQuarters),
});

describe("isDefenderSlot", () => {
  it("센터백·풀백·윙백 슬롯을 인식 (소문자·대문자 모두)", () => {
    for (const s of ["cb", "lcb", "rcb", "lb", "rb", "lwb", "rwb", "CB", "LWB"]) {
      expect(isDefenderSlot(s)).toBe(true);
    }
  });
  it("GK·미드·공격·수비형미드·풋살FIXO·메타슬롯은 거부", () => {
    for (const s of ["gk", "cm", "lcm", "ldm", "rdm", "cdm", "cam", "st", "lw", "fixo", "__referee", "__camera"]) {
      expect(isDefenderSlot(s)).toBe(false);
    }
  });
});

describe("computeDefenderPoints", () => {
  it("무실점 쿼터 ×1 (경기 보너스 없음 — 통합 산식)", () => {
    expect(computeDefenderPoints(0)).toBe(0);
    expect(computeDefenderPoints(8)).toBe(8);
    expect(computeDefenderPoints(1)).toBe(1);
  });
});

describe("aggregateDefenderPoints", () => {
  it("① 무실점 쿼터 1개 → 쿼터 1·포인트 1 (그 쿼터에 선 수비수 전원)", () => {
    const map = aggregateDefenderPoints([squad("m1", 1, { lcb: at("A"), rcb: at("B"), gk: at("K"), st: at("F") })], []);
    expect(map.get("A")).toEqual(stat(1));
    expect(map.get("B")).toEqual(stat(1));
    // GK·공격수는 대상 아님
    expect(map.get("K")).toBeUndefined();
    expect(map.get("F")).toBeUndefined();
  });

  it("② 그 쿼터 실점 → 쿼터 0 → Map 미포함 (가산 전용)", () => {
    const map = aggregateDefenderPoints([squad("m1", 1, { lcb: at("A") })], [conceded("m1", 1)]);
    expect(map.get("A")).toBeUndefined();
  });

  it("③ 반쿼터 교체(secondPlayerId) — 무실점이면 두 수비수 모두 +1", () => {
    const map = aggregateDefenderPoints([squad("m1", 1, { lcb: at("A", "B") })], []);
    expect(map.get("A")).toEqual(stat(1));
    expect(map.get("B")).toEqual(stat(1));
  });

  it("④ 쿼터 미상 실점(null) → 특정 쿼터에 귀속 못함 → 그 쿼터는 무실점으로 잡힘(부정확·가산 편향만)", () => {
    // m1 Q1 에 수비 A. 실점은 있으나 쿼터 미상(null) → Q1 은 무실점 쿼터로 잡힘.
    const map = aggregateDefenderPoints([squad("m1", 1, { lcb: at("A") })], [conceded("m1", null)]);
    expect(map.get("A")).toEqual(stat(1));
  });

  it("⑤ 전술판 없는 경기(squad 없음) → 빈 맵 (폴백 없음)", () => {
    const map = aggregateDefenderPoints([], [conceded("m1", 1)]);
    expect(map.size).toBe(0);
  });

  it("⑥ 수비 슬롯 없는 squad(GK·공격만) → 빈 맵", () => {
    const map = aggregateDefenderPoints([squad("m1", 1, { gk: at("K"), st: at("F") })], []);
    expect(map.size).toBe(0);
  });

  it("⑦ 다쿼터 무실점 경기 — Q1·Q2 모두 무실점 → 쿼터 2·포인트 2", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A") }), squad("m1", 2, { lcb: at("A") })],
      []
    );
    expect(map.get("A")).toEqual(stat(2));
  });

  it("⑧ Q1 무실점 + Q2 실점 → 쿼터 1·포인트 1", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A") }), squad("m1", 2, { lcb: at("A") })],
      [conceded("m1", 2)]
    );
    expect(map.get("A")).toEqual(stat(1));
  });

  it("⑨ 자책골(is_own_goal)도 실점으로 처리", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A") })],
      [{ match_id: "m1", quarter_number: 1, scorer_id: "user-x", is_own_goal: true, side: null }]
    );
    expect(map.get("A")).toBeUndefined();
  });

  it("⑩ 우리팀 득점은 수비 포인트에 영향 없음", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A") })],
      [{ match_id: "m1", quarter_number: 1, scorer_id: "our-player", is_own_goal: false, side: null }]
    );
    expect(map.get("A")).toEqual(stat(1));
  });

  it("⑪ 자체전(side) — 기본 제외, includeInternal=true 면 포함", () => {
    const sideSquad = [squad("m1", 1, { lcb: at("A") }, "A")];
    expect(aggregateDefenderPoints(sideSquad, []).size).toBe(0);
    const included = aggregateDefenderPoints(sideSquad, [], { includeInternal: true });
    expect(included.get("A")).toEqual(stat(1));
  });

  it("⑫ 메타슬롯(__referee 등)은 수비로 집계하지 않음", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A"), __referee: at("REF"), __camera: at("CAM") })],
      []
    );
    expect(map.get("A")).toEqual(stat(1));
    expect(map.get("REF")).toBeUndefined();
    expect(map.get("CAM")).toBeUndefined();
  });

  it("⑬ 서로 다른 쿼터에 다른 수비수가 서면 각자 그 쿼터만 인정", () => {
    const map = aggregateDefenderPoints(
      [squad("m1", 1, { lcb: at("A") }), squad("m1", 2, { lcb: at("B") })],
      []
    );
    expect(map.get("A")).toEqual(stat(1));
    expect(map.get("B")).toEqual(stat(1));
  });

  it("⑭ 여러 경기 종합 — m1 무실점(2쿼터), m2 Q1 무실점·Q2 실점 → 쿼터 3·포인트 3", () => {
    const map = aggregateDefenderPoints(
      [
        squad("m1", 1, { lcb: at("A") }),
        squad("m1", 2, { lcb: at("A") }),
        squad("m2", 1, { lcb: at("A") }),
        squad("m2", 2, { lcb: at("A") }),
      ],
      [conceded("m2", 2)]
    );
    // m1: 쿼터 2 무실점. m2: Q1 무실점(+1), Q2 실점(0) → 쿼터 3, 포인트 3
    expect(map.get("A")).toEqual(stat(3));
  });
});

describe("mergeDefenderStats — [user_id, member_id] 두 키 합산", () => {
  it("한 선수가 같은 경기 쿼터를 두 키로 나눠 가져도 쿼터는 단순 합산 (한 쿼터 한 슬롯이라 중복 불가)", () => {
    // 카카오 연동 전환으로 같은 경기 m1 의 쿼터가 user_id(U)·member_id(M) 두 키로 분산.
    const defMap = new Map<string, DefenderStat>([
      ["U", stat(2)], // 연동 쿼터 2개
      ["M", stat(1)], // 미연동 쿼터 1개
    ]);
    expect(mergeDefenderStats(defMap, ["U", "M"])).toEqual({ cleanQuarters: 3, points: 3 });
  });

  it("서로 다른 경기 쿼터도 합산", () => {
    const defMap = new Map<string, DefenderStat>([
      ["U", stat(2)],
      ["M", stat(2)],
    ]);
    expect(mergeDefenderStats(defMap, ["U", "M"])).toEqual({ cleanQuarters: 4, points: 4 });
  });

  it("한 키만 존재하면 그대로", () => {
    const defMap = new Map<string, DefenderStat>([["U", stat(3)]]);
    expect(mergeDefenderStats(defMap, ["U", "M"])).toEqual({ cleanQuarters: 3, points: 3 });
  });

  it("어느 키도 없으면 0점", () => {
    expect(mergeDefenderStats(new Map(), ["X", "Y"])).toEqual({ cleanQuarters: 0, points: 0 });
  });
});
