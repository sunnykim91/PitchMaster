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
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // 헤더 행 찾기 — "거래일시" 텍스트가 포함된 행
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      const cells = row.map((c: any) => String(c ?? "").replace(/\s+/g, "").trim());
      const hasDate = cells.some((c: string) => c.includes("거래일시"));
      const hasAmount = cells.some((c: string) => c.includes("거래금액") || c.includes("금액"));
      if (hasDate && hasAmount) {
        headerIdx = i;
        break;
      }
    }

    // 두 번째 시도: "거래일시"만으로 찾기
    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const cells = row.map((c: any) => String(c ?? "").replace(/\s+/g, "").trim());
        if (cells.some((c: string) => c.includes("거래일시"))) {
          headerIdx = i;
          break;
        }
      }
    }

    if (headerIdx === -1) {
      // 최후 시도: 날짜 형식(YYYY.MM.DD)이 포함된 첫 데이터 행 찾기
      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const firstCell = String(row[0] ?? "").trim();
        if (/^\d{4}\.\d{2}\.\d{2}/.test(firstCell)) {
          // 이 행이 데이터 시작, 헤더는 그 위
          headerIdx = i - 1;
          break;
        }
      }
    }

    if (headerIdx === -1) {
      return apiError("카카오뱅크 엑셀 형식을 인식할 수 없습니다.", 400);
    }

    // 헤더 정규화 (공백 제거)
    const headers = rows[headerIdx].map((h: any) => String(h ?? "").replace(/\s+/g, "").trim());

    // 컬럼 인덱스 찾기 (공백 무시 매칭)
    const colDate = headers.findIndex((h: string) => h.includes("거래일시"));
    const colType = headers.findIndex((h: string) => h === "구분");
    const colAmount = headers.findIndex((h: string) => h.includes("거래금액") || h === "금액");
    const colBalance = headers.findIndex((h: string) => h.includes("잔액") || h.includes("잔고"));
    const colContent = headers.findIndex((h: string) => h === "내용");
    const colMemo = headers.findIndex((h: string) => h === "메모");
    const colTxType = headers.findIndex((h: string) => h.includes("거래구분"));

    // 최소한 날짜 컬럼은 필요
    if (colDate === -1) {
      return apiError("'거래일시' 컬럼을 찾을 수 없습니다.", 400);
    }

    // 데이터 행 파싱
    const records: {
      date: string;
      time: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
      description: string;
      balance: number | null;
    }[] = [];

    let lastBalance: number | null = null;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      // 날짜 + 시간 파싱
      const dateCell = row[colDate];
      let dateParsed = "";
      let timeParsed = "";
      if (dateCell instanceof Date) {
        dateParsed = dateCell.toISOString().split("T")[0];
        timeParsed = dateCell.toTimeString().slice(0, 5); // "HH:mm"
      } else {
        const dateRaw = String(dateCell ?? "").trim();
        if (!dateRaw) continue;
        // "2025.03.20 10:24:09" or "2025-03-20"
        const parts = dateRaw.replace(/\./g, "-").split(" ");
        dateParsed = parts[0];
        if (parts[1]) timeParsed = parts[1].slice(0, 5); // "10:24"
      }
      if (!dateParsed || dateParsed.length < 8) continue;

      // 금액 파싱
      let amount: number;
      let type: "INCOME" | "EXPENSE";

      if (colAmount !== -1) {
        const amountRaw = Number(String(row[colAmount] ?? "0").replace(/,/g, ""));
        if (isNaN(amountRaw) || amountRaw === 0) continue;
        type = amountRaw > 0 ? "INCOME" : "EXPENSE";
        amount = Math.abs(amountRaw);
      } else if (colType !== -1) {
        // "구분" 컬럼으로 입출금 판단
        const typeStr = String(row[colType] ?? "").trim();
        type = typeStr === "입금" ? "INCOME" : "EXPENSE";
        // 금액은 다른 컬럼에서 찾기
        const possibleAmount = row.find((c: any, idx: number) => {
          if (idx === colDate || idx === colType || idx === colBalance) return false;
          const n = Number(String(c ?? "0").replace(/,/g, ""));
          return !isNaN(n) && n !== 0;
        });
        amount = Math.abs(Number(String(possibleAmount ?? "0").replace(/,/g, "")));
        if (amount === 0) continue;
      } else {
        continue;
      }

      // 설명
      const content = colContent !== -1 ? String(row[colContent] ?? "").trim() : "";
      const memo = colMemo !== -1 ? String(row[colMemo] ?? "").trim() : "";
      const txType = colTxType !== -1 ? String(row[colTxType] ?? "").trim() : "";
      const descParts = [content, memo].filter(Boolean);
      const description = descParts.length > 0
        ? descParts.join(" · ")
        : txType || (type === "INCOME" ? "입금" : "출금");

      // 잔액
      let balance: number | null = null;
      if (colBalance !== -1) {
        const balRaw = Number(String(row[colBalance] ?? "").replace(/,/g, ""));
        if (!isNaN(balRaw)) {
          balance = balRaw;
          lastBalance = balRaw;
        }
      }

      records.push({ date: dateParsed, time: timeParsed, type, amount, description, balance });
    }

    if (records.length === 0) {
      return apiError("파싱된 거래 내역이 없습니다. 카카오뱅크에서 다운로드한 엑셀 파일인지 확인해주세요.", 400);
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
