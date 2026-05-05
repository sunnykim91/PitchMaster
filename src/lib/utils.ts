import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 숫자만 추출 후 010-1234-5678 형태로 포맷 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 포맷된 전화번호에서 숫자만 추출 */
export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** 시간 문자열에서 HH:MM만 추출 (초 제거) */
export function formatTime(value: string): string {
  if (!value) return "";
  // "HH:MM:SS" → "HH:MM", "2025-03-16T17:00:00" → "17:00", "2025-03-16T17:00" → "17:00"
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

/** datetime 문자열에서 "YYYY-MM-DD HH:MM" 형태로 포맷 */
export function formatDateTime(value: string): string {
  if (!value) return "";
  const date = value.slice(0, 10);
  const time = formatTime(value);
  return time ? `${date} ${time}` : date;
}

/** ISO date → "2025년 3월 16일" */
export function formatDateKo(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
  } catch {
    return iso;
  }
}

/** ISO date → "3월 16일 (토)" */
export function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = days[d.getDay()];
  return `${month}월 ${day}일 (${dow})`;
}

/** ISO datetime → "마감: 3월 16일 17:00" */
export function formatDue(iso: string): string {
  try {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}월 ${day}일 ${h}:${min}`;
  } catch {
    return iso;
  }
}

/** ISO date → "2025.03.16" */
export function formatDateDot(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y}.${m}.${d}`;
}

/**
 * 카카오 프로필 이미지 URL 사이즈 축소.
 *
 * 카카오 CDN 패턴: `.../img_640x640.jpg` → `.../img_110x110.jpg`
 * 표시 사이즈 작은 곳(아바타 28~64px)에 640px 원본 로드 방지.
 *
 * 카카오 CDN 지원 사이즈(보통): 110·160·640·1024. 110 이 가장 작음.
 * URL 패턴 안 맞으면 원본 반환 (안전).
 */
export function compactKakaoImage(url: string | null | undefined, size: number = 110): string {
  if (!url) return "";
  if (!/kakaocdn|kakao\.com|kakaousercontent/i.test(url)) return url;
  return url.replace(/\/img(_\d+x\d+)?(\.[a-z]+)/i, `/img_${size}x${size}$2`);
}

/** Relative time display in Korean */
export function relativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}월 ${day}일`;
}
