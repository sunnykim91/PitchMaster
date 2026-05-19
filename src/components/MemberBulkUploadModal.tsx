"use client";

/**
 * MemberBulkUploadModal — 회원 일괄 사전 등록 모달 (시안 v2)
 *
 * 3-step paste → review → done.
 *   paste:  카톡 명단 textarea + 자동 파싱(이름·전화)
 *   review: 행별 이름·전화 수정 + 삭제
 *   done:   N명 등록 완료 + NEXT 액션 (초대 코드 공유 · 첫 경기 만들기)
 *
 * 권한: PRESIDENT (MembersClient에서 가드)
 * API:  POST /api/members/bulk
 */

import "@/app/onboarding/onboarding.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { shareTeamInvite } from "@/lib/kakaoShare";

type ParsedRow = {
  name: string;
  phone: string;
  dup: boolean;
};

type ReviewRow = {
  name: string;
  phone: string;
};

type InputMode = "manual" | "file";

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamName?: string;
  inviteCode?: string;
}

const PHONE_RE = /(01[016789][- ]?\d{3,4}[- ]?\d{4})/;

function formatPhone(p: string) {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // 헤더 자동 감지 (이름·전화/phone 키워드)
  const first = lines[0].toLowerCase();
  const hasHeader = /이름|name/.test(first) && /전화|phone|번호/.test(first);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const line of dataLines) {
    const cols = line.split(/[,\t]/).map((c) => c.trim());
    const name = cols[0] ?? "";
    if (!name) continue;
    const phoneRaw = cols[1] ?? "";
    const phone = phoneRaw ? formatPhone(phoneRaw) : "";
    const key = phone || name;
    if (seen.has(key)) {
      rows.push({ name, phone, dup: true });
    } else {
      seen.add(key);
      rows.push({ name, phone, dup: false });
    }
  }
  return rows;
}

function parseManualInput(raw: string): ParsedRow[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const stripped = line.replace(/^[\d]+[.)]\s*/, "").trim();
    if (!stripped) continue;
    const phoneMatch = stripped.match(PHONE_RE);
    let phone = "";
    let name = stripped;
    if (phoneMatch) {
      phone = formatPhone(phoneMatch[1]);
      name = stripped
        .replace(phoneMatch[1], "")
        .replace(/[,·]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else {
      name = stripped.replace(/[,·]/g, " ").trim();
    }
    if (!name) continue;
    const key = phone || name;
    if (seen.has(key)) {
      rows.push({ name, phone, dup: true });
    } else {
      seen.add(key);
      rows.push({ name, phone, dup: false });
    }
  }
  return rows;
}

type Step = "paste" | "review" | "done";

export function MemberBulkUploadModal({
  open,
  onClose,
  onSuccess,
  teamName,
  inviteCode,
}: BulkUploadModalProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("paste");
  const [mode, setMode] = useState<InputMode>("manual");
  const [raw, setRaw] = useState("");
  const [fileRows, setFileRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

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
      setStep("paste");
      setMode("manual");
      setRaw("");
      setFileRows([]);
      setFileName(null);
      setFileError(null);
      setRows([]);
      setSubmitting(false);
      setCreatedCount(0);
    }
  }, [open]);

  const parsed = useMemo(
    () => (mode === "manual" ? parseManualInput(raw) : fileRows),
    [mode, raw, fileRows],
  );
  const validCount = parsed.filter((r) => !r.dup).length;
  const dupCount = parsed.length - validCount;

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileError(null);
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setFileRows(parseCsv(csv));
      } else {
        const text = await file.text();
        setFileRows(parseCsv(text));
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "파일 파싱 실패");
      setFileRows([]);
    }
  }

  const goReview = () => {
    setRows(parsed.filter((r) => !r.dup).map((r) => ({ name: r.name, phone: r.phone })));
    setStep("review");
  };

  async function submit() {
    if (rows.length === 0) {
      showToast("등록할 회원이 없습니다", "error");
      return;
    }
    setSubmitting(true);
    const entries = rows.map((r) => ({
      name: r.name.trim(),
      phone: r.phone.trim() || null,
    }));
    const { data, error } = await apiMutate<{
      created: number;
      skipped: { name: string; phone: string | null; reason: string }[];
      errors: { index: number; name: string; phone: string | null; reason: string }[];
    }>("/api/members/bulk", "POST", { entries });

    setSubmitting(false);

    if (error) {
      showToast(typeof error === "string" ? error : "등록에 실패했습니다", "error");
      return;
    }

    const created = data?.created ?? 0;
    const skipped = data?.skipped?.length ?? 0;
    const errors = data?.errors?.length ?? 0;
    setCreatedCount(created);

    if (skipped > 0 || errors > 0) {
      const msgs: string[] = [];
      msgs.push(`${created}명 등록`);
      if (skipped) msgs.push(`${skipped}명 중복 건너뜀`);
      if (errors) msgs.push(`${errors}명 검증 실패`);
      showToast(msgs.join(" · "), created > 0 ? "success" : "info");
    }

    onSuccess();
    setStep("done");
  }

  const updateRow = (i: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  function handleShareInvite() {
    if (!inviteCode) {
      router.push("/settings");
      return;
    }
    shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode });
  }

  function handleCreateMatch() {
    onClose();
    router.push("/matches");
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="pm-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pm-modal-head">
          <div className="pm-modal-steps">
            {(["paste", "review", "done"] as Step[]).map((s, i) => {
              const order = ["paste", "review", "done"] as Step[];
              const cur = order.indexOf(step);
              const klass =
                step === s ? "is-on" : cur > i ? "is-done" : "";
              return <span key={s} className={`pm-mstep ${klass}`} />;
            })}
          </div>
          <button
            type="button"
            className="pm-welcome-close"
            onClick={onClose}
            aria-label="닫기"
            style={{ position: "static" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {step === "paste" && (
          <>
            <div className="pm-chip" style={{ marginTop: 2 }}>
              <span className="pm-chip-dot" />
              <span>1단계 · 명단 입력</span>
            </div>
            <h2 className="pm-modal-h">
              팀원 명단을<br />
              추가하세요.
            </h2>
            <p className="pm-sub">
              엑셀·CSV 파일을 올리거나, 한 줄씩 직접 입력할 수 있어요.
              <br />
              이름과 전화번호가 자동으로 인식돼요.
            </p>

            {/* 모드 토글 */}
            <div className="pm-seg" role="radiogroup" aria-label="입력 방식">
              <button
                type="button"
                role="radio"
                aria-checked={mode === "manual"}
                className={`pm-seg-opt ${mode === "manual" ? "is-on" : ""}`}
                onClick={() => setMode("manual")}
              >
                직접 입력
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "file"}
                className={`pm-seg-opt ${mode === "file" ? "is-on" : ""}`}
                onClick={() => setMode("file")}
              >
                파일 업로드
              </button>
            </div>

            {mode === "manual" ? (
              <textarea
                className="pm-paste-ta"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={`한 줄에 한 명씩 입력하세요\n\n예시\n1. 김선휘 010-1234-5678\n2. 박지훈 010-2345-6789\n3. 이상민 01034567890`}
                rows={9}
              />
            ) : (
              <label
                style={{
                  display: "block",
                  cursor: "pointer",
                  borderRadius: 14,
                  border: "2px dashed hsl(var(--border))",
                  background: "hsl(var(--background) / 0.5)",
                  padding: "20px 16px",
                  textAlign: "center",
                  transition: "border-color 200ms, background 200ms",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden
                  style={{ margin: "0 auto", display: "block", color: "hsl(var(--muted-foreground))" }}
                >
                  <path
                    d="M14 4v14M8 10l6-6 6 6M5 22h18"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p
                  style={{
                    margin: "10px 0 4px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {fileName ?? "파일 선택하기"}
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: "hsl(var(--muted-foreground))", letterSpacing: "-0.005em" }}>
                  .xlsx · .xls · .csv · .txt — 첫 줄에 이름·전화번호 헤더 자동 인식
                </p>
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            )}

            {fileError && mode === "file" && <p className="pm-help pm-help--err">{fileError}</p>}

            <div className="pm-paste-status">
              {parsed.length === 0 ? (
                <span className="pm-paste-status-text">
                  {mode === "manual" ? "입력을 기다리고 있어요" : "파일을 선택해주세요"}
                </span>
              ) : (
                <>
                  <span className="pm-paste-pill pm-paste-pill--ok">{validCount}명 인식</span>
                  {dupCount > 0 && (
                    <span className="pm-paste-pill pm-paste-pill--mute">중복 {dupCount}건</span>
                  )}
                </>
              )}
            </div>

            <button type="button" className="pm-cta" disabled={validCount === 0} onClick={goReview}>
              {validCount > 0 ? `${validCount}명 확인하기` : "계속하기"}
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path
                  d="M3 8 L13 8 M9 4 L13 8 L9 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <p className="pm-cta-sub">잘못 인식된 회원은 다음 화면에서 수정할 수 있어요.</p>
          </>
        )}

        {step === "review" && (
          <>
            <div className="pm-chip" style={{ marginTop: 2 }}>
              <span className="pm-chip-dot" />
              <span>2단계 · 확인</span>
            </div>
            <h2 className="pm-modal-h">
              <strong>{rows.length}명</strong>을 인식했어요.
            </h2>
            <p className="pm-sub">
              잘못 인식된 회원은 등록 전에 수정할 수 있어요.
              <br />
              가입 전이라도 출석·회비 기록이 가능해요.
            </p>

            <div className="pm-review-list">
              {rows.map((r, i) => (
                <div key={i} className="pm-review-row">
                  <input
                    className="pm-review-input pm-review-input--name"
                    value={r.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    placeholder="이름"
                  />
                  <input
                    className="pm-review-input pm-review-input--phone"
                    value={r.phone}
                    onChange={(e) => updateRow(i, { phone: e.target.value })}
                    placeholder="010-0000-0000"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="pm-review-del"
                    onClick={() => removeRow(i)}
                    aria-label="제외"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="pm-review-bar">
              <button type="button" className="pm-review-back" onClick={() => setStep("paste")}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M9 3 5 7l4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                돌아가기
              </button>
              <button
                type="button"
                className="pm-cta"
                onClick={submit}
                style={{ flex: 1 }}
                disabled={rows.length === 0 || submitting}
              >
                {submitting ? "등록 중..." : `${rows.length}명 등록하기`}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="pm-done">
            <div className="pm-done-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="m9 14 3.5 3.5L20 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="pm-chip" style={{ marginTop: 0 }}>
              <span className="pm-chip-dot" />
              <span>3단계 · 완료</span>
            </div>
            <h2 className="pm-modal-h pm-modal-h--center">
              <strong>{createdCount}명</strong> 등록 완료.
              <br />
              이제 시작이에요.
            </h2>
            <p className="pm-sub" style={{ textAlign: "center" }}>
              가입 알림을 단톡방에 공유하면
              <br />
              회원들이 빠르게 합류할 수 있어요.
            </p>

            <div className="pm-next-actions" style={{ width: "100%" }}>
              <button
                type="button"
                className="pm-next-action"
                onClick={handleShareInvite}
                style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
              >
                <span className="pm-next-num">01</span>
                <span>초대 코드 공유하기</span>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="pm-next-action"
                onClick={handleCreateMatch}
                style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
              >
                <span className="pm-next-num">02</span>
                <span>첫 경기 만들기</span>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <button type="button" className="pm-paste-secondary" onClick={onClose}>
              나중에 하기
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
