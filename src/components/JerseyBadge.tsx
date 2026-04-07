"use client";
import { useMemo } from "react";
import { getJerseyStyle, colorToKorean } from "@/lib/uniformUtils";
import { cn } from "@/lib/utils";

type Props = {
  primary: string;
  secondary: string;
  pattern: string;
  type: "HOME" | "AWAY" | "THIRD";
  size?: "sm" | "md"; // sm=28px, md=40px
  showLabel?: boolean;
  className?: string;
};

export function JerseyBadge({
  primary,
  secondary,
  pattern,
  type,
  size = "sm",
  showLabel = false,
  className,
}: Props) {
  const color1 = type === "THIRD" ? primary : type === "HOME" ? primary : secondary;
  const color2 = type === "THIRD" ? secondary : type === "HOME" ? secondary : primary;
  const style = useMemo(() => getJerseyStyle(color1, color2, pattern), [color1, color2, pattern]);
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const label = type === "HOME" ? "홈" : type === "AWAY" ? "원정" : "써드";
  const colorName = colorToKorean(color1);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(sizeClass, "shrink-0")} style={style} title={`${label} 유니폼`} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {label}
          {colorName !== color1 ? `(${colorName})` : ""}
        </span>
      )}
    </div>
  );
}
