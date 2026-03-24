import type { CSSProperties } from "react";

export type UniformPattern = "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";

export function getUniformStyle(primary: string, secondary: string, pattern: string): CSSProperties {
  if (pattern === "STRIPES_VERTICAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(90deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  if (pattern === "STRIPES_HORIZONTAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(180deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  if (pattern === "STRIPES_DIAGONAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(135deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  return { backgroundColor: primary };
}

export function getJerseyStyle(primary: string, secondary: string, pattern: string): CSSProperties {
  return {
    ...getUniformStyle(primary, secondary, pattern),
    clipPath:
      "polygon(12% 12%, 30% 12%, 34% 0%, 66% 0%, 70% 12%, 88% 12%, 100% 34%, 86% 48%, 86% 100%, 14% 100%, 14% 48%, 0% 34%)",
    borderRadius: "8px",
  };
}

/** 색상 hex를 한국어 이름으로 근사 변환 */
export function colorToKorean(hex: string): string {
  const map: Record<string, string> = {
    "#000000": "검정",
    "#ffffff": "흰색",
    "#ff0000": "빨강",
    "#0000ff": "파랑",
    "#2563eb": "파랑",
    "#f97316": "주황",
    "#22c55e": "초록",
    "#eab308": "노랑",
    "#ef4444": "빨강",
    "#8b5cf6": "보라",
    "#ec4899": "핑크",
    "#14b8a6": "청록",
  };
  const lower = hex.toLowerCase();
  if (map[lower]) return map[lower];
  return hex;
}
