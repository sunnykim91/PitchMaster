"use client";

/**
 * MemberBulkUploadModal — 회원 일괄 사전 등록 모달
 *
 * 두 가지 입력 방식:
 *  - paste: 텍스트 박스에 한 줄당 한 명 (이름 또는 "이름 010-1234-5678")
 *  - CSV: 파일 업로드 (header: 이름,전화번호 또는 자동 감지)
 *
 * 미리보기 표 → 검증 결과 표시 → [등록] 클릭으로 일괄 INSERT.
 *
 * 권한: PRESIDENT (MembersClient에서 가드)
 */

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Upload, FileText, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/utils";

interface ParsedRow {
  name: string;
  phone: string | null;
  rawLine: string;
  warning?: string;
}

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "paste" | "csv";

const PHONE_REGEX = /(?:^|\s|,)(\d{3}[\s-]?\d{3,4}[\s-]?\d{4})/;

function parseLine(line: string): ParsedRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // 전화번호 추출
  const phoneMatch = trimmed.match(PHONE_REGEX);
  let phone: string | null = null;
  let nameCandidate = trimmed;
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\D/g, "");
    nameCandidate = trimmed.replace(phoneMatch[0], "").trim();
  }
  // 콤마/탭 분리 — 첫 토큰 이름, 나머지 무시
  nameCandidate = nameCandidate.split(/[,\t]/)[0].trim();
  if (!nameCandidate) {
    return { name: "", phone, rawLine: trimmed, warning: "이름 누락" };
  }
  return { name: nameCandidate, phone, rawLine: trimmed };
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // header 자동 감지 (이름·전화번호 키워드)
  const first = lines[0].toLowerCase();
  const hasHeader = /이름|name/.test(first) && /전화|phone|번호/.test(first);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const name = cols[0] ?? "";
      const phoneRaw = cols[1] ?? "";
      const phone = phoneRaw ? phoneRaw.replace(/\D/g, "") || null : null;
      if (!name) return { name: "", phone, rawLine: line, warning: "이름 누락" };
      return { name, phone, rawLine: line };
    })
    .filter((r): r is ParsedRow => r !== null);
}

export function MemberBulkUploadModal({ open, onClose, onSuccess }: BulkUploadModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      // close 시 상태 reset
      setPasteText("");
      setCsvFileName(null);
      setCsvRows([]);
      setSubmitting(false);
      setMode("paste");
    }
  }, [open]);

  // 파싱 결과
  const parsedRows = useMemo(() => {
    if (mode === "paste") {
      return pasteText
        .split(/\r?\n/)
        .map((line) => parseLine(line))
        .filter((r): r is ParsedRow => r !== null);
    }
    return csvRows;
  }, [mode, pasteText, csvRows]);

  const validCount = parsedRows.filter((r) => r.name && !r.warning).length;
  const errorCount = parsedRows.filter((r) => r.warning || !r.name).length;

  async function handleCsvFile(file: File) {
    setCsvFileName(file.name);
    const text = await file.text();
    setCsvRows(parseCsv(text));
  }

  async function handleSubmit() {
    if (validCount === 0) {
      showToast("등록할 회원이 없습니다", "error");
      return;
    }
    setSubmitting(true);
    const entries = parsedRows
      .filter((r) => r.name && !r.warning)
      .map((r) => ({ name: r.name, phone: r.phone }));

    const { data, error } = await apiMutate<{
      created: number;
      skipped: { name: string; phone: string | null; reason: string }[];
      errors: { index: number; name: string; phone: string | null; reason: string }[];
    }>("/api/members/bulk", "POST", { entries });

    setSubmitting(false);

    if (error) {
      showToast(error, "error");
      return;
    }

    const msgs: string[] = [];
    if (data?.created) msgs.push(`${data.created}명 등록`);
    if (data?.skipped?.length) msgs.push(`${data.skipped.length}명 중복 건너뜀`);
    if (data?.errors?.length) msgs.push(`${data.errors.length}명 검증 실패`);
    showToast(msgs.join(" · ") || "처리 완료", data?.created ? "success" : "info");
    onSuccess();
    onClose();
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl"
        style={{ maxWidth: "min(100vw, 540px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border/40">
          <div>
            <h2 className="text-base font-bold leading-tight">회원 일괄 등록</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              한 번에 최대 200명까지. 가입 안 한 팀원도 미리 추가할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 모드 토글 */}
        <div className="flex gap-1 mx-5 mt-3 p-1 rounded-lg bg-secondary shrink-0">
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] font-semibold transition-colors",
              mode === "paste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setMode("csv")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] font-semibold transition-colors",
              mode === "csv" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            CSV 업로드
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {mode === "paste" ? (
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground leading-[1.55]">
                한 줄에 한 명씩. 이름만 또는 <b className="text-foreground">이름과 전화번호</b>를 같이 적으세요.
              </p>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"홍길동 010-1234-5678\n김철수\n이영희, 010-9999-8888"}
                className="min-h-[180px] font-mono text-sm"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground leading-[1.55]">
                첫 줄에 <b className="text-foreground">이름,전화번호</b> 헤더가 있으면 자동 인식. 없으면 첫 번째 컬럼 = 이름, 두 번째 = 전화번호로 처리.
              </p>
              <label
                className="block cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition-colors hover:border-primary/50"
              >
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  {csvFileName ?? "CSV 파일 선택"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">.csv / .txt 지원</p>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvFile(f);
                  }}
                />
              </label>
            </div>
          )}

          {/* 미리보기 */}
          {parsedRows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/40 text-[12.5px] font-semibold">
                <span>미리보기 ({parsedRows.length}명)</span>
                <span className="text-muted-foreground">
                  <span className="text-[hsl(var(--success))]">✓ {validCount}</span>
                  {errorCount > 0 && <> · <span className="text-destructive">⚠ {errorCount}</span></>}
                </span>
              </div>
              <div className="max-h-[240px] overflow-y-auto divide-y divide-border/40">
                {parsedRows.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-[13px]",
                      row.warning ? "bg-destructive/5" : ""
                    )}
                  >
                    {row.warning ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                    )}
                    <span className="font-medium">{row.name || <em className="text-destructive">(이름 없음)</em>}</span>
                    {row.phone && (
                      <span className="ml-auto text-muted-foreground tabular-nums text-[12.5px]">
                        {row.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")}
                      </span>
                    )}
                    {row.warning && (
                      <span className="ml-auto text-[11.5px] text-destructive">{row.warning}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="px-5 py-3 border-t border-border/40 shrink-0 flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || validCount === 0}
            className="flex-1"
          >
            {submitting ? "등록 중..." : `${validCount}명 등록`}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
