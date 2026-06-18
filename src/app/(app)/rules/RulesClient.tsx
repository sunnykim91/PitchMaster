"use client";

import "@/app/onboarding/onboarding.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import type { Role } from "@/lib/types";
import { toKoreanError } from "@/lib/errorMessages";
import { formatDateTime } from "@/lib/utils";
import { compressImage } from "@/lib/compressImage";

type RuleCategory = string;

interface Rule {
  id: string;
  title: string;
  content: string;
  category: RuleCategory;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiRule {
  id: string;
  team_id: string;
  title: string;
  content: string;
  category: RuleCategory;
  file_url?: string | null;
  file_name?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { name: string };
}

function mapRule(apiRule: ApiRule): Rule {
  return {
    id: apiRule.id,
    title: apiRule.title,
    content: apiRule.content,
    category: apiRule.category,
    fileUrl: apiRule.file_url ?? null,
    fileName: apiRule.file_name ?? null,
    createdAt: apiRule.created_at,
    updatedAt: apiRule.updated_at,
  };
}

// 카테고리 세분화 — 회칙 본질에 맞게. 기존 "일반"은 backward compat로 자동 표시
// 메인 페이지 필터 chip + 등록·수정 모달 chip 모두 동일 상수 사용
const RULE_CATEGORIES: RuleCategory[] = [
  "출결",
  "회비",
  "경기 운영",
  "매너",
  "가입·휴면",
  "회의·의결",
  "경조사",
  "기타",
];

// 회칙 작성 시 자주 다루는 주제 (안내용, 운영진이 자유롭게 추가)
const RULE_GUIDE_ITEMS = [
  { label: "출결", desc: "지각·불참 정의, 사전 통보 기한" },
  { label: "회비", desc: "회비 금액·납부 주기 (회비 설정과 일치시키면 좋아요)" },
  { label: "경기 운영", desc: "라인업 결정 방식, 교체 규칙" },
  { label: "코트 매너", desc: "장비·페어플레이·심판 존중" },
  { label: "가입 & 휴면", desc: "신입 가입 절차, 휴면·탈퇴 기준" },
  { label: "회의 & 의결", desc: "정기 회의 주기, 회칙 개정 절차" },
];

type InitialData = { rules: ApiRule[] };

export default function RulesClient({
  userRole,
  initialData,
}: {
  userRole?: Role;
  initialData?: InitialData;
}) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const { data, loading, error, refetch } = useApi<{ rules: ApiRule[] }>(
    "/api/rules",
    initialData ?? { rules: [] },
    { skip: !!initialData },
  );
  const rules = useMemo(() => data.rules.map(mapRule), [data.rules]);

  const canEdit = isStaffOrAbove(role);
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | "ALL">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    content: "",
    category: "출결" as RuleCategory,
    fileUrl: "",
    fileName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const filteredRules = useMemo(() => {
    const list = selectedCategory === "ALL" ? rules : rules.filter((r) => r.category === selectedCategory);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [rules, selectedCategory]);

  function resetForm() {
    setEditingId(null);
    setFormState({ title: "", content: "", category: "출결", fileUrl: "", fileName: "" });
    setFormErrors({});
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!formState.title.trim()) errors.title = "회칙 제목을 입력해주세요.";
    if (!formState.content.trim()) errors.content = "회칙 내용을 입력해주세요.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      const payload = {
        title: formState.title,
        content: formState.content,
        category: formState.category,
        fileUrl: formState.fileUrl || null,
        fileName: formState.fileName || null,
      };
      if (editingId) {
        const { error } = await apiMutate("/api/rules", "PUT", { id: editingId, ...payload });
        if (error) {
          showToast(toKoreanError(error), "error");
          return;
        }
        showToast("회칙이 수정되었습니다.");
      } else {
        const { error } = await apiMutate("/api/rules", "POST", payload);
        if (error) {
          showToast(toKoreanError(error), "error");
          return;
        }
        showToast("회칙이 등록되었습니다.");
      }
      resetForm();
      setShowForm(false);
      await refetch();
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(rule: Rule) {
    setEditingId(rule.id);
    setFormState({
      title: rule.title,
      content: rule.content,
      category: rule.category,
      fileUrl: rule.fileUrl ?? "",
      fileName: rule.fileName ?? "",
    });
    setShowForm(true);
    setUploadError(null);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "회칙을 삭제할까요?", variant: "destructive", confirmLabel: "삭제" });
    if (!ok) return;
    const { error } = await apiMutate("/api/rules", "DELETE", { id });
    if (error) {
      showToast(toKoreanError(error), "error");
      return;
    }
    showToast("회칙이 삭제되었습니다.");
    await refetch();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      // 이미지 첨부면 업로드 전 압축(문서는 compressImage가 원본 그대로 통과)
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/upload/file", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "업로드 실패");
      }
      const json = (await res.json()) as { data: { url: string; fileName: string } };
      setFormState((prev) => ({ ...prev, fileUrl: json.data.url, fileName: json.data.fileName }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  /* ── ESC: cancel edit ── */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForm) {
        setShowForm(false);
        resetForm();
      }
    };
    if (showForm) {
      window.addEventListener("keydown", onEsc);
      return () => window.removeEventListener("keydown", onEsc);
    }
  }, [showForm]);

  /* ── 작성 중 이탈 경고 ── */
  useEffect(() => {
    const hasContent = formState.title.trim() || formState.content.trim();
    if (!hasContent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formState.title, formState.content]);

  if (error) {
    return (
      <div className="pm-notice pm-notice--err" style={{ margin: 16 }}>
        오류: {toKoreanError(error)}
      </div>
    );
  }

  return (
    <div className="pm-page pm-page--members">
      <div className="pm-amb" aria-hidden />

      <header className="pm-appbar">
        <button
          type="button"
          className="pm-appbar-icon"
          aria-label="뒤로"
          onClick={() => window.history.back()}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              d="M11 4 6 9l5 5"
              stroke="currentColor"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="pm-appbar-title">
          회칙
          {rules.length > 0 && <span className="pm-appbar-count">{rules.length}</span>}
        </div>
        {canEdit && rules.length > 0 ? (
          <button
            type="button"
            className="pm-appbar-icon"
            aria-label="새 회칙 추가"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M9 4v10M4 9h10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className="pm-appbar-icon" aria-hidden />
        )}
      </header>

      <main className="pm-main pm-main--members">
        {loading && rules.length === 0 ? (
          <div className="pm-card" style={{ padding: 24, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
            불러오는 중…
          </div>
        ) : rules.length === 0 ? (
          <RulesEmpty
            canEdit={canEdit}
            onStart={() => {
              resetForm();
              setShowForm(true);
            }}
          />
        ) : (
          <>
            {/* 카테고리 필터 chip row */}
            <div className="pm-filters">
              <FilterChip
                active={selectedCategory === "ALL"}
                onClick={() => setSelectedCategory("ALL")}
                label="전체"
                count={selectedCategory === "ALL" ? rules.length : undefined}
              />
              {RULE_CATEGORIES.map((c) => {
                const n = rules.filter((r) => r.category === c).length;
                return (
                  <FilterChip
                    key={c}
                    active={selectedCategory === c}
                    onClick={() => setSelectedCategory(c)}
                    label={c}
                    count={selectedCategory === c ? n : undefined}
                  />
                );
              })}
            </div>

            {/* 새 회칙 추가 strip (운영진) */}
            {canEdit && !showForm && (
              <button
                type="button"
                className="pm-paste-strip"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <div className="pm-paste-strip-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="pm-paste-strip-body">
                  <div className="pm-paste-strip-label">새 회칙 추가</div>
                  <div className="pm-paste-strip-sub">제목·내용·카테고리·첨부파일</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            {/* 회칙 카드 리스트 — 시안 handbook editorial 톤 */}
            {filteredRules.length === 0 ? (
              <div className="pm-empty">이 카테고리에 등록된 회칙이 없어요.</div>
            ) : (
              <div className="pm-doc-grid">
                {filteredRules.map((rule, i) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    index={i + 1}
                    canEdit={canEdit}
                    onEdit={() => handleEdit(rule)}
                    onDelete={() => handleDelete(rule.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 등록·수정 모달 (운영진) — 어느 카드에서 수정 눌러도 동일한 위치 */}
      <RuleEditModalShell
        open={canEdit && showForm}
        editingId={editingId}
        formState={formState}
        setFormState={setFormState}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        submitting={submitting}
        uploading={uploading}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        onFileChange={handleFileChange}
        onClearFile={() => {
          setFormState((prev) => ({ ...prev, fileUrl: "", fileName: "" }));
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RuleEditModalShell — 등록·수정 모달 (createPortal)
// ─────────────────────────────────────────────────────────────
function RuleEditModalShell({
  open,
  editingId,
  formState,
  setFormState,
  formErrors,
  setFormErrors,
  submitting,
  uploading,
  uploadError,
  fileInputRef,
  onClose,
  onSubmit,
  onFileChange,
  onClearFile,
}: {
  open: boolean;
  editingId: string | null;
  formState: { title: string; content: string; category: RuleCategory; fileUrl: string; fileName: string };
  setFormState: React.Dispatch<
    React.SetStateAction<{ title: string; content: string; category: RuleCategory; fileUrl: string; fileName: string }>
  >;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submitting: boolean;
  uploading: boolean;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}) {
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

  if (!mounted || !open) return null;

  return createPortal(
    <div className="pm-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pm-modal pm-modal--tall"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pm-modal-head">
          <div className="pm-modal-steps">
            <span className="pm-mstep is-on" style={{ width: "100%" }} />
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

        <div className="pm-chip" style={{ marginTop: 2 }}>
          <span className="pm-chip-dot" />
          <span>{editingId ? "회칙 수정" : "새 회칙"}</span>
        </div>
        <h2 className="pm-modal-h">{editingId ? "회칙 수정" : "회칙 추가"}</h2>
        <p className="pm-sub">
          제목·내용·카테고리를 입력하고 첨부파일은 선택사항이에요.
        </p>

        <form onSubmit={onSubmit} style={{ display: "contents" }}>
          <div className="pm-field">
            <div className="pm-label">
              <span>카테고리</span>
              <span className="pm-pill pm-pill--req">필수</span>
            </div>
            <div className="pm-filters" style={{ paddingBottom: 0 }}>
              {RULE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pm-filter ${formState.category === c ? "is-on" : ""}`}
                  onClick={() => setFormState((prev) => ({ ...prev, category: c }))}
                >
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pm-field">
            <div className="pm-label">
              <span>제목</span>
              <span className="pm-pill pm-pill--req">필수</span>
            </div>
            <input
              className={`pm-input ${formErrors.title ? "is-error" : ""}`}
              value={formState.title}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, title: e.target.value }));
                setFormErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="예: 회비 정책"
              maxLength={200}
            />
            {formErrors.title && <p className="pm-help pm-help--err">{formErrors.title}</p>}
          </div>

          <div className="pm-field">
            <div className="pm-label">
              <span>내용</span>
              <span className="pm-pill pm-pill--req">필수</span>
            </div>
            <textarea
              className={`pm-paste-ta ${formErrors.content ? "is-error" : ""}`}
              value={formState.content}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, content: e.target.value }));
                setFormErrors((prev) => ({ ...prev, content: "" }));
              }}
              rows={6}
              placeholder="회칙 본문 (벌금 뒤에 [자동] 표시 가능)"
            />
            {formErrors.content && <p className="pm-help pm-help--err">{formErrors.content}</p>}
          </div>

          <div className="pm-field">
            <div className="pm-label">
              <span>첨부파일</span>
              <span className="pm-pill pm-pill--opt">선택</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx"
              disabled={uploading}
              onChange={onFileChange}
              style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
            />
            {uploading && <p className="pm-help">업로드 중...</p>}
            {uploadError && <p className="pm-help pm-help--err">{uploadError}</p>}
            {formState.fileUrl && !uploading && (
              <div
                className="pm-help"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>📎 {formState.fileName || "첨부파일"}</span>
                <button
                  type="button"
                  onClick={onClearFile}
                  style={{
                    color: "hsl(var(--destructive))",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  삭제
                </button>
              </div>
            )}
            <p className="pm-help">PDF · HWP · DOC · XLSX 등 / 최대 10MB</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="pm-review-back"
              style={{ height: 48, flex: "0 0 auto" }}
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="pm-cta"
              disabled={submitting || uploading}
              style={{ flex: 1, height: 48 }}
            >
              {submitting ? "저장 중..." : editingId ? "수정 완료" : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────
// RulesEmpty — hero + 가이드 안내 + 직접 작성 CTA (템플릿 X)
// ─────────────────────────────────────────────────────────────
function RulesEmpty({ canEdit, onStart }: { canEdit: boolean; onStart: () => void }) {
  if (!canEdit) {
    return (
      <div
        className="pm-card pm-empty"
        style={{ padding: 24, justifyContent: "center", textAlign: "center" }}
      >
        <div className="pm-empty-glyph" aria-hidden>
          📜
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
            회칙이 아직 없어요
          </div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: "hsl(var(--muted-foreground))" }}>
            회장이 작성하면 여기에 표시돼요
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pm-paste-hero">
        <div className="pm-amb" aria-hidden />
        <div className="pm-hero-inner">
          <div className="pm-chip" style={{ marginTop: 0 }}>
            <span className="pm-chip-dot" />
            <span>회칙 시작</span>
          </div>
          <h2 className="pm-h1 pm-h1--hero">팀 회칙을 한 곳에.</h2>
          <p className="pm-sub" style={{ marginBottom: 4 }}>
            단톡방에 묻힌 회칙은 매번 다시 물어보게 돼요.
            <br />
            팀에 맞게 자유롭게 작성하세요.
          </p>

          <button
            type="button"
            className="pm-paste-cta"
            onClick={onStart}
            style={{ marginTop: 6 }}
          >
            <span className="pm-paste-cta-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M14 3l3 3L8 15l-4 1 1-4L14 3z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="pm-paste-cta-body">
              <div className="pm-paste-cta-label">첫 회칙 작성하기</div>
              <div className="pm-paste-cta-sub">제목·내용·카테고리 자유 작성</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 가이드 — 회칙에 자주 다루는 주제 */}
      <div className="pm-card" style={{ padding: 16 }}>
        <div className="pm-card-head" style={{ paddingBottom: 6 }}>
          <div className="pm-card-chip">예시 주제</div>
          <div className="pm-card-title">회칙에 보통 어떤 내용을?</div>
          <div className="pm-card-hint">
            팀마다 운영 방식이 달라요. 필요한 항목만 골라 작성하시면 돼요.
          </div>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {RULE_GUIDE_ITEMS.map((item) => (
            <li
              key={item.label}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                background: "hsl(var(--background) / 0.4)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "hsl(var(--primary))",
                  paddingTop: 1,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: "hsl(var(--muted-foreground))",
                  letterSpacing: "-0.005em",
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>

    </>
  );
}

// ─────────────────────────────────────────────────────────────
// RuleCard — handbook editorial 톤 카드 (기존 모델 보존)
// ─────────────────────────────────────────────────────────────
function RuleCard({
  rule,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  rule: Rule;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="pm-card pm-doc">
      <header className="pm-doc-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pm-doc-secnum">{String(index).padStart(2, "0")}</span>
          <span className="pm-rolebadge" style={{ "--hue": "var(--primary)" } as React.CSSProperties}>
            {rule.category}
          </span>
        </div>
        <h3 className="pm-doc-h" style={{ marginTop: 4 }}>
          {rule.title}
        </h3>
        <div className="pm-doc-meta">
          등록 {formatDateTime(rule.createdAt)} · 수정 {formatDateTime(rule.updatedAt)}
        </div>
      </header>

      <div className="pm-doc-divider" />

      <p className="pm-doc-body">{rule.content}</p>

      {rule.fileUrl && (
        <a
          href={rule.fileUrl}
          download={rule.fileName || true}
          target="_blank"
          rel="noopener noreferrer"
          className="pm-paste-strip"
          style={{ marginTop: 4, textDecoration: "none" }}
        >
          <div className="pm-paste-strip-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4l3 3-3 3M8 13h5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="pm-paste-strip-body">
            <div className="pm-paste-strip-label">{rule.fileName || "첨부파일"}</div>
            <div className="pm-paste-strip-sub">다운로드</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M5 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button
            type="button"
            onClick={onEdit}
            className="pm-paste-secondary"
            style={{ flex: 1, height: 38, fontSize: 12.5 }}
          >
            수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="pm-paste-secondary"
            style={{
              flex: 1,
              height: 38,
              fontSize: 12.5,
              color: "hsl(var(--destructive))",
              borderColor: "hsl(var(--destructive) / 0.4)",
            }}
          >
            삭제
          </button>
        </div>
      )}
    </article>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button type="button" onClick={onClick} className={`pm-filter ${active ? "is-on" : ""}`}>
      <span>{label}</span>
      {count !== undefined && <span className="pm-filter-count">{count}</span>}
    </button>
  );
}
