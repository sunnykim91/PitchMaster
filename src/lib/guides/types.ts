import type { ComponentType } from "react";

export type GuideMeta = {
  /** URL slug (kebab-case) */
  slug: string;
  /** SEO 제목 */
  title: string;
  /** Meta description (150-160자) */
  description: string;
  /** 검색 키워드 (쉼표 구분 meta keywords + JSON-LD) */
  keywords: string[];
  /** 카테고리 라벨 */
  category: "운영" | "회비" | "전술" | "도구";
  /** 발행일 (YYYY-MM-DD, KST) */
  publishedAt: string;
  /** 마지막 수정일 */
  updatedAt: string;
  /** 예상 읽기 분 */
  readingMinutes: number;
  /** 관련 글 slug */
  related?: string[];
};

export type GuidePost = {
  meta: GuideMeta;
  default: ComponentType;
};
