"use client";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogBase({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setReady(false);
      const timer = setTimeout(() => setReady(true), 200);
      confirmRef.current?.focus();
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        window.removeEventListener("keydown", handleEsc);
        clearTimeout(timer);
      };
    } else {
      setReady(false);
    }
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  // Portal로 document.body에 직접 렌더 — transform 부모에 의한 fixed 위치 오류 방지
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => { if (ready) onCancel(); }}
      onTouchEnd={(e) => { if (!ready) e.preventDefault(); }}
    >
      <Card className="mx-4 w-full max-w-sm p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={variant === "destructive" ? "destructive" : "default"} size="lg" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
}

export const ConfirmDialog = memo(ConfirmDialogBase);
