import { describe, it, expect } from "vitest";
import { formationTemplates, getFormationsForSport } from "@/lib/formations";

describe("formationTemplates", () => {
  it("8개 포메이션 정의 (축구 5 + 풋살 3)", () => {
    expect(formationTemplates).toHaveLength(8);
  });

  it("축구 포메이션 5개", () => {
    expect(getFormationsForSport("SOCCER")).toHaveLength(5);
  });

  it("풋살 포메이션 3개", () => {
    expect(getFormationsForSport("FUTSAL")).toHaveLength(3);
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

  it("풋살 포메이션은 정확히 5개 슬롯 보유", () => {
    for (const formation of getFormationsForSport("FUTSAL")) {
      expect(formation.slots).toHaveLength(5);
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
