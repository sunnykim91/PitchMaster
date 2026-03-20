import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("파일이 없습니다.", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 헤더 행 찾기 (거래일시, 구분, 거래금액 등)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row) continue;
      const joined = row.map((c: any) => String(c ?? "").trim()).join(",");
      if (joined.includes("거래일시") && (joined.includes("거래금액") || joined.includes("금액"))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return apiError("카카오뱅크 엑셀 형식을 인식할 수 없습니다. '거래일시', '거래금액' 컬럼이 필요합니다.", 400);
    }

    const headers = rows[headerIdx].map((h: any) => String(h ?? "").trim());

    // 컬럼 인덱스 찾기
    const colDate = headers.findIndex((h: string) => h.includes("거래일시"));
    const colType = headers.findIndex((h: string) => h === "구분");
    const colAmount = headers.findIndex((h: string) => h.includes("거래금액") || h === "금액");
    const colBalance = headers.findIndex((h: string) => h.includes("잔액") || h.includes("잔고"));
    const colContent = headers.findIndex((h: string) => h === "내용");
    const colMemo = headers.findIndex((h: string) => h === "메모");

    if (colDate === -1 || colAmount === -1) {
      return apiError("필수 컬럼(거래일시, 거래금액)을 찾을 수 없습니다.", 400);
    }

    // 데이터 행 파싱
    const records: {
      date: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
      description: string;
      balance: number | null;
    }[] = [];

    let lastBalance: number | null = null;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[colDate]) continue;

      const dateRaw = String(row[colDate] ?? "").trim();
      // "2025.03.20 10:24:09" → "2025-03-20"
      const dateParsed = dateRaw.replace(/\./g, "-").split(" ")[0];
      if (!dateParsed || dateParsed.length < 8) continue;

      const amountRaw = Number(String(row[colAmount] ?? "0").replace(/,/g, ""));
      if (isNaN(amountRaw) || amountRaw === 0) continue;

      const type = amountRaw > 0 ? "INCOME" as const : "EXPENSE" as const;
      const amount = Math.abs(amountRaw);

      const content = colContent !== -1 ? String(row[colContent] ?? "").trim() : "";
      const memo = colMemo !== -1 ? String(row[colMemo] ?? "").trim() : "";
      const description = [content, memo].filter(Boolean).join(" · ") || (type === "INCOME" ? "입금" : "출금");

      const balance = colBalance !== -1 ? Number(String(row[colBalance] ?? "0").replace(/,/g, "")) : null;
      if (balance !== null && !isNaN(balance)) lastBalance = balance;

      records.push({ date: dateParsed, type, amount, description, balance });
    }

    if (records.length === 0) {
      return apiError("파싱된 거래 내역이 없습니다.", 400);
    }

    return apiSuccess({
      records,
      lastBalance,
      totalCount: records.length,
    });
  } catch (err) {
    console.error("Excel parse error:", err);
    return apiError("엑셀 파일 파싱 중 오류가 발생했습니다.", 500);
  }
}
