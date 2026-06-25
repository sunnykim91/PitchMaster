"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** 엔터(autoFocus) 기본 버튼 지정.
   * 미지정 시: default→확인, destructive→취소(실수 삭제 방지).
   * 사소·복구 쉬운 삭제(예: 영상 컷)는 "confirm"으로 엔터=삭제 가능. */
  defaultFocus?: "confirm" | "cancel";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(
  () => Promise.resolve(false)
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(null);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state?.open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgb(0_0_0_/_0.5)] p-4"
            onClick={handleCancel}
          >
            <Card
              className="w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold">{state.title}</h3>
              {state.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {state.description}
                </p>
              )}
              {(() => {
                // 엔터(autoFocus) 대상: defaultFocus 우선, 없으면 기존 규칙(destructive→취소).
                const confirmFocused =
                  state.defaultFocus
                    ? state.defaultFocus === "confirm"
                    : state.variant !== "destructive";
                return (
                  <div className="mt-5 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleCancel}
                      autoFocus={!confirmFocused}
                    >
                      {state.cancelLabel ?? "취소"}
                    </Button>
                    <Button
                      variant={state.variant === "destructive" ? "destructive" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={handleConfirm}
                      autoFocus={confirmFocused}
                    >
                      {state.confirmLabel ?? "확인"}
                    </Button>
                  </div>
                );
              })()}
            </Card>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
