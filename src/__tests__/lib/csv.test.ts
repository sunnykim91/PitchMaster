import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("일반 값은 그대로", () => {
    expect(csvCell("홍길동")).toBe("홍길동");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(0)).toBe("0");
  });

  it("null·undefined 는 빈 문자열", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("쉼표 포함 시 큰따옴표로 감쌈", () => {
    expect(csvCell("가, 나")).toBe('"가, 나"');
  });

  it("큰따옴표는 2배로 이스케이프하고 감쌈", () => {
    expect(csvCell('그는 "안녕"')).toBe('"그는 ""안녕"""');
  });

  it("개행(LF·CR) 포함 시 감쌈", () => {
    expect(csvCell("첫줄\n둘째줄")).toBe('"첫줄\n둘째줄"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });
});

describe("toCsv", () => {
  it("헤더 + 행을 CRLF 로 조합", () => {
    const csv = toCsv(["이름", "골"], [["홍길동", 3], ["김철수", 0]]);
    expect(csv).toBe("이름,골\r\n홍길동,3\r\n김철수,0");
  });

  it("행 안의 쉼표·따옴표를 이스케이프", () => {
    const csv = toCsv(["내용"], [['커피, "라떼"']]);
    expect(csv).toBe('내용\r\n"커피, ""라떼"""');
  });

  it("빈 행 목록이면 헤더만", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });

  it("null·undefined 셀은 빈 칸", () => {
    expect(toCsv(["a", "b", "c"], [[1, null, undefined]])).toBe("a,b,c\r\n1,,");
  });
});
