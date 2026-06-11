import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { listGuides } from "@/lib/guides/registry";

const TITLE = "조기축구·풋살 팀 운영 가이드 — PitchMaster";
const DESCRIPTION =
  "조기축구·풋살 팀 총무·회장을 위한 운영 가이드 모음. 회비 관리, 출석 투표, 벌금 규정, 라인업·전술판까지 5년차 운영자가 정리한 실전 노하우를 한 곳에서 보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://pitch-master.app/guide" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://pitch-master.app/guide",
    siteName: "PitchMaster",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function GuideIndexPage() {
  const guides = listGuides();

  // JSON-LD CollectionPage — 가이드 허브를 검색엔진에 글 묶음으로 노출
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "조기축구·풋살 팀 운영 가이드",
    description: DESCRIPTION,
    url: "https://pitch-master.app/guide",
    hasPart: guides.map((g) => ({
      "@type": "Article",
      headline: g.meta.title,
      description: g.meta.description,
      url: `https://pitch-master.app/guide/${g.meta.slug}`,
      datePublished: g.meta.publishedAt,
      dateModified: g.meta.updatedAt,
    })),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          홈으로
        </Link>

        <header className="mt-6 mb-8 border-b border-border/40 pb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            GUIDE
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
            조기축구·풋살 팀 운영 가이드
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {guides.map((g) => (
            <li key={g.meta.slug}>
              <Link
                href={`/guide/${g.meta.slug}`}
                className="group block rounded-2xl border border-border/60 bg-secondary/20 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {g.meta.category}
                </div>
                <h2 className="mt-2 text-base sm:text-lg font-bold leading-snug text-foreground">
                  {g.meta.title}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {g.meta.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={g.meta.publishedAt}>
                    {g.meta.publishedAt.replaceAll("-", ".")}
                  </time>
                  <span>·</span>
                  <span>{g.meta.readingMinutes}분 읽기</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-12 border-t border-border/40 pt-8">
          <div className="rounded-2xl bg-secondary/30 p-5">
            <p className="text-sm font-semibold text-foreground">
              조기축구·풋살 동호회 운영을 한 곳에서
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              회비 OCR · 출석 투표 · AI 자동 라인업 · 전술판 · 경기 기록 — 지금 무료로 사용해보세요.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              PitchMaster 무료로 시작
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
