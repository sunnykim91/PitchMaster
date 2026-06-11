import { describe, it, expect } from "vitest";
import {
  aggregateGkCleanSheets,
  buildGkAttendeesByMatch,
  isGkSlot,
  isGkPreferred,
  type GkSquadRow,
  type GkGoalRow,
} from "@/lib/server/getGoalkeeperStats";

// 헬퍼: placement 생성
const gk = (playerId: string, secondPlayerId?: string) => ({ x: 50, y: 92, playerId, ...(secondPlayerId ? { secondPlayerId } : {}) });
const field = (playerId: string) => ({ x: 30, y: 50, playerId });

function squad(match_id: string, quarter_number: number, positions: Record<string, unknown>, side: string | null = null): GkSquadRow {
  return { match_id, quarter_number, positions, side };
}
function conceded(match_id: string, quarter_number: number | null, opts: Partial<GkGoalRow> = {}): GkGoalRow {
  return { match_id, quarter_number, scorer_id: "OPPONENT", is_own_goal: false, side: null, ...opts };
}

describe("isGkSlot", () => {
  it("gk/GK 슬롯을 인식하고 필드 슬롯은 거부", () => {
    expect(isGkSlot("gk")).toBe(true);
    expect(isGkSlot("GK")).toBe(true);
    expect(isGkSlot("lcb")).toBe(false);
    expect(isGkSlot("st")).toBe(false);
  });
});

describe("aggregateGkCleanSheets", () => {
  it("① 풀쿼터 무실점 1개 → 클린시트 1, 쿼터 1", () => {
    const map = aggregateGkCleanSheets([squad("m1", 1, { gk: gk("A"), st: field("B") })], []);
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
    // 필드 선수는 집계 대상 아님
    expect(map.get("B")).toBeUndefined();
  });

  it("② 그 쿼터 실점 시 클린시트 0 (쿼터는 여전히 1)", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") })],
      [conceded("m1", 1)]
    );
    expect(map.get("A")).toEqual({ cleanSheets: 0, quarters: 1 });
  });

  it("③ 반쿼터 교체(secondPlayerId) — 무실점이면 두 키퍼 모두 +1", () => {
    const map = aggregateGkCleanSheets([squad("m1", 1, { gk: gk("A", "B") })], []);
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
    expect(map.get("B")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("④ 쿼터 미상(quarter_number null/0) 실점은 무시 — 다른 쿼터 무실점 인정", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") })],
      [conceded("m1", null), conceded("m1", 0)]
    );
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("⑤ 전술판 없는 경기(squad 없음) → 빈 맵", () => {
    const map = aggregateGkCleanSheets([], [conceded("m1", 1)]);
    expect(map.size).toBe(0);
  });

  it("⑥ GK 슬롯 없는 squad → 집계 안 함", () => {
    const map = aggregateGkCleanSheets([squad("m1", 1, { st: field("B"), lcb: field("C") })], []);
    expect(map.size).toBe(0);
  });

  it("⑦ 다쿼터 누적 — Q1 무실점 + Q2 실점", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") }), squad("m1", 2, { gk: gk("A") })],
      [conceded("m1", 2)]
    );
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 2 });
  });

  it("⑧ 자책골(is_own_goal)도 실점으로 처리", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") })],
      [{ match_id: "m1", quarter_number: 1, scorer_id: "user-x", is_own_goal: true, side: null }]
    );
    expect(map.get("A")).toEqual({ cleanSheets: 0, quarters: 1 });
  });

  it("⑨ 우리팀 득점은 클린시트에 영향 없음", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") })],
      [{ match_id: "m1", quarter_number: 1, scorer_id: "our-player", is_own_goal: false, side: null }]
    );
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("⑩ 자체전(side) — 기본 제외, includeInternal=true면 포함", () => {
    const sideSquad = [squad("m1", 1, { gk: gk("A") }, "A")];
    const excluded = aggregateGkCleanSheets(sideSquad, []);
    expect(excluded.size).toBe(0);
    const included = aggregateGkCleanSheets(sideSquad, [], { includeInternal: true });
    expect(included.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("⑪ 메타슬롯(__referee 등)은 GK로 집계하지 않음", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A"), __referee: field("REF"), __camera: field("CAM") })],
      []
    );
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
    expect(map.get("REF")).toBeUndefined();
    expect(map.get("CAM")).toBeUndefined();
  });

  it("여러 경기·여러 키퍼 종합 시나리오", () => {
    const squads = [
      squad("m1", 1, { gk: gk("A") }), // 무실점
      squad("m1", 2, { gk: gk("B") }), // 실점
      squad("m2", 1, { gk: gk("A") }), // 무실점
    ];
    const goals = [conceded("m1", 2)];
    const map = aggregateGkCleanSheets(squads, goals);
    expect(map.get("A")).toEqual({ cleanSheets: 2, quarters: 2 });
    expect(map.get("B")).toEqual({ cleanSheets: 0, quarters: 1 });
  });
});

describe("isGkPreferred", () => {
  it("선호 포지션에 GK 포함 여부", () => {
    expect(isGkPreferred(["GK"])).toBe(true);
    expect(isGkPreferred(["ST", "GK"])).toBe(true);
    expect(isGkPreferred(["ST", "CB"])).toBe(false);
    expect(isGkPreferred([])).toBe(false);
    expect(isGkPreferred(null)).toBe(false);
  });
});

describe("buildGkAttendeesByMatch", () => {
  const members = [
    { canonicalId: "U1", ids: ["U1", "M1"], isGk: true },   // GK 선호 (연동)
    { canonicalId: "M2", ids: ["M2"], isGk: true },          // GK 선호 (미연동)
    { canonicalId: "U3", ids: ["U3", "M3"], isGk: false },   // 비-GK
  ];
  it("실제 참석 GK 선호 멤버만 경기별로 묶음 (user_id/member_id 역매핑)", () => {
    const att = [
      { match_id: "m1", user_id: "U1", member_id: "M1" }, // GK U1
      { match_id: "m1", user_id: null, member_id: "M2" }, // GK M2 (미연동)
      { match_id: "m1", user_id: "U3", member_id: "M3" }, // 비-GK 제외
      { match_id: "m2", user_id: "U1", member_id: "M1" },
    ];
    const map = buildGkAttendeesByMatch(members, att);
    expect(new Set(map.get("m1"))).toEqual(new Set(["U1", "M2"]));
    expect(map.get("m2")).toEqual(["U1"]);
  });
});

describe("aggregateGkCleanSheets — 폴백(전술판 없는 경기, 쿼터 환산)", () => {
  const fb = (quarterCounts: Record<string, number>, attendees: Record<string, string[]>) => ({
    matchQuarterCounts: new Map(Object.entries(quarterCounts)),
    gkAttendeesByMatch: new Map(Object.entries(attendees)),
  });

  it("전술판 없는 무실점 경기 → GK선호 참석자에 쿼터 수만큼 인정", () => {
    const map = aggregateGkCleanSheets([], [], { fallback: fb({ m1: 4 }, { m1: ["A"] }) });
    expect(map.get("A")).toEqual({ cleanSheets: 4, quarters: 4 });
  });

  it("전술판 없는 실점 경기 → 분모(쿼터)만, 클린시트 0", () => {
    const map = aggregateGkCleanSheets([], [conceded("m1", 1)], { fallback: fb({ m1: 4 }, { m1: ["A"] }) });
    expect(map.get("A")).toEqual({ cleanSheets: 0, quarters: 4 });
  });

  it("쿼터 미상 실점이라도 경기 무실점 판정엔 포함 (그 경기는 클린시트 0)", () => {
    const map = aggregateGkCleanSheets([], [conceded("m1", null)], { fallback: fb({ m1: 4 }, { m1: ["A"] }) });
    expect(map.get("A")).toEqual({ cleanSheets: 0, quarters: 4 });
  });

  it("전술판 있는 경기는 폴백에서 제외 (이중집계 방지)", () => {
    // m1 은 전술판 존재 → 쿼터별(1쿼터)만, 폴백(4쿼터) 무시
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") })],
      [],
      { fallback: fb({ m1: 4 }, { m1: ["A"] }) }
    );
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("GK선호 참석자 2명이면 둘 다 인정", () => {
    const map = aggregateGkCleanSheets([], [], { fallback: fb({ m1: 4 }, { m1: ["A", "B"] }) });
    expect(map.get("A")).toEqual({ cleanSheets: 4, quarters: 4 });
    expect(map.get("B")).toEqual({ cleanSheets: 4, quarters: 4 });
  });

  it("quarter_count 0/누락이면 최소 1쿼터로 환산", () => {
    const map = aggregateGkCleanSheets([], [], { fallback: fb({ m1: 0 }, { m1: ["A"] }) });
    expect(map.get("A")).toEqual({ cleanSheets: 1, quarters: 1 });
  });

  it("전술판 경기(쿼터별) + 전술판 없는 경기(폴백) 합산", () => {
    const map = aggregateGkCleanSheets(
      [squad("m1", 1, { gk: gk("A") }), squad("m1", 2, { gk: gk("A") })], // m1: 전술판 2쿼터 무실점
      [],
      { fallback: fb({ m1: 4, m2: 4 }, { m2: ["A"] }) } // m2: 전술판 없음, 무실점 4쿼터 환산
    );
    expect(map.get("A")).toEqual({ cleanSheets: 6, quarters: 6 });
  });
});
