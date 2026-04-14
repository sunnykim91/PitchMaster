import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { memberSession, noTeamSession } from "../helpers/auth";
import * as XLSX from "xlsx";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { POST } from "@/app/api/dues/excel/route";

/** 엑셀 버퍼를 FormData NextRequest로 변환 */
function makeExcelRequest(buffer: Buffer): NextRequest {
  // vitest 환경에서 Blob + append(..., name)는 파일명을 보존하지 않으므로 File 사용
  const file = new File([buffer], "test.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest("http://localhost/api/dues/excel", {
    method: "POST",
    body: formData,
  });
}

/** 카카오뱅크 형식 엑셀 버퍼 생성 */
function createKakaoBankExcel(
  rows: (string | number | Date)[][],
  headers: string[] = ["거래일시", "구분", "거래금액", "잔액", "내용", "메모"],
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ─── POST /api/dues/excel ────────────────────────────────────────────────────
describe("POST /api/dues/excel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const buffer = createKakaoBankExcel([]);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(401);
  });

  it("403: 팀 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const buffer = createKakaoBankExcel([]);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(403);
  });

  it("400: 파일 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // FormData 없이 빈 요청
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/dues/excel", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("파일");
  });

  it("200: 카카오뱅크 형식 엑셀 파싱 — 입금/출금 감지", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const rows = [
      ["2026.03.01 10:00:00", "입금", 50000, 150000, "홍길동", "월회비"],
      ["2026.03.05 14:30:00", "출금", -20000, 130000, "장비구매", ""],
    ];
    const buffer = createKakaoBankExcel(rows);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalCount).toBe(2);
    expect(json.records).toHaveLength(2);

    // INCOME: 양수 금액
    const income = json.records.find((r: { type: string }) => r.type === "INCOME");
    expect(income).toBeDefined();
    expect(income.amount).toBe(50000);
    expect(income.date).toBe("2026-03-01");

    // EXPENSE: 음수 금액
    const expense = json.records.find((r: { type: string }) => r.type === "EXPENSE");
    expect(expense).toBeDefined();
    expect(expense.amount).toBe(20000);
  });

  it("200: 날짜가 Date 객체인 경우에도 파싱", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const dateObj = new Date("2026-03-15T09:00:00Z");
    const rows = [
      [dateObj, "입금", 30000, 200000, "김철수", ""],
    ];
    const buffer = createKakaoBankExcel(rows);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalCount).toBe(1);
    expect(json.records[0].date).toBe("2026-03-15");
  });

  it("200: 잔액(lastBalance) 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const rows = [
      ["2026.03.01 10:00:00", "입금", 100000, 500000, "입금", ""],
      ["2026.03.02 11:00:00", "출금", -30000, 470000, "출금", ""],
    ];
    const buffer = createKakaoBankExcel(rows);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lastBalance).toBe(470000);
  });

  it("400: 거래일시 헤더 없는 엑셀", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const ws = XLSX.utils.aoa_to_sheet([
      ["날짜", "금액"],
      ["2026.03.01", 50000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(400);
  });

  it("400: 데이터 행이 없는 경우 (헤더만 존재)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const buffer = createKakaoBankExcel([]);
    const res = await POST(makeExcelRequest(buffer));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("파싱");
  });
});
