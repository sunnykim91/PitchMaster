import { redirect } from "next/navigation";

/**
 * 레거시 라우트 — 현재는 게시판 내부 "앨범" 탭으로 통합됨.
 * 기존 북마크·외부 링크 호환성을 위해 리다이렉트만 수행.
 */
export default function LegacyGalleryRedirect() {
  redirect("/board?tab=gallery");
}
