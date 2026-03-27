"use client";

import React, { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/useApi";

/* ── 타입 정의 ── */

type BulkRow = {
  date: string;
  time: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  description: string;
  memberName: string;
};

type DuesRecord = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  recordedAt: string;
  memberName?: string;
  method?: string;
};

type ApiMember = {
  id: string;
  name: string;
  memberId: string;
  role: string;
};

type ApiDuesRecord = {
  id: string;
  team_id: string;
  user_id: string | null;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  screenshot_url: string | null;
  recorded_by: string;
  recorded_at: string;
  users: { name: string } | null;
  recorder: { name: string } | null;
};

export type DuesBulkTabProps = {
  records: DuesRecord[];
  members: ApiMember[];
  summaryRecords: ApiDuesRecord[];
  summaryBalance: number | null;
  refetchSummary: () => Promise<void>;
  syncPaymentStatus: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  autoMatchMember: (description: string) => string | undefined;
};

function DuesBulkTabInner({
  records,
  members,
  summaryRecords,
  summaryBalance,
  refetchSummary,
  syncPaymentStatus,
  showToast,
  autoMatchMember,
}: DuesBulkTabProps) {
  /* ── 탭 전용 state ── */
  const [bulkImage, setBulkImage] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" },
  ]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<Record<number, string[]>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelRecords, setExcelRecords] = useState<{ date: string; type: "INCOME" | "EXPENSE"; amount: number; description: string; balance: number | null }[]>([]);
  const [excelBalance, setExcelBalance] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState("");
  const bulkSectionRef = useRef<HTMLDivElement>(null);

  /**
   * 은행 앱 스크린샷 OCR 텍스트에서 거래 내역 파싱
   */
  type ParseResult = { rows: BulkRow[]; latestBalance: number | null };

  function parseTransactions(ocrText: string): ParseResult {
    const rows: BulkRow[] = [];
    const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);
    const year = new Date().getFullYear();

    let currentDate = "";
    let latestBalance: number | null = null;
    let isFirstBalance = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 날짜 줄: "03.12", "03.07", "3.12", "3.7" 등
      const dateMatch = line.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (dateMatch) {
        currentDate = `${year}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
        continue;
      }

      // 거래 줄: "양문주 -79,230원", "젤로스FC 73,000원"
      const txMatch = line.match(/^(.+?)\s+([+-]?[\d,]+)원$/);
      if (!txMatch) continue;

      const name = txMatch[1].trim();
      const amountStr = txMatch[2];

      // 잔액줄: "10:05 1,238,592원" 또는 "15:54 굿데이fc 1,202,592원"
      if (name.match(/^\d{1,2}:\d{2}/)) {
        const balanceAmount = parseInt(amountStr.replace(/[^0-9]/g, ""), 10);
        if (isFirstBalance && balanceAmount > 0) {
          latestBalance = balanceAmount;
          isFirstBalance = false;
        }
        continue;
      }

      // 이름에 한글이나 영문이 없으면 스킵
      if (!name.match(/[\p{L}]/u)) continue;

      const isExpense = amountStr.startsWith("-");
      const rawAmount = amountStr.replace(/[^0-9]/g, "");
      const num = parseInt(rawAmount, 10);
      if (!num) continue;

      // 잔액 판별: 50만원 이상이면 스킵
      if (num >= 500000) continue;

      // 다음 줄에서 시간 추출
      let time = "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const timeMatch = nextLine.match(/^(\d{1,2}:\d{2})/);
        if (timeMatch) {
          time = timeMatch[1];
        }
      }

      const matchedMember = members.find(
        (m) => m.name && (name.includes(m.name) || m.name.includes(name))
      );

      rows.push({
        date: currentDate,
        time,
        type: isExpense ? "EXPENSE" : "INCOME",
        amount: rawAmount,
        description: name,
        memberName: matchedMember?.id || "",
      });
    }

    return { rows, latestBalance };
  }

  const handleBulkImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setBulkImage(imageUrl);

    // Clova OCR API 호출
    setOcrLoading(true);
    setOcrStatus("스크린샷 분석 중...");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setOcrStatus(`OCR 서버 오류 (${res.status}): ${json.error || "알 수 없는 오류"}. 수동으로 입력해주세요.`);
        return;
      }

      if (!json.text) {
        setOcrStatus("OCR 응답에 텍스트가 없습니다. 수동으로 입력해주세요.");
        return;
      }

      console.log("[OCR] raw text:", json.text);
      const { rows: parsed, latestBalance } = parseTransactions(json.text);
      console.log("[OCR] parsed rows:", parsed.map((r) => ({ date: r.date, time: r.time, desc: r.description, amount: r.amount, type: r.type })));
      if (latestBalance !== null) {
        await apiMutate("/api/dues/balance", "POST", { balance: latestBalance });
        await refetchSummary();
      }

      // 기존 DB 레코드와 비교하여 중복 제거 (날짜 + 금액 + 타입으로 판단, description은 수정될 수 있으므로 제외)
      const newRows = parsed.filter((row) => {
        return !records.some(
          (r) =>
            r.recordedAt.startsWith(row.date) &&
            r.amount === Number(row.amount) &&
            r.type === row.type
        );
      });
      const duplicateCount = parsed.length - newRows.length;

      if (newRows.length > 0) {
        setBulkRows(newRows);
        const msg = [`${newRows.length}건의 새 거래를 인식했습니다.`];
        if (duplicateCount > 0) msg.push(`(${duplicateCount}건 중복 제외)`);
        if (latestBalance !== null) msg.push(`잔고: ${latestBalance.toLocaleString()}원`);
        msg.push("확인 후 저장하세요.");
        setOcrStatus(msg.join(" "));
      } else if (parsed.length > 0) {
        setOcrStatus(`${parsed.length}건 모두 이미 등록된 내역입니다.`);
      } else {
        setOcrStatus("거래 내역을 인식하지 못했습니다. 수동으로 입력해주세요.");
      }
    } catch {
      setOcrStatus("OCR 처리 중 오류가 발생했습니다. 수동으로 입력해주세요.");
    } finally {
      setOcrLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, members, refetchSummary]);

  function updateBulkRow(index: number, field: keyof BulkRow, value: string) {
    setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addBulkRow() {
    setBulkRows((prev) => [
      ...prev,
      { date: prev[prev.length - 1]?.date || "", time: "", type: "INCOME", amount: "", description: "", memberName: "" },
    ]);
  }

  function removeBulkRow(index: number) {
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  }

  const handleBulkSave = useCallback(async () => {
    // 필수값 검증
    const errors: Record<number, string[]> = {};
    bulkRows.forEach((row, i) => {
      const missing: string[] = [];
      if (!row.date) missing.push("date");
      if (!row.amount) missing.push("amount");
      if (!row.description) missing.push("description");
      if (missing.length > 0) errors[i] = missing;
    });
    setBulkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const validRows = bulkRows.filter((r) => r.amount && r.description && r.date);
    if (validRows.length === 0) return;
    setBulkSaving(true);

    let saved = 0;
    let skipped = 0;
    for (const row of validRows) {
      const { data } = await apiMutate<{ duplicate?: boolean }>("/api/dues", "POST", {
        type: row.type,
        amount: Number(row.amount),
        description: row.description,
        userId: row.memberName || undefined,
        recordedAt: row.date || undefined,
        recordedTime: row.time || undefined,
      });
      if (data?.duplicate) {
        skipped++;
      } else {
        saved++;
      }
    }
    setBulkSaving(false);
    await refetchSummary();
    setBulkRows([{ date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" }]);
    setBulkImage(null);
    if (skipped > 0) {
      showToast(`${saved}건 저장, ${skipped}건 중복 스킵`, "info");
    } else {
      showToast(`${saved}건 저장되었습니다.`);
    }
  }, [bulkRows, refetchSummary, showToast]);

  return (
    <div role="tabpanel" id="tabpanel-bulk" aria-labelledby="tab-bulk">
      {/* ── 엑셀 업로드 ── */}
      <Card className="p-4 sm:p-6 mb-5">
        <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
          엑셀 파일 업로드
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          은행 앱에서 다운로드한 거래 내역 엑셀을 그대로 올려주세요.
        </p>
        <details className="mt-2 text-sm text-muted-foreground">
          <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">지원 형식 안내</summary>
          <div className="mt-2 space-y-1.5 rounded-lg bg-secondary/50 p-3 text-sm">
            <p><strong>지원 은행:</strong> 카카오뱅크, 토스뱅크, 국민, 신한, 우리, 하나 등</p>
            <p><strong>필수 컬럼:</strong> 거래일시, 거래금액(또는 금액)</p>
            <p><strong>선택 컬럼:</strong> 구분(입금/출금), 잔액, 내용, 메모</p>
            <p className="text-muted-foreground">은행 앱 → 거래내역 → 엑셀 다운로드 → 그대로 업로드하면 됩니다. 파일 편집은 필요 없습니다.</p>
          </div>
        </details>
        <div className="mt-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setExcelLoading(true);
              setExcelRecords([]);
              setExcelBalance(null);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/dues/excel", { method: "POST", body: formData });
                const json = await res.json();
                if (!res.ok) {
                  showToast(json.error || "엑셀 파싱 실패", "error");
                  return;
                }
                // 기존 회비 내역과 중복 체크
                const existingKeys = new Set(
                  summaryRecords.map((r) => `${r.recorded_at?.slice(0, 10)}_${r.amount}_${r.type}`)
                );
                const filtered = json.records.filter((r: { date: string; amount: number; type: string }) => {
                  const key = `${r.date}_${r.amount}_${r.type}`;
                  return !existingKeys.has(key);
                });
                const dupCount = json.totalCount - filtered.length;
                setExcelRecords(filtered);
                setExcelBalance(json.lastBalance);
                if (dupCount > 0) {
                  showToast(`${json.totalCount}건 중 ${dupCount}건 중복 제외, ${filtered.length}건 새 내역`, "info");
                } else {
                  showToast(`${json.totalCount}건의 거래 내역을 인식했습니다.`, "success");
                }
              } catch {
                showToast("엑셀 파일 처리 중 오류가 발생했습니다.", "error");
              } finally {
                setExcelLoading(false);
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
          />
        </div>

        {excelLoading && (
          <div className="mt-4 flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">파싱 중...</span>
          </div>
        )}

        {(excelRecords.length > 0 || excelBalance !== null) && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {excelRecords.length > 0 ? `${excelRecords.length}건 새 내역` : "새 내역 없음 (모두 중복)"}
              </p>
              {excelBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  최종 잔액: <span className="font-bold text-primary">{excelBalance.toLocaleString()}원</span>
                </p>
              )}
            </div>
            {excelRecords.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg bg-secondary p-3">
                {excelRecords.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground">{r.date}</span>
                      <span className="ml-2 text-foreground">{r.description}</span>
                    </div>
                    <span className={cn(
                      "ml-2 shrink-0 font-bold",
                      r.type === "INCOME" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]"
                    )}>
                      {r.type === "INCOME" ? "+" : "-"}{r.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              onClick={async () => {
                setBulkSaving(true);
                try {
                  let successCount = 0;
                  for (let i = 0; i < excelRecords.length; i++) {
                    const r = excelRecords[i];
                    setBulkProgress(`저장 중... (${i + 1}/${excelRecords.length})`);
                    const { error } = await apiMutate("/api/dues", "POST", {
                      teamId: undefined,
                      type: r.type,
                      amount: r.amount,
                      description: r.description,
                      userId: autoMatchMember(r.description),
                      recordedAt: r.date,
                    });
                    if (!error) successCount++;
                  }
                  // 잔고 업데이트
                  if (excelBalance !== null) {
                    await apiMutate("/api/dues/balance", "POST", { balance: excelBalance });
                  }
                  const msg = excelRecords.length > 0
                    ? `${successCount}건 저장 완료${excelBalance !== null ? " · 잔고 업데이트됨" : ""}`
                    : "잔고가 업데이트되었습니다.";
                  showToast(msg, "success");
                  setExcelRecords([]);
                  setExcelBalance(null);
                  await refetchSummary();
                  await syncPaymentStatus();
                } catch {
                  showToast("저장 중 오류가 발생했습니다.", "error");
                } finally {
                  setBulkSaving(false);
                  setBulkProgress("");
                }
              }}
              disabled={bulkSaving}
            >
              {bulkSaving ? (bulkProgress || "저장 중...") : excelRecords.length > 0
                ? `${excelRecords.length}건 저장${excelBalance !== null ? " + 잔고 업데이트" : ""}`
                : "잔고 업데이트"}
            </Button>
          </div>
        )}
      </Card>

      {/* ── 스크린샷 일괄 등록 ── */}
      <Card className="p-4 sm:p-6" ref={bulkSectionRef}>
        <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
          스크린샷 보고 일괄 등록
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          은행 앱 캡쳐를 올리면 자동으로 거래 내역을 인식합니다. 인식 결과를 확인 후 저장하세요.
        </p>
        {ocrLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-background p-8 shadow-2xl">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-[hsl(var(--info))]" />
              <p className="text-base font-semibold text-foreground">거래 내역 인식 중...</p>
              <p className="text-sm text-muted-foreground">은행 앱 스크린샷을 인식하고 있습니다.</p>
              <button
                type="button"
                onClick={() => { setOcrLoading(false); setOcrStatus("취소됨"); }}
                className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
        {!ocrLoading && ocrStatus && (
          <div className={cn(
            "mt-2 rounded-lg px-3 py-2 text-xs font-medium",
            ocrStatus.includes("오류") || ocrStatus.includes("못했") || ocrStatus.includes("실패")
              ? "bg-destructive/10 text-destructive"
              : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
          )}>
            {ocrStatus}
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* 이미지 업로드 & 미리보기 */}
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={handleBulkImageChange}
              className="text-xs"
            />
            {bulkImage && (
              <div className="max-h-[500px] overflow-auto rounded-lg border">
                <Image src={bulkImage} alt="거래내역 스크린샷" width={600} height={800} className="w-full" />
              </div>
            )}
          </div>

          {/* 일괄 입력 테이블 */}
          <div className="space-y-3">
            <div className="space-y-2">
              {bulkRows.map((row, index) => {
                const errs = bulkErrors[index] ?? [];
                return (
                <Card key={index} className="border-0 bg-secondary p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => { updateBulkRow(index, "date", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                      className={cn("text-xs", errs.includes("date") && "border-destructive")}
                      placeholder="날짜"
                    />
                    <NativeSelect
                      value={row.type}
                      onChange={(e) => updateBulkRow(index, "type", e.target.value as "INCOME" | "EXPENSE")}
                      className="text-xs"
                    >
                      <option value="INCOME">입금</option>
                      <option value="EXPENSE">출금</option>
                    </NativeSelect>
                    <Input
                      type="number"
                      value={row.amount}
                      onChange={(e) => { updateBulkRow(index, "amount", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                      className={cn("text-xs", errs.includes("amount") && "border-destructive")}
                      placeholder="금액"
                      min={0}
                    />
                    <Input
                      value={row.description}
                      onChange={(e) => { updateBulkRow(index, "description", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                      className={cn("text-xs", errs.includes("description") && "border-destructive")}
                      placeholder="내용 (예: 3월 회비)"
                    />
                    <button
                      type="button"
                      onClick={() => removeBulkRow(index)}
                      className="min-h-[44px] min-w-[44px] rounded px-2 text-xs bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.25)] transition-colors active:scale-95 self-center"
                    >
                      삭제
                    </button>
                  </div>
                </Card>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addBulkRow}>
                + 행 추가
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleBulkSave}
                disabled={bulkSaving || bulkRows.every((r) => !r.amount || !r.description)}
              >
                {bulkSaving ? "저장 중..." : `${bulkRows.filter((r) => r.amount && r.description).length}건 일괄 저장`}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const DuesBulkTab = React.memo(DuesBulkTabInner);
