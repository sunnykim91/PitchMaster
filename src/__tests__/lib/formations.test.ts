import { describe, it, expect } from "vitest";
import { formationTemplates, getFormationsForSport, getFormationsForSportAndCount, getFutsalFieldCounts } from "@/lib/formations";

describe("formationTemplates", () => {
  it("축구 10개 + 풋살 다수 포메이션 정의", () => {
    expect(getFormationsForSport("SOCCER")).toHaveLength(10);
    expect(getFormationsForSport("FUTSAL").length).toBeGreaterThanOrEqual(3);
    expect(formationTemplates.length).toBe(
      getFormationsForSport("SOCCER").length + getFormationsForSport("FUTSAL").length
    );
  });

  it("새 축구 포메이션 5종(4-1-4-1, 4-5-1, 5-3-2, 3-4-2-1, 4-3-2-1) 존재", () => {
    const expected = ["4-1-4-1", "4-5-1", "5-3-2", "3-4-2-1", "4-3-2-1"];
    for (const id of expected) {
      const f = formationTemplates.find((t) => t.id === id);
      expect(f, `${id} 포메이션이 없음`).toBeDefined();
      expect(f!.sportType).toBe("SOCCER");
      expect(f!.slots).toHaveLength(11);
      expect(f!.slots.filter((s) => s.role === "GK")).toHaveLength(1);
    }
  });

  it("각 포메이션은 고유 id와 name 보유", () => {
    const ids = formationTemplates.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(formationTemplates.length);
  });

  it("축구 포메이션은 정확히 11개 슬롯 보유", () => {
    for (const formation of getFormationsForSport("SOCCER")) {
      expect(formation.slots).toHaveLength(11);
    }
  });

  it("풋살 포메이션 슬롯 수 = fieldCount", () => {
    for (const formation of getFormationsForSport("FUTSAL")) {
      expect(formation.fieldCount).toBeDefined();
      expect(formation.slots).toHaveLength(formation.fieldCount!);
    }
  });

  it("각 포메이션은 정확히 1개 GK 슬롯 보유", () => {
    for (const formation of formationTemplates) {
      const gkSlots = formation.slots.filter((s) => s.role === "GK");
      expect(gkSlots).toHaveLength(1);
    }
  });

  it("모든 슬롯의 x, y 좌표는 0~100 범위", () => {
    for (const formation of formationTemplates) {
      for (const slot of formation.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it("각 포메이션 내 슬롯 id는 중복 없음", () => {
    for (const formation of formationTemplates) {
      const slotIds = formation.slots.map((s) => s.id);
      const uniqueIds = new Set(slotIds);
      expect(uniqueIds.size).toBe(slotIds.length);
    }
  });

  it("4-4-2 포메이션 포함", () => {
    const f442 = formationTemplates.find((f) => f.id === "4-4-2");
    expect(f442).toBeDefined();
    expect(f442!.name).toBe("4-4-2");
    expect(f442!.sportType).toBe("SOCCER");
  });

  it("4-2-3-1 포메이션 포함", () => {
    const f4231 = formationTemplates.find((f) => f.id === "4-2-3-1");
    expect(f4231).toBeDefined();
  });

  it("4-3-3 포메이션 포함", () => {
    const f433 = formationTemplates.find((f) => f.id === "4-3-3");
    expect(f433).toBeDefined();
  });

  it("풋살 futsal-1-2-1 포메이션 포함", () => {
    const f = formationTemplates.find((f) => f.id === "futsal-1-2-1");
    expect(f).toBeDefined();
    expect(f!.sportType).toBe("FUTSAL");
  });

  it("풋살 futsal-2-1-1 포메이션 포함", () => {
    const f = formationTemplates.find((f) => f.id === "futsal-2-1-1");
    expect(f).toBeDefined();
    expect(f!.sportType).toBe("FUTSAL");
  });

  it("풋살 futsal-1-1-2 포메이션 포함", () => {
    const f = formationTemplates.find((f) => f.id === "futsal-1-1-2");
    expect(f).toBeDefined();
    expect(f!.sportType).toBe("FUTSAL");
  });
});

describe("getFormationsForSportAndCount", () => {
  it("풋살 5인제 포메이션 3개", () => {
    const formations = getFormationsForSportAndCount("FUTSAL", 5);
    expect(formations).toHaveLength(3);
    formations.forEach((f) => expect(f.fieldCount).toBe(5));
  });

  it("인원수별 포메이션이 각각 존재", () => {
    for (const count of getFutsalFieldCounts()) {
      const formations = getFormationsForSportAndCount("FUTSAL", count);
      expect(formations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("축구에서는 fieldCount 무시하고 전체 반환", () => {
    const formations = getFormationsForSportAndCount("SOCCER", 11);
    expect(formations).toHaveLength(10);
  });
});

describe("getFutsalFieldCounts", () => {
  it("3~8 인원수 지원", () => {
    const counts = getFutsalFieldCounts();
    expect(counts).toContain(3);
    expect(counts).toContain(4);
    expect(counts).toContain(5);
    expect(counts).toContain(6);
    expect(counts).toContain(7);
    expect(counts).toContain(8);
  });
});
