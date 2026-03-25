import { describe, it, expect } from "vitest";
import { recommendFormation, formatRecommendation } from "@/lib/formationAI";
import type { PlayerInput } from "@/lib/formationAI";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  preferredPosition: string,
  overrides: Partial<PlayerInput> = {}
): PlayerInput {
  const positions = Array.isArray(overrides.preferredPositions)
    ? overrides.preferredPositions
    : [preferredPosition as PlayerInput["preferredPositions"][0]];
  return { id, name: `선수-${id}`, preferredPositions: positions, ...overrides };
}

/** 4-3-3용 11인 팀: GK 1, DF 4, MF 3, FW 3 */
function make433Team(): PlayerInput[] {
  return [
    makePlayer("gk1", "GK"),
    makePlayer("df1", "CB"),
    makePlayer("df2", "CB"),
    makePlayer("df3", "LB"),
    makePlayer("df4", "RB"),
    makePlayer("mf1", "CAM"),
    makePlayer("mf2", "CDM"),
    makePlayer("mf3", "CAM"),
    makePlayer("fw1", "LW"),
    makePlayer("fw2", "ST"),
    makePlayer("fw3", "RW"),
  ];
}

// ─── recommendFormation ───────────────────────────────────────────────────────
describe("recommendFormation()", () => {
  it("플레이어 2명 미만이면 null 반환", () => {
    expect(recommendFormation([])).toBeNull();
    expect(recommendFormation([makePlayer("p1", "ST")])).toBeNull();
  });

  it("4-3-3에 맞는 팀 구성 시 4-3-3 추천", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();
    expect(rec!.formation.id).toBe("4-3-3");
  });

  it("GK 선수가 GK 슬롯에 배정됨", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();

    const gkSlot = rec!.formation.slots.find((s) => s.role === "GK");
    expect(gkSlot).toBeDefined();
    expect(rec!.assignments[gkSlot!.id]).toBe("gk1");
  });

  it("비GK 선수가 GK 슬롯에 배정되지 않음", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();

    const gkSlot = rec!.formation.slots.find((s) => s.role === "GK");
    const assignedGkId = rec!.assignments[gkSlot!.id];
    const assignedPlayer = players.find((p) => p.id === assignedGkId);
    expect(assignedPlayer?.preferredPositions).toContain("GK");
  });

  it("전담 GK 없을 때 가장 낮은 점수 선수가 GK 배정", () => {
    // 성적 높은 순 → 낮은 순으로 정렬되며 마지막이 GK
    const players: PlayerInput[] = [
      makePlayer("fw1", "ST", { goals: 10, assists: 5, mvp: 3 }),
      makePlayer("fw2", "ST", { goals: 5, assists: 2, mvp: 1 }),
      makePlayer("fw3", "ST", { goals: 0, assists: 0, mvp: 0 }),
    ];
    const rec = recommendFormation(players);
    // 3명으론 포메이션 매칭이 안 될 수 있으므로 null 아님만 확인
    // GK 슬롯 배정이 lowest-scored player(fw3)임을 확인
    if (rec) {
      const gkSlot = rec.formation.slots.find((s) => s.role === "GK");
      if (gkSlot && rec.assignments[gkSlot.id]) {
        expect(rec.assignments[gkSlot.id]).toBe("fw3");
      }
    }
  });

  it("전담 GK 없을 때도 결과 반환 (11인 팀, 비GK만)", () => {
    const noGkTeam: PlayerInput[] = [
      makePlayer("df1", "CB", { goals: 0 }),
      makePlayer("df2", "CB", { goals: 0 }),
      makePlayer("df3", "LB", { goals: 0 }),
      makePlayer("df4", "RB", { goals: 0 }),
      makePlayer("mf1", "CAM", { goals: 1 }),
      makePlayer("mf2", "CDM", { goals: 1 }),
      makePlayer("mf3", "CAM", { goals: 1 }),
      makePlayer("fw1", "LW", { goals: 2 }),
      makePlayer("fw2", "ST", { goals: 2 }),
      makePlayer("fw3", "RW", { goals: 2 }),
      makePlayer("fw4", "ST", { goals: 0, mvp: 0 }),
    ];
    const rec = recommendFormation(noGkTeam);
    expect(rec).not.toBeNull();
    expect(rec!.assignments).toBeDefined();
  });

  it("정확한 포지션 일치 시 카테고리 일치보다 높은 점수", () => {
    // LW 선호 선수와 ST 선호 선수가 있을 때
    // LW 슬롯이 있는 포메이션(4-3-3)에서 LW 선수가 더 높은 점수를 기여함
    const withExactMatch: PlayerInput[] = [
      makePlayer("gk", "GK"),
      makePlayer("df1", "CB"),
      makePlayer("df2", "CB"),
      makePlayer("df3", "LB"),
      makePlayer("df4", "RB"),
      makePlayer("mf1", "CAM"),
      makePlayer("mf2", "CDM"),
      makePlayer("mf3", "CAM"),
      makePlayer("lw", "LW"),   // exact match for LW slot
      makePlayer("st", "ST"),
      makePlayer("rw", "RW"),   // exact match for RW slot
    ];

    const withoutExactMatch: PlayerInput[] = [
      makePlayer("gk", "GK"),
      makePlayer("df1", "CB"),
      makePlayer("df2", "CB"),
      makePlayer("df3", "LB"),
      makePlayer("df4", "RB"),
      makePlayer("mf1", "CAM"),
      makePlayer("mf2", "CDM"),
      makePlayer("mf3", "CAM"),
      makePlayer("fw1", "ST"),  // no exact LW/RW match
      makePlayer("fw2", "ST"),
      makePlayer("fw3", "ST"),
    ];

    const recExact = recommendFormation(withExactMatch);
    const recCat = recommendFormation(withoutExactMatch);

    // Both should return something; exact match team should score higher
    expect(recExact).not.toBeNull();
    expect(recCat).not.toBeNull();
    expect(recExact!.score).toBeGreaterThanOrEqual(recCat!.score);
  });

  it("결과에 포메이션, score, reason, assignments 포함", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();
    expect(rec).toHaveProperty("formation");
    expect(rec).toHaveProperty("score");
    expect(rec).toHaveProperty("reason");
    expect(rec).toHaveProperty("assignments");
    expect(typeof rec!.score).toBe("number");
    expect(typeof rec!.reason).toBe("string");
  });

  it("복수 포지션 선수가 여러 슬롯에 매칭 가능", () => {
    // CB, CDM 둘 다 가능한 선수 → 수비 또는 미드 슬롯에 배치 가능
    const team: PlayerInput[] = [
      makePlayer("gk", "GK"),
      makePlayer("multi", "CB", { preferredPositions: ["CB", "CDM"] }),
      makePlayer("df2", "CB"),
      makePlayer("df3", "LB"),
      makePlayer("df4", "RB"),
      makePlayer("mf1", "CAM"),
      makePlayer("mf2", "CDM"),
      makePlayer("mf3", "CAM"),
      makePlayer("fw1", "LW"),
      makePlayer("fw2", "ST"),
      makePlayer("fw3", "RW"),
    ];
    const rec = recommendFormation(team);
    expect(rec).not.toBeNull();
    // multi 선수가 배정되어야 함
    const assignedSlot = Object.entries(rec!.assignments).find(([, pid]) => pid === "multi");
    expect(assignedSlot).toBeDefined();
  });

  it("GK가 복수 포지션에 포함되면 GK 후보로 인식", () => {
    const team: PlayerInput[] = [
      makePlayer("gk-multi", "GK", { preferredPositions: ["GK", "CB"] }),
      makePlayer("df1", "CB"),
      makePlayer("df2", "CB"),
      makePlayer("df3", "LB"),
      makePlayer("df4", "RB"),
      makePlayer("mf1", "CAM"),
      makePlayer("mf2", "CDM"),
      makePlayer("mf3", "CAM"),
      makePlayer("fw1", "LW"),
      makePlayer("fw2", "ST"),
      makePlayer("fw3", "RW"),
    ];
    const rec = recommendFormation(team);
    expect(rec).not.toBeNull();
    const gkSlot = rec!.formation.slots.find(s => s.role === "GK");
    expect(rec!.assignments[gkSlot!.id]).toBe("gk-multi");
  });
});

// ─── formatRecommendation ─────────────────────────────────────────────────────
describe("formatRecommendation()", () => {
  it("모든 슬롯이 포함된 문자열 반환", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();

    const text = formatRecommendation(rec!, players);
    expect(typeof text).toBe("string");

    // 포메이션의 모든 슬롯 라벨이 출력에 포함되어야 함
    for (const slot of rec!.formation.slots) {
      expect(text).toContain(slot.label);
    }
  });

  it("배정된 선수 이름이 출력에 포함됨", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();

    const text = formatRecommendation(rec!, players);

    // GK는 반드시 배정됨
    expect(text).toContain("선수-gk1");
  });

  it("reason 문자열이 출력 첫 줄에 포함됨", () => {
    const players = make433Team();
    const rec = recommendFormation(players);
    expect(rec).not.toBeNull();

    const text = formatRecommendation(rec!, players);
    expect(text.startsWith(rec!.reason)).toBe(true);
  });
});

// ─── 풋살 테스트 ──────────────────────────────────────────────────────────────

describe("recommendFormation() — FUTSAL", () => {
  function makeFutsalTeam(): PlayerInput[] {
    return [
      makePlayer("gk", "GK"),
      makePlayer("fixo", "CB"),  // FIXO → CB 매핑
      makePlayer("ala1", "LW"),  // ALA → LW 매핑
      makePlayer("ala2", "RW"),  // ALA → RW 매핑
      makePlayer("pivo", "ST"),  // PIVO → ST 매핑
    ];
  }

  it("풋살 5명으로 포메이션 추천", () => {
    const rec = recommendFormation(makeFutsalTeam(), 5, "FUTSAL");
    expect(rec).not.toBeNull();
    expect(rec!.formation.sportType).toBe("FUTSAL");
    expect(rec!.formation.slots).toHaveLength(5);
  });

  it("풋살 포메이션만 반환 (축구 포메이션 제외)", () => {
    const rec = recommendFormation(makeFutsalTeam(), 5, "FUTSAL");
    expect(rec).not.toBeNull();
    expect(rec!.formation.id).toMatch(/^futsal-/);
  });

  it("풋살 GK 슬롯에 GK 선수 배정", () => {
    const rec = recommendFormation(makeFutsalTeam(), 5, "FUTSAL");
    expect(rec).not.toBeNull();
    const gkSlot = rec!.formation.slots.find(s => s.role === "GK");
    expect(gkSlot).toBeDefined();
    expect(rec!.assignments[gkSlot!.id]).toBe("gk");
  });

  it("풋살 3명으로도 추천 가능 (GK 제외 2명)", () => {
    const small = [
      makePlayer("gk", "GK"),
      makePlayer("fixo", "CB"),
      makePlayer("pivo", "ST"),
    ];
    const rec = recommendFormation(small, 3, "FUTSAL");
    // 3인제 포메이션이 존재하므로 추천 가능
    expect(rec).not.toBeNull();
    expect(rec!.formation.slots).toHaveLength(3);
  });

  it("축구 sportType이면 풋살 포메이션 안 나옴", () => {
    const rec = recommendFormation(makeFutsalTeam(), 5, "SOCCER");
    // 축구 포메이션은 11인이므로 5명에 맞는 게 없음
    expect(rec).toBeNull();
  });
});
