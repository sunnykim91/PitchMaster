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
      date: "2026-04-12", time: null, counterparty: null,
      amount: 14000, type: "입금", balance: null, memo: null,
      ...overrides,
    };
  }

  it("카카오뱅크(최신→과거) 유니폼비 입금이 전부 '출금'으로 오독돼도 입금 복구 (FC발로만 실데이터)", () => {
    // 위=최신(늦은 시각), 아래=과거. 잔액이 위로 갈수록 +14,000. 전부 입금.
    const rows = [
      tx({ time: "17:45", counterparty: "노우현", balance: 2_517_049, type: "출금" }),
      tx({ time: "17:44", counterparty: "강선교", balance: 2_503_049, type: "출금" }),
      tx({ time: "17:38", counterparty: "최현성", balance: 2_489_049, type: "출금" }),
      tx({ time: "17:37", counterparty: "장영재", balance: 2_475_049, type: "출금" }),
      tx({ time: "17:23", counterparty: "심민섭", balance: 2_461_049, type: "출금" }),
      tx({ time: "17:22", counterparty: "최인녕", balance: 2_447_049, type: "출금" }),
      tx({ time: "17:18", counterparty: "박형준", balance: 2_433_049, type: "출금" }),
      tx({ time: "17:17", counterparty: "이윤용", balance: 2_419_049, type: "출금" }),
      tx({ time: "17:15", counterparty: "정지효", balance: 2_405_049, type: "출금" }), // 最古 — 교정 불가
    ];
    const out = correctTypesFromBalance(rows);
    expect(out.slice(0, 8).every((t) => t.type === "입금")).toBe(true);
    expect(out[8].type).toBe("출금"); // 가장 과거는 LLM 값 유지
  });

  it("⭐회귀: 오름차순(과거→최신) 종이통장에서 정상 입금을 출금으로 뒤집지 않음", () => {
    // 위=과거(이른 시각), 아래=최신. 잔액이 아래로 갈수록 +14,000. 전부 입금.
    const rows = [
      tx({ time: "17:15", balance: 2_405_049, type: "입금" }), // 最古
      tx({ time: "17:17", balance: 2_419_049, type: "입금" }),
      tx({ time: "17:18", balance: 2_433_049, type: "입금" }),
      tx({ time: "17:22", balance: 2_447_049, type: "입금" }),
    ];
    const out = correctTypesFromBalance(rows);
    // 오름차순 감지 → 아무 것도 출금으로 뒤집히면 안 됨
    expect(out.every((t) => t.type === "입금")).toBe(true);
  });

  it("진짜 출금(잔액 감소)은 출금으로 확정 — 금액이 달라 방향 판별 가능", () => {
    const rows = [
      tx({ time: "10:05", amount: 92_950, balance: 1_000_000, type: "입금" }), // 잘못 입금으로 옴
      tx({ time: "10:00", amount: 14_000, balance: 1_092_950, type: "입금" }),
    ];
    const out = correctTypesFromBalance(rows);
    // 최신(위) 92,950: 1,000,000 - 1,092,950 = -92,950 → 출금으로 교정
    expect(out[0].type).toBe("출금");
  });

  it("방향 모호(날짜·시각 없고 전부 같은 금액)면 교정하지 않음", () => {
    const rows = [
      tx({ date: null, balance: 500_000, type: "출금" }),
      tx({ date: null, balance: 486_000, type: "출금" }),
    ];
    const out = correctTypesFromBalance(rows);
    expect(out.every((t) => t.type === "출금")).toBe(true); // 그대로
  });

  it("잔액이 없으면 교정하지 않음", () => {
    const rows = [
      tx({ time: "17:45", balance: null, type: "출금" }),
      tx({ time: "17:15", balance: null, type: "출금" }),
    ];
    const out = correctTypesFromBalance(rows);
    expect(out.every((t) => t.type === "출금")).toBe(true);
  });

  it("원본 배열을 변형하지 않음 (순수 함수)", () => {
    const rows = [
      tx({ time: "17:45", balance: 2_517_049, type: "출금" }),
      tx({ time: "17:15", balance: 2_503_049, type: "출금" }),
    ];
    correctTypesFromBalance(rows);
    expect(rows[0].type).toBe("출금"); // 원본 불변
  });
});
