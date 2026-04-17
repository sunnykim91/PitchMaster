import { describe, it, expect } from "vitest";
import {
  extractJsonArray,
  normalizeTransaction,
  validateTransactions,
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
