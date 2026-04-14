"use client";

import {
  createContext,
  useCallback,
  useContext,
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    // 에러·긴 메시지는 5초, 일반은 3.5초
    const duration = variant === "error" || message.length > 30 ? 5000 : 3500;
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

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
