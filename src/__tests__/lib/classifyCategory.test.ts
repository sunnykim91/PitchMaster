import { describe, it, expect } from "vitest";
import { classifyCategory } from "@/lib/dues/classifyCategory";

/**
 * 회비 카테고리 분류 — FC발로만 총무 피드백(2026-07)으로 발견한
 * "수입 유니폼/구장비가 전부 회비 수입으로 뭉쳐짐" 회귀 방지.
 * 실제 거래 설명을 케이스로 사용.
 */
describe("classifyCategory", () => {
  describe("EXPENSE", () => {
    it("유니폼 제작 지출 → 유니폼", () => {
      expect(classifyCategory("EXPENSE", "준타스 유니폼 제작")).toBe("유니폼");
    });
    it("구장비 지출 → 구장비", () => {
      expect(classifyCategory("EXPENSE", "7/18(토) 강북구민 구장비")).toBe("구장비");
    });
    it("용병비 → 용병비", () => {
      expect(classifyCategory("EXPENSE", "용병 2명")).toBe("용병비");
    });
    it("설명 없는 지출 → 기타 지출", () => {
      expect(classifyCategory("EXPENSE", null)).toBe("기타 지출");
    });
    it("매칭 안 되는 지출(물값) → 기타 지출", () => {
      expect(classifyCategory("EXPENSE", "7/4(토) 물값 / 전용우")).toBe("기타 지출");
    });
  });

  describe("INCOME — 목적성 수납/환불은 회비 수입에서 분리 (핵심 회귀 방지)", () => {
    it("실제 회비만 회비 수입", () => {
      expect(classifyCategory("INCOME", "권용한 7월 회비")).toBe("회비 수입");
      expect(classifyCategory("INCOME", "최현성 하반기 회비")).toBe("회비 수입");
    });
    it("유니폼비 수입 → 유니폼 수입 (과거엔 회비 수입으로 오분류)", () => {
      expect(classifyCategory("INCOME", "김영민 유니폼비")).toBe("유니폼 수입");
      expect(classifyCategory("INCOME", "이윤용유니폼")).toBe("유니폼 수입");
    });
    it("구장비 수납 → 구장비 수입", () => {
      expect(classifyCategory("INCOME", "7/4(토) 핫식스 구장비")).toBe("구장비 수입");
      expect(classifyCategory("INCOME", "7/18(토) 네오즈 구장비")).toBe("구장비 수입");
    });
    it("구장비 환불은 구장 우선 매칭 → 구장비 수입 (지출 상쇄)", () => {
      expect(classifyCategory("INCOME", "마들 구장비 환불")).toBe("구장비 수입");
    });
    it("보증금·시안비 환불 → 환불", () => {
      expect(classifyCategory("INCOME", "칼치오 샘플 보증금 환불")).toBe("환불");
      expect(classifyCategory("INCOME", "(주)준타스 시안비 환불")).toBe("환불");
    });
    it("불참비 → 벌금 수입", () => {
      expect(classifyCategory("INCOME", "박형준 불참비")).toBe("벌금 수입");
    });
    it("선납/이자는 유지", () => {
      expect(classifyCategory("INCOME", "김철수 선납 3개월")).toBe("선납");
      expect(classifyCategory("INCOME", "이자")).toBe("이자");
    });
    it("설명 없는 수입 → 회비 수입", () => {
      expect(classifyCategory("INCOME", null)).toBe("회비 수입");
    });
  });
});
