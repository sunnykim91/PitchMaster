import { describe, it, expect } from "vitest";
import {
  extractJsonArray,
  normalizeTransaction,
  validateTransactions,
  correctTypesFromBalance,
  type ParsedTransaction,
} from "@/lib/server/aiOcrParse";

describe("aiOcrParse — extractJsonArray", () => {
  it("순수 JSON 배열 파싱", () => {
    const result = extractJsonArray('[{"amount":5000}]');
    expect(result).toEqual([{ amount: 5000 }]);
  });

  it("코드블록으로 감싼 JSON 파싱", () => {
    const result = extractJsonArray('```json\n[{"amount":5000}]\n```');
    expect(result).toEqual([{ amount: 5000 }]);
  });

  it("언어 없는 코드블록 파싱", () => {
    const result = extractJsonArray('```\n[{"amount":5000}]\n```');
    expect(result).toEqual([{ amount: 5000 }]);
  });

  it("앞뒤 설명문 섞인 JSON 추출", () => {
    const result = extractJsonArray('여기 결과입니다: [{"amount":5000}] 끝.');
    expect(result).toEqual([{ amount: 5000 }]);
  });

  it("빈 배열", () => {
    expect(extractJsonArray("[]")).toEqual([]);
  });

  it("잘못된 JSON은 null", () => {
    expect(extractJsonArray("not json")).toBeNull();
    expect(extractJsonArray("{broken")).toBeNull();
  });

  it("JSON 객체(배열 아님)는 null", () => {
    expect(extractJsonArray('{"amount": 5000}')).toBeNull();
  });
});

describe("aiOcrParse — normalizeTransaction", () => {
  it("정상 거래 정규화", () => {
    const result = normalizeTransaction({
      date: "2026-04-12",
      time: "13:45",
      counterparty: "홍길동",
      amount: 50000,
      type: "입금",
      balance: 1243000,
      memo: null,
    });
    expect(result).toEqual({
      date: "2026-04-12",
      time: "13:45",
      counterparty: "홍길동",
      amount: 50000,
      type: "입금",
      balance: 1243000,
      memo: null,
    });
  });

  it("음수 amount는 절댓값으로 변환", () => {
    const result = normalizeTransaction({ amount: -5000, type: "출금" });
    expect(result?.amount).toBe(5000);
  });

  it("type이 이상하면 null", () => {
    const result = normalizeTransaction({ amount: 5000, type: "이상한타입" });
    expect(result?.type).toBeNull();
  });

  it("null/undefined는 null 반환", () => {
    expect(normalizeTransaction(null)).toBeNull();
    expect(normalizeTransaction(undefined)).toBeNull();
    expect(normalizeTransaction("문자열")).toBeNull();
  });

  it("누락된 필드는 null", () => {
    const result = normalizeTransaction({ amount: 5000 });
    expect(result).toEqual({
      date: null,
      time: null,
      counterparty: null,
      amount: 5000,
      type: null,
      balance: null,
      memo: null,
    });
  });
});

describe("aiOcrParse — validateTransactions", () => {
  function tx(overrides: Partial<ParsedTransaction>): ParsedTransaction {
    return {
      date: null, time: null, counterparty: null,
      amount: 50000, type: "입금", balance: null, memo: null,
      ...overrides,
    };
  }

  it("정상 거래는 경고 없음", () => {
    const result = validateTransactions([
      tx({ amount: 50000, balance: 100000, type: "입금" }),
      tx({ amount: 30000, balance: 130000, type: "입금" }),
    ]);
    expect(result).toEqual([]);
  });

  it("1억 이상 금액은 경고", () => {
    const result = validateTransactions([tx({ amount: 100_000_000 })]);
    expect(result.some((w) => w.includes("비정상적으로 큰 금액"))).toBe(true);
  });

  it("0원 이하 금액은 경고", () => {
    const result = validateTransactions([tx({ amount: 0 })]);
    expect(result.some((w) => w.includes("0원 이하"))).toBe(true);
  });

  it("잔액 불일치 2건 이상이면 경고", () => {
    const result = validateTransactions([
      tx({ amount: 50000, balance: 100000, type: "입금" }),
      tx({ amount: 50000, balance: 999999, type: "입금" }), // 150000이어야 함
      tx({ amount: 30000, balance: 888888, type: "입금" }), // 1029999이어야 함
    ]);
    expect(result.some((w) => w.includes("잔액 불일치"))).toBe(true);
  });

  it("잔액 불일치 1건은 경고 안 함 (노이즈 방지)", () => {
    const result = validateTransactions([
      tx({ amount: 50000, balance: 100000, type: "입금" }),
      tx({ amount: 50000, balance: 999999, type: "입금" }), // 1건만 틀림
    ]);
    expect(result.some((w) => w.includes("잔액 불일치"))).toBe(false);
  });
});

describe("aiOcrParse — correctTypesFromBalance (입출금 방향 잔액 기반 교정)", () => {
  function tx(overrides: Partial<ParsedTransaction>): ParsedTransaction {
    return {
      date: null, time: null, counterparty: null,
      amount: 14000, type: "입금", balance: null, memo: null,
      ...overrides,
    };
  }

  it("카카오뱅크 유니폼비 입금이 전부 '출금'으로 오독돼도 잔액 증감으로 입금 복구 (FC발로만 실데이터)", () => {
    // 위=최신, 아래=과거. 잔액이 위로 갈수록 +14,000씩 증가 = 전부 입금.
    // Vision이 색을 놓쳐 전부 "출금"으로 내보낸 상황을 가정.
    const rows = [
      tx({ counterparty: "노우현", balance: 2_517_049, type: "출금" }),
      tx({ counterparty: "강선교", balance: 2_503_049, type: "출금" }),
      tx({ counterparty: "최현성", balance: 2_489_049, type: "출금" }),
      tx({ counterparty: "장영재", balance: 2_475_049, type: "출금" }),
      tx({ counterparty: "심민섭", balance: 2_461_049, type: "출금" }),
      tx({ counterparty: "최인녕", balance: 2_447_049, type: "출금" }),
      tx({ counterparty: "박형준", balance: 2_433_049, type: "출금" }),
      tx({ counterparty: "이윤용", balance: 2_419_049, type: "출금" }),
      tx({ counterparty: "정지효", balance: 2_405_049, type: "출금" }), // 최고(最古) — 교정 불가
    ];
    const out = correctTypesFromBalance(rows);
    // 최고 1건 제외 전부 입금으로 교정
    expect(out.slice(0, 8).every((t) => t.type === "입금")).toBe(true);
    // 마지막(더 과거 잔액 없음)은 LLM 값 유지
    expect(out[8].type).toBe("출금");
  });

  it("진짜 출금(잔액 감소)은 출금으로 확정", () => {
    const rows = [
      tx({ amount: 92_950, balance: 1_000_000, type: "입금" }), // 잘못 입금으로 옴
      tx({ amount: 14_000, balance: 1_092_950, type: "입금" }),
    ];
    const out = correctTypesFromBalance(rows);
    // 1,000,000 - 1,092,950 = -92,950 = -amount → 출금으로 교정
    expect(out[0].type).toBe("출금");
  });

  it("잔액이 없으면 교정하지 않음 (LLM 값 유지)", () => {
    const rows = [tx({ balance: null, type: "출금" }), tx({ balance: null, type: "출금" })];
    const out = correctTypesFromBalance(rows);
    expect(out.every((t) => t.type === "출금")).toBe(true);
  });

  it("잔액 차이가 금액과 안 맞으면 교정하지 않음 (오검출 방지)", () => {
    const rows = [
      tx({ amount: 14_000, balance: 500_000, type: "출금" }),
      tx({ amount: 14_000, balance: 300_000, type: "출금" }), // 차이 200,000 ≠ 14,000
    ];
    const out = correctTypesFromBalance(rows);
    expect(out[0].type).toBe("출금"); // 그대로
  });

  it("원본 배열을 변형하지 않음 (순수 함수)", () => {
    const rows = [
      tx({ balance: 2_517_049, type: "출금" }),
      tx({ balance: 2_503_049, type: "출금" }),
    ];
    correctTypesFromBalance(rows);
    expect(rows[0].type).toBe("출금"); // 원본 불변
  });
});
