"use client";

import { useEffect, useState } from "react";
import { Coffee, MessageCircle, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPEN_CHAT_URL = "https://open.kakao.com/o/gSoLopui";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DISMISS_KEY = "alpha-tester-modal-shown-v1";
const SHOW_DELAY_MS = 1000;

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isAlreadyShown(): boolean {
  try {
    return !!localStorage.getItem(DISMISS_KEY);
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

function isForceShow(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha") === "1";
}

type ExistingTester = {
  id: string;
  google_email: string;
  registered_at: string;
  approved_at: string | null;
  rewarded_at: string | null;
} | null;

export default function AlphaTesterBanner() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingTester>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isAndroid() && !isForceShow()) return;
    fetch("/api/alpha-testers/ping", { method: "POST" }).catch((err) => {
      console.error("[alpha-ping]", err);
    });
  }, []);

  useEffect(() => {
    const force = isForceShow();
    if (!force) {
      if (!isAndroid()) return;
      if (isAlreadyShown()) return;
    }
    const t = setTimeout(() => {
      setOpen(true);
      if (!force) markShown();
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/alpha-testers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tester) {
          setExisting(data.tester);
          setEmail(data.tester.google_email ?? "");
        }
      })
      .catch(() => {});
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  function handleOpenChat() {
    window.open(OPEN_CHAT_URL, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setSubmitError("유효한 이메일 형식이 아닙니다.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/alpha-testers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleEmail: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error ?? "등록에 실패했습니다.");
        return;
      }
      setExisting(data.tester);
      setSubmitted(true);
    } catch {
      setSubmitError("네트워크 오류. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const isApproved = !!existing?.approved_at;
  const showSuccess = submitted || (existing && !submitError);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-2"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Coffee className="h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
            <h3 className="text-sm font-bold text-foreground leading-tight">
              안드로이드 앱 출시 도와주세요 ☕
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hook */}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[hsl(var(--warning))]/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--warning))]">
            🔥 선착순 20명
          </span>
          <span className="text-[11px] text-muted-foreground">
            14일간 매일 30초 사용 시{" "}
            <span className="font-semibold text-[hsl(var(--warning))]">커피 쿠폰</span>
          </span>
        </div>

        {/* Step 1 — 이메일 */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">
            <span className="mr-1 text-primary">①</span>
            Play Store 로그인용 구글 이메일
          </p>
          <form onSubmit={handleSubmit} className="mt-1.5 flex gap-1.5">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1 min-w-0 rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 shrink-0 bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning))]/90"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : existing ? (
                "변경"
              ) : (
                "등록"
              )}
            </Button>
          </form>
          {submitError && (
            <p className="mt-1 text-[11px] text-destructive">{submitError}</p>
          )}
          {showSuccess && (
            <p className="mt-1 flex items-start gap-1 text-[11px] text-[hsl(var(--success))]">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {isApproved
                  ? "승인 완료! Play Store에서 앱을 받아주세요."
                  : "등록 완료! 운영자 승인 후 카톡으로 안내드릴게요."}
              </span>
            </p>
          )}
        </div>

        {/* Step 2 — 카톡 */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">
            <span className="mr-1 text-primary">②</span>
            오픈채팅방 참여 (안내·쿠폰 수령)
          </p>
          <Button
            size="sm"
            className="mt-1.5 h-8 w-full bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
            onClick={handleOpenChat}
          >
            <MessageCircle className="mr-1 h-3.5 w-3.5" />
            카카오톡 오픈채팅 참여
          </Button>
        </div>

        {/* Footnote */}
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          ※ 평소 쓰시던 웹 대신{" "}
          <span className="font-semibold text-foreground">Play Store에서 받은 앱</span>을 사용하셔야
          출석 카운트돼요
        </p>
      </div>
    </div>
  );
}
