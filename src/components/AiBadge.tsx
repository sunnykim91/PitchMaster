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
    ? { box: "h-5 px-1.5 gap-1 text-[10px]", icon: "h-3 w-3", text: "text-xs" }
    : { box: "h-6 px-2 gap-1 text-[11px]", icon: "h-3.5 w-3.5", text: "text-sm" };

  // variant별 박스 스타일 + 박스 안에 표시할 축약 라벨("AI"/"룰"/"생성중"/"실패")
  const variantClasses: Record<AiBadgeVariant, { box: string; text: string; short: string }> = {
    ai: {
      box: "bg-gradient-to-br from-primary/25 via-primary/20 to-purple-500/20 text-primary ring-1 ring-primary/30 shadow-sm shadow-primary/10",
      text: "font-bold text-foreground",
      short: "AI",
    },
    rule: {
      box: "bg-muted text-muted-foreground ring-1 ring-border/40",
      text: "font-semibold text-muted-foreground",
      short: "룰",
    },
    loading: {
      box: "bg-primary/15 text-primary ring-1 ring-primary/20",
      text: "font-semibold text-foreground/80",
      short: "생성중",
    },
    error: {
      box: "bg-destructive/15 text-destructive ring-1 ring-destructive/20",
      text: "font-semibold text-destructive",
      short: "실패",
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
        "inline-flex items-center justify-center rounded-md font-black tracking-wide",
        sizeClasses.box,
        v.box,
      )}>
        <Icon className={cn(sizeClasses.icon, variant === "loading" && "animate-spin")} />
        <span className="leading-none">{v.short}</span>
      </span>
      {label && (
        <span className={cn(sizeClasses.text, v.text)}>
          {label}
        </span>
      )}
    </span>
  );
}
