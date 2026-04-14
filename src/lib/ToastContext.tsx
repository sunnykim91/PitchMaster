"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const ToastContext = createContext<{
  showToast: (message: string, variant?: ToastVariant) => void;
}>({ showToast: () => {} });

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    // 에러·긴 메시지는 5초, 일반은 3.5초
    const duration = variant === "error" || message.length > 30 ? 5000 : 3500;
    const timer = setTimeout(() => removeToast(id), duration);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  // 언마운트 시 남은 타이머 정리 (PWA 백그라운드 복귀 시 누적 방지)
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => removeToast(toast.id)}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 duration-200 transition-opacity hover:opacity-80",
              toast.variant === "success" && "bg-[hsl(var(--success))] text-white",
              toast.variant === "error" && "bg-destructive text-destructive-foreground",
              toast.variant === "info" && "bg-[hsl(var(--info))] text-white",
            )}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
