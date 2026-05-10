"use client";

/**
 * OcrScreenshotGuide — 회비 OCR/엑셀 사용 가이드 모달
 *
 * 모바일: 화면 하단에서 슬라이드 업 (bottom sheet)
 * PC: 화면 가운데 정렬 (좁은 모달)
 *
 * Sheet 컴포넌트 대신 자체 fixed 모달로 PC 풀폭 문제 해결.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Camera, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OcrScreenshotGuideProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "capture" | "excel";

export function OcrScreenshotGuide({ open, onClose }: OcrScreenshotGuideProps) {
  const [mode, setMode] = useState<Mode>("capture");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-guide-title"
    >
      <div
        className="relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl"
        style={{ maxWidth: "min(100vw, 440px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border/40">
          <div>
            <h2 id="ocr-guide-title" className="text-base font-bold leading-tight">회비 자동 정리 가이드</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">통장 캡처 또는 엑셀 다운로드로 한 번에</p>
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
            onClick={() => setMode("capture")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] font-semibold transition-colors",
              mode === "capture" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            통장 캡처
          </button>
          <button
            type="button"
            onClick={() => setMode("excel")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] font-semibold transition-colors",
              mode === "excel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            엑셀 다운로드
          </button>
        </div>

        {/* 콘텐츠 — 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === "capture" ? (
            <CaptureGuide />
          ) : (
            <ExcelGuide />
          )}
        </div>

        {/* 하단 닫기 */}
        <div className="px-5 py-3 border-t border-border/40 shrink-0">
          <Button onClick={onClose} className="w-full" variant="outline">
            닫기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CaptureGuide() {
  return (
    <div className="space-y-4">
      <p className="text-[14px] text-foreground leading-[1.6]">
        은행 앱의 <b>거래 내역 화면</b>을 그대로 캡처해 올려주세요. 거래 5~30건이 한 화면에 보이게 스크롤한 뒤 캡처하면 가장 잘 인식됩니다.
      </p>

      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <Image
          src="/screenshots/ocr-kakaobank.png"
          alt="카카오뱅크 거래 내역 캡처 예시 (개인정보 가림)"
          width={720}
          height={1760}
          className="w-full h-auto"
          unoptimized
        />
        <p className="px-3 py-2 text-[11.5px] text-center text-muted-foreground border-t border-border/40">
          카카오뱅크 예시 (개인정보 가림 처리)
        </p>
      </div>

      <ul className="space-y-1.5 text-[13.5px] text-muted-foreground leading-[1.5]">
        <li>✅ 날짜·이름·금액이 또렷하게 보이게</li>
        <li>✅ 한 번에 캡처 (분할 캡처는 따로 올리기)</li>
        <li>❌ 화면 회전·기울어진 사진은 인식률 떨어짐</li>
      </ul>
    </div>
  );
}

function ExcelGuide() {
  const steps = [
    "카카오뱅크 홈에서 팀 통장 선택",
    "오른쪽 상단 톱니바퀴(⚙) → 계좌관리",
    "거래내역 → 거래내역 다운로드",
    "다운받은 엑셀 파일을 PitchMaster에 업로드",
  ];
  return (
    <div className="space-y-4">
      <p className="text-[14px] text-foreground leading-[1.6]">
        카카오뱅크 공식 엑셀 다운로드를 쓰면 <b>한 번에 모든 거래</b>를 올릴 수 있어요. 캡처보다 인식 정확도가 훨씬 높습니다.
      </p>

      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px] leading-[1.5]">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums"
              style={{
                background: "hsl(var(--info) / 0.15)",
                color: "hsl(var(--info))",
                border: "1px solid hsl(var(--info) / 0.30)",
              }}
            >
              {i + 1}
            </span>
            <span className="text-foreground">{step}</span>
          </li>
        ))}
      </ol>

      <div
        className="rounded-lg p-3 text-[13px] leading-[1.5]"
        style={{
          background: "hsl(var(--info) / 0.08)",
          border: "1px solid hsl(var(--info) / 0.25)",
          color: "hsl(var(--info))",
        }}
      >
        💡 토스·신한·국민·우리 등 다른 은행도 비슷한 경로로 엑셀 다운로드 후 그대로 올리면 됩니다.
      </div>
    </div>
  );
}
