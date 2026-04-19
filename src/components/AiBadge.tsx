import { Sparkles, Loader2, Cog, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiBadgeVariant = "ai" | "rule" | "loading" | "error";
export type AiBadgeSize = "sm" | "md";

export type AiBadgeProps = {
  variant: AiBadgeVariant;
  label?: string;
  size?: AiBadgeSize;
  className?: string;
};

/**
 * AI 기능 공통 배지.
 * - ai: AI 생성물 (Sparkles + primary 그라데이션)
 * - rule: 룰 기반 fallback (Cog + muted)
 * - loading: 진행 중 (Loader2 회전 + primary)
 * - error: 실패 (AlertCircle + destructive)
 *
 * label 생략 시 배지만 표시. 크기 sm=h-5, md=h-6.
 */
export function AiBadge({ variant, label, size = "md", className }: AiBadgeProps) {
  const sizeClasses = size === "sm"
    ? { box: "h-5 min-w-5 px-1 text-[10px]", icon: "h-3 w-3", text: "text-xs" }
    : { box: "h-6 min-w-6 px-1.5 text-[11px]", icon: "h-3.5 w-3.5", text: "text-sm" };

  const variantClasses: Record<AiBadgeVariant, { box: string; text: string }> = {
    ai: {
      box: "bg-gradient-to-br from-primary/20 via-primary/15 to-purple-500/15 text-primary ring-1 ring-primary/20",
      text: "font-bold text-foreground",
    },
    rule: {
      box: "bg-muted text-muted-foreground ring-1 ring-border/40",
      text: "font-semibold text-muted-foreground",
    },
    loading: {
      box: "bg-primary/15 text-primary ring-1 ring-primary/20",
      text: "font-semibold text-foreground/80",
    },
    error: {
      box: "bg-destructive/15 text-destructive ring-1 ring-destructive/20",
      text: "font-semibold text-destructive",
    },
  };

  const Icon = variant === "ai" ? Sparkles
    : variant === "rule" ? Cog
    : variant === "loading" ? Loader2
    : AlertCircle;

  const v = variantClasses[variant];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn(
        "inline-flex items-center justify-center rounded-md font-black",
        sizeClasses.box,
        v.box,
      )}>
        <Icon className={cn(sizeClasses.icon, variant === "loading" && "animate-spin")} />
      </span>
      {label && (
        <span className={cn(sizeClasses.text, v.text)}>
          {label}
        </span>
      )}
    </span>
  );
}
