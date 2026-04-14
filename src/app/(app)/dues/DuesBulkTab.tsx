"use client";

import React, { useRef, useState, useCallback } from "react";
import { GA } from "@/lib/analytics";
import Image from "next/image";
import { Camera, FileSpreadsheet, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/useApi";
import { formatAmount } from "@/lib/formatters";

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
  refetchSummary: () => Promise<void>;
  syncPaymentStatus: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  autoMatchMember: (description: string) => string | undefined;
};

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("ko-KR").format(Number(digits));
}

function DuesBulkTabInner({
  records,
  members,
  summaryRecords,
  refetchSummary,
  syncPaymentStatus,
  showToast,
  autoMatchMember,
}: DuesBulkTabProps) {
  // props를 ref로 저장 — useCallback 내에서 항상 최신 값 참조
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const membersRef = useRef(members);
  membersRef.current = members;

  /* ── 탭 전용 state ── */
  const [bulkImage, setBulkImage] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" },
  ]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<Record<number, string[]>>({});
  // 부분 인식 거래 (시간 누락 / 날짜 추정) — 사용자가 명시적으로 추가해야만 정상 목록으로 이동
  type PartialBulkRow = BulkRow & { reasons: ("date_inferred" | "date_fallback" | "time_missing")[] };
  const [partialRows, setPartialRows] = useState<PartialBulkRow[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelRecords, setExcelRecords] = useState<{ date: string; time?: string; type: "INCOME" | "EXPENSE"; amount: number; description: string; balance: number | null }[]>([]);
  const [excelBalance, setExcelBalance] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState("");
  const bulkSectionRef = useRef<HTMLDivElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 은행 앱 스크린샷 OCR 텍스트에서 거래 내역 파싱
   */
  type PartialReason = "date_inferred" | "date_fallback" | "time_missing";
  type ParsedRow = BulkRow & { _partialReasons: PartialReason[] };
  type ParseResult = { rows: ParsedRow[]; latestBalance: number | null };

  function parseTransactions(ocrText: string): ParseResult {
    const rows: ParsedRow[] = [];
    const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);
    const year = new Date().getFullYear();

    // 첫 번째 날짜 헤더를 미리 찾아서, 그 위 거래들은 다음 날로 추정
    let firstDateInText = "";
    for (const l of lines) {
      const dm = l.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (dm) {
        firstDateInText = `${year}-${dm[1].padStart(2, "0")}-${dm[2].padStart(2, "0")}`;
        break;
      }
    }
    let currentDate: string;
    let currentDateSource: "explicit" | "inferred" | "fallback";
    if (firstDateInText) {
      // 첫 날짜 헤더의 다음 날 (은행 앱은 최신순 → 위쪽이 더 최근)
      const d = new Date(firstDateInText);
      d.setDate(d.getDate() + 1);
      currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      currentDateSource = "inferred";
    } else {
      currentDate = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
      currentDateSource = "fallback";
    }
    let latestBalance: number | null = null;
    let isFirstBalance = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 날짜 줄: "03.12", "03.07", "3.12", "3.7" 등
      const dateMatch = line.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (dateMatch) {
        currentDate = `${year}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
        currentDateSource = "explicit";
        continue;
      }

      // 거래 줄: "양문주 -79,230원", "젤로스FC 73,000원"
      let txMatch = line.match(/^(.+?)\s+([+-]?[\d,]+)원$/);

      // OCR이 이름과 금액을 별도 줄로 분리한 경우 처리
      // 예: "올챙이fc" (이름만) + 다음 줄 "45,000원" (금액만)
      if (!txMatch) {
        const amountOnly = line.match(/^([+-]?[\d,]+)원$/);
        if (amountOnly && i > 0) {
          // 이전 줄이 이름만 있는 줄인지 확인 (날짜/시간/금액이 아닌 텍스트)
          const prevLine = lines[i - 1];
          if (prevLine && !prevLine.match(/^\d{1,2}\.\d{1,2}$/) && !prevLine.match(/^\d{1,2}:\d{2}/) && !prevLine.match(/[\d,]+원$/) && prevLine.match(/[\p{L}]/u)) {
            txMatch = [line, prevLine.trim(), amountOnly[1]] as unknown as RegExpMatchArray;
          }
        }
        if (!txMatch) continue;
      }

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

      // 다음 줄에서 시간 + 메모 추출
      // 은행 앱 형식: "23:04  음료비" 또는 "08:37  휴회회원 1회 참가비"
      let time = "";
      let memo = "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const timeMatch = nextLine.match(/^(\d{1,2}:\d{2})\s*(.*)/);
        if (timeMatch) {
          time = timeMatch[1];
          // 메모에서 잔고 금액 제거 (예: "음료비 1,055,382원" → "음료비")
          memo = (timeMatch[2] ?? "").replace(/\s*[\d,]+원\s*$/, "").trim();
        }
      }

      // description: 이름 + 메모 (메모가 있으면 합침)
      const description = memo ? `${name} ${memo}` : name;

      const matchedMember = membersRef.current.find(
        (m) => m.name && (description.includes(m.name) || m.name.includes(name))
      );

      const partialReasons: PartialReason[] = [];
      if (currentDateSource === "inferred") partialReasons.push("date_inferred");
      else if (currentDateSource === "fallback") partialReasons.push("date_fallback");
      if (!time) partialReasons.push("time_missing");

      rows.push({
        date: currentDate,
        time,
        type: isExpense ? "EXPENSE" : "INCOME",
        amount: rawAmount,
        description,
        memberName: matchedMember?.id || "",
        _partialReasons: partialReasons,
      });
    }

    return { rows, latestBalance };
  }

  const handleBulkImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setBulkImage(imageUrl);
    setOcrLoading(true);
    setOcrStatus("스크린샷 분석 중...");
    setPartialRows([]);
    try {
      // 원본 그대로 업로드 (Clova는 jpg, png, pdf, tiff 지원)
      // 리사이즈는 서버에서 포맷 감지 후 처리
      const formData = new FormData();
      formData.append("image", file);

      const fileInfo = `${file.name} (${file.type || "unknown"}, ${(file.size / 1024).toFixed(0)}KB)`;
      console.log("[OCR] uploading:", fileInfo);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setOcrLoading(false);
        if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
        setOcrStatus(`OCR 오류: ${json.error || res.status}. 다른 이미지로 시도해주세요.`);
        showToast(`OCR 실패 — ${fileInfo}`, "error");
        return;
      }

      if (!json.text) {
        setOcrLoading(false);
        if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
        setOcrStatus("텍스트를 인식하지 못했습니다. 다른 이미지로 시도해주세요.");
        showToast(`인식 실패 — ${fileInfo}`, "error");
        return;
      }

      console.log("[OCR] raw text:", json.text);
      const { rows: parsed, latestBalance } = parseTransactions(json.text);
      console.log("[OCR] parsed rows:", parsed.map((r) => ({ date: r.date, time: r.time, desc: r.description, amount: r.amount, type: r.type })));
      // 잔고가 인식되면 항상 업데이트 (올린 시점이 곧 최신)
      const shouldUpdateBalance = latestBalance !== null;

      // 기존 DB 레코드와 비교하여 중복 제거 (날짜 + 금액 + 타입 + description)
      // description까지 비교해야 같은 날 같은 금액의 다른 입금자가 중복으로 잘못 묶이지 않음
      const currentRecords = recordsRef.current;
      // KST 기준 날짜 변환 함수 (UTC → KST)
      const toKSTDate = (isoStr: string) => {
        const d = new Date(isoStr);
        const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().slice(0, 10);
      };
      const normalizeDesc = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, "").trim();
      const isDupAgainstRecords = (row: { date: string; amount: string | number; type: "INCOME" | "EXPENSE"; description: string }) => {
        const rowDesc = normalizeDesc(row.description);
        const amountNum = typeof row.amount === "number" ? row.amount : Number(row.amount);
        return currentRecords.some(
          (r) =>
            toKSTDate(r.recordedAt) === row.date &&
            r.amount === amountNum &&
            r.type === row.type &&
            normalizeDesc(r.description) === rowDesc
        );
      };
      console.log("[OCR] checking duplicates against", currentRecords.length, "records");

      // 부분 인식 / 정상 분리
      const fullParsed: ParsedRow[] = [];
      const partialParsed: ParsedRow[] = [];
      for (const row of parsed) {
        if (row._partialReasons.length > 0) partialParsed.push(row);
        else fullParsed.push(row);
      }

      // 중복 제거는 정상 행에만 적용 (부분 행은 사용자 명시 추가 시점에 한 번 더 검사)
      const newRows = fullParsed.filter((row) => {
        const dup = isDupAgainstRecords(row);
        if (dup) console.log("[OCR] duplicate:", row.date, row.amount, row.description);
        return !dup;
      });
      const duplicateCount = fullParsed.length - newRows.length;
      console.log("[OCR] newRows:", newRows.length, "duplicates:", duplicateCount, "partial:", partialParsed.length);

      setOcrLoading(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";

      // 잔고가 인식되면 사용자 확인 대기 (바로 반영하지 않음)
      if (shouldUpdateBalance) {
        setPendingBalance(latestBalance);
      }

      // 부분 인식 행을 별도 영역으로 세팅 (메타데이터 분리)
      const partialRowsForState: PartialBulkRow[] = partialParsed.map((r) => ({
        date: r.date,
        time: r.time,
        type: r.type,
        amount: r.amount,
        description: r.description,
        memberName: r.memberName,
        reasons: r._partialReasons,
      }));
      setPartialRows(partialRowsForState);

      // 정상 행: 메타데이터 제거 후 BulkRow로 캐스팅
      const normalRowsForState: BulkRow[] = newRows.map(({ _partialReasons: _r, ...rest }) => rest);

      if (normalRowsForState.length > 0) {
        setBulkRows(normalRowsForState);
      }

      const msgParts: string[] = [];
      if (normalRowsForState.length > 0) msgParts.push(`${normalRowsForState.length}건 인식`);
      if (partialRowsForState.length > 0) msgParts.push(`${partialRowsForState.length}건 정보 부족`);
      if (duplicateCount > 0) msgParts.push(`${duplicateCount}건 중복 제외`);

      if (normalRowsForState.length > 0 || partialRowsForState.length > 0) {
        const status = msgParts.join(", ") + (partialRowsForState.length > 0 ? ". 정보 부족 거래는 직접 확인 후 추가하세요." : ". 확인 후 저장하세요.");
        setOcrStatus(status);
        showToast(msgParts.join(", "), "success");
      } else if (parsed.length > 0) {
        setOcrStatus(`${parsed.length}건 모두 이미 등록된 내역입니다.`);
        showToast(`${parsed.length}건 모두 중복`, "info");
      } else {
        setOcrStatus("거래 내역을 인식하지 못했습니다. 수동으로 입력해주세요.");
        showToast("거래 내역을 인식하지 못했습니다.", "error");
      }
    } catch {
      setOcrLoading(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
      setOcrStatus("OCR 처리 중 오류가 발생했습니다. 수동으로 입력해주세요.");
      showToast("OCR 처리 중 오류 발생", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchSummary]);

  function updateBulkRow(index: number, field: keyof BulkRow, value: string) {
    setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  // 부분 인식 → 정상 행으로 추가 (입출금 내역 중복 한 번 더 검사)
  function promotePartialRow(index: number) {
    const row = partialRows[index];
    if (!row) return;
    // KST 변환
    const toKSTDate = (isoStr: string) => {
      const d = new Date(isoStr);
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return kst.toISOString().slice(0, 10);
    };
    const normalizeDesc = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, "").trim();
    const rowDesc = normalizeDesc(row.description);
    const isDup = recordsRef.current.some(
      (r) =>
        toKSTDate(r.recordedAt) === row.date &&
        r.amount === Number(row.amount) &&
        r.type === row.type &&
        normalizeDesc(r.description) === rowDesc
    );
    if (isDup) {
      showToast("이미 등록된 거래입니다", "info");
      setPartialRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    const { reasons: _r, ...bulkRow } = row;
    void _r;
    setBulkRows((prev) => {
      // 첫 행이 빈 자리면 교체, 아니면 끝에 추가
      const isEmpty = prev.length === 1 && !prev[0].date && !prev[0].amount && !prev[0].description;
      return isEmpty ? [bulkRow] : [...prev, bulkRow];
    });
    setPartialRows((prev) => prev.filter((_, i) => i !== index));
  }

  function removePartialRow(index: number) {
    setPartialRows((prev) => prev.filter((_, i) => i !== index));
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
    if (saved > 0) GA.duesRecordAdd("ocr");
    if (skipped > 0) {
      showToast(`${saved}건 저장, ${skipped}건 중복 스킵`, "info");
    } else {
      showToast(`${saved}건 저장되었습니다.`);
    }
  }, [bulkRows, refetchSummary, showToast]);

  /* ── 유효한 OCR 행 수 ── */
  const validBulkCount = bulkRows.filter((r) => r.amount && r.description).length;

  return (
    <div role="tabpanel" id="tabpanel-bulk" aria-labelledby="tab-bulk" className="space-y-4">
      <h2 className="text-sm font-medium text-foreground">내역 올리기</h2>

      {/* ── OCR 섹션 ── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">OCR (스크린샷)</p>
        <Card
          className="border-dashed border-white/10 bg-card py-5 cursor-pointer hover:border-white/20 transition-colors active:scale-[0.99]"
          onClick={() => ocrFileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center gap-3 px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                통장 거래내역 캡쳐를 올려주세요
              </p>
              <p className="text-xs text-muted-foreground">
                은행 앱 스크린샷을 올리면 자동으로 인식합니다
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="active:scale-[0.97] transition-transform"
              disabled={ocrLoading}
              onClick={(e) => {
                e.stopPropagation();
                ocrFileInputRef.current?.click();
              }}
            >
              {ocrLoading ? "처리 중..." : "사진 선택"}
            </Button>
          </CardContent>
        </Card>
        <input
          ref={ocrFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleBulkImageChange}
        />
      </div>

      {/* OCR 로딩 오버레이 */}
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

      {/* OCR 상태 메시지 */}
      {!ocrLoading && ocrStatus && (
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm font-medium",
          ocrStatus.includes("오류") || ocrStatus.includes("못했") || ocrStatus.includes("실패")
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : ocrStatus.includes("중복") || ocrStatus.includes("이미")
            ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/20"
            : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20"
        )}>
          {ocrStatus}
        </div>
      )}

      {/* 잔고 확인 카드 */}
      {pendingBalance !== null && (
        <Card className="border-primary/30 bg-primary/5 py-2">
          <CardContent className="px-4 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">인식된 잔고</p>
                <p className="text-lg font-bold text-primary tabular-nums">{formatAmount(pendingBalance)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => setPendingBalance(null)}
                >
                  무시
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={async () => {
                    await apiMutate("/api/dues/balance", "POST", { balance: pendingBalance });
                    await refetchSummary();
                    showToast(`잔고 ${formatAmount(pendingBalance)} 반영 완료`, "success");
                    setPendingBalance(null);
                  }}
                >
                  잔고 반영
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업로드된 이미지 미리보기 */}
      {bulkImage && (
        <div className="max-h-[300px] overflow-auto rounded-lg border border-white/[0.06]">
          <Image src={bulkImage} alt="거래내역 스크린샷" width={600} height={800} className="w-full" />
        </div>
      )}

      {/* ── OCR 인식 결과 ── */}
      {bulkRows.some((r) => r.date || r.amount || r.description) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              인식 결과 ({bulkRows.length}건)
            </p>
            <Button
              size="sm"
              className="h-8 gap-1.5 active:scale-[0.97] transition-transform"
              onClick={handleBulkSave}
              disabled={bulkSaving || validBulkCount === 0}
            >
              <Check className="h-3.5 w-3.5" />
              {bulkSaving ? (bulkProgress || "저장 중...") : "전체 저장"}
            </Button>
          </div>

          <div className="space-y-3">
            {bulkRows.map((row, index) => {
              const errs = bulkErrors[index] ?? [];
              return (
                <Card
                  key={index}
                  className="border-white/[0.04] bg-card py-3"
                >
                  <CardContent className="px-4 space-y-3">
                    {/* 행 번호 헤더 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}번째
                      </span>
                    </div>

                    {/* Row 1: 날짜(넓게), 유형, 금액 */}
                    <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">날짜</label>
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => {
                            updateBulkRow(index, "date", e.target.value);
                            setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; });
                          }}
                          className={cn(
                            "h-10 rounded-lg bg-secondary border-0 text-sm",
                            errs.includes("date") && "ring-1 ring-destructive"
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">유형</label>
                        <Select
                          value={row.type}
                          onValueChange={(v) => updateBulkRow(index, "type", v as "INCOME" | "EXPENSE")}
                        >
                          <SelectTrigger className={cn(
                            "h-10 rounded-lg bg-secondary border-0 text-sm",
                            row.type === "INCOME" ? "text-[hsl(var(--success))]" : "text-destructive"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/[0.06]">
                            <SelectItem value="INCOME" className="text-[hsl(var(--success))]">입금</SelectItem>
                            <SelectItem value="EXPENSE" className="text-destructive">출금</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">금액</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">₩</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyInput(row.amount)}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              updateBulkRow(index, "amount", digits);
                              setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; });
                            }}
                            className={cn(
                              "h-10 rounded-lg bg-secondary border-0 text-sm pl-5 text-right",
                              errs.includes("amount") && "ring-1 ring-destructive"
                            )}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: 내용, 회원 매칭 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">내용</label>
                        <Input
                          value={row.description}
                          onChange={(e) => {
                            updateBulkRow(index, "description", e.target.value);
                            setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; });
                          }}
                          className={cn(
                            "h-10 rounded-lg bg-secondary border-0 text-sm",
                            errs.includes("description") && "ring-1 ring-destructive"
                          )}
                          placeholder="예: 3월 회비"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">회원 매칭</label>
                        <Select
                          value={row.memberName || "none"}
                          onValueChange={(v) => updateBulkRow(index, "memberName", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-10 rounded-lg bg-secondary border-0 text-sm">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/[0.06]">
                            <SelectItem value="none">없음</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-destructive gap-1.5"
                        onClick={() => removeBulkRow(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 행 추가 버튼 */}
          <Button type="button" variant="outline" size="sm" onClick={addBulkRow} className="w-full">
            + 행 추가
          </Button>
        </div>
      )}

      {/* ── 부분 인식 거래 (정보 부족) ── */}
      {partialRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[hsl(var(--warning))]">
              ⚠️ 정보가 부족한 거래 ({partialRows.length}건)
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            날짜나 시간이 잘려 정확하지 않을 수 있습니다. 직접 확인 후 추가하거나 제외해주세요.
          </p>
          <div className="space-y-2">
            {partialRows.map((row, index) => {
              const reasonLabels: Record<string, string> = {
                date_inferred: "날짜 추정",
                date_fallback: "날짜 없음(오늘로 가정)",
                time_missing: "시간 없음",
              };
              return (
                <Card key={index} className="border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)] py-3">
                  <CardContent className="px-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {row.description || "(이름 없음)"}
                          <span className={cn("ml-2", row.type === "INCOME" ? "text-[hsl(var(--success))]" : "text-destructive")}>
                            {row.type === "INCOME" ? "+" : "-"}{formatAmount(Number(row.amount))}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {row.date}{row.time ? ` ${row.time}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {row.reasons.map((r) => (
                        <span key={r} className="rounded bg-[hsl(var(--warning)/0.15)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--warning))]">
                          {reasonLabels[r] ?? r}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => removePartialRow(index)}
                      >
                        제외
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => promotePartialRow(index)}
                      >
                        추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 엑셀 업로드 섹션 ── */}
      <div className="space-y-3 pt-2" ref={bulkSectionRef}>
        <p className="text-xs font-medium text-muted-foreground">엑셀 업로드</p>
        <Card
          className="border-dashed border-white/10 bg-card py-5 cursor-pointer hover:border-white/20 transition-colors active:scale-[0.99]"
          onClick={() => excelFileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center gap-3 px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(210,70%,60%)]/10">
              <FileSpreadsheet className="h-6 w-6 text-[hsl(210,70%,60%)]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                은행 앱에서 다운로드한 거래내역 파일을 올려주세요
              </p>
              <p className="text-xs text-muted-foreground">
                xlsx, xls, csv 형식 지원
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="active:scale-[0.97] transition-transform"
              disabled={excelLoading}
              onClick={(e) => {
                e.stopPropagation();
                excelFileInputRef.current?.click();
              }}
            >
              {excelLoading ? "처리 중..." : "파일 선택"}
            </Button>
          </CardContent>
        </Card>
        <input
          ref={excelFileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
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
              // 잔고가 있으면 항상 반영 (올린 시점이 곧 최신)
              if (json.lastBalance !== null) {
                setExcelBalance(json.lastBalance);
              }
              if (dupCount > 0) {
                showToast(`${json.totalCount}건 중 ${dupCount}건 중복 제외, ${filtered.length}건 새 내역`, "info");
              } else {
                showToast(`${json.totalCount}건의 거래 내역을 인식했습니다.`, "success");
              }
            } catch {
              showToast("엑셀 파일 처리 중 오류가 발생했습니다.", "error");
            } finally {
              setExcelLoading(false);
              if (excelFileInputRef.current) excelFileInputRef.current.value = "";
            }
          }}
        />

        {excelLoading && (
          <div className="flex items-center gap-2 py-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">파싱 중...</span>
          </div>
        )}

        {/* 엑셀 파싱 결과 */}
        {(excelRecords.length > 0 || excelBalance !== null) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {excelRecords.length > 0 ? `${excelRecords.length}건 새 내역` : "새 내역 없음 (모두 중복)"}
              </p>
              {excelBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  최종 잔액: <span className="font-bold text-primary">{formatAmount(excelBalance)}</span>
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
                      {r.type === "INCOME" ? "+" : "-"}{formatAmount(r.amount)}
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
                      recordedTime: r.time || undefined,
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
      </div>

      {/* 지원 은행 안내 */}
      <p className="text-xs text-muted-foreground text-center">
        국민, 신한, 우리, 하나, 농협, 카카오뱅크, 토스뱅크 지원
      </p>
    </div>
  );
}

export const DuesBulkTab = DuesBulkTabInner;
