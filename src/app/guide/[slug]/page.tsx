import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getGuide, guideSlugs } from "@/lib/guides/registry";

export async function generateStaticParams() {
  return guideSlugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getGuide(slug);
  if (!post) return { title: "가이드를 찾을 수 없습니다 — PitchMaster" };

  const url = `https://pitch-master.app/guide/${slug}`;
  return {
    title: `${post.meta.title} — PitchMaster`,
    description: post.meta.description,
    keywords: post.meta.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.meta.title,
      description: post.meta.description,
      url,
      siteName: "PitchMaster",
      locale: "ko_KR",
      publishedTime: post.meta.publishedAt,
      modifiedTime: post.meta.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
    },
  };
}

export default async function GuidePostPage({ params }: Props) {
  const { slug } = await params;
  const post = getGuide(slug);
  if (!post) notFound();

  const Content = post.default;
  const { meta } = post;

  // JSON-LD Article 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    keywords: meta.keywords.join(", "),
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt,
    author: { "@type": "Organization", name: "PitchMaster" },
    publisher: {
      "@type": "Organization",
      name: "PitchMaster",
      logo: {
        "@type": "ImageObject",
        url: "https://pitch-master.app/icons/icon-192.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pitch-master.app/guide/${slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <Link
          href="/guide"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          가이드로 돌아가기
        </Link>

        <header className="mt-6 mb-8 border-b border-border/40 pb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {meta.category}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
            {meta.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {meta.description}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <time dateTime={meta.publishedAt}>{meta.publishedAt.replaceAll("-", ".")}</time>
            <span>·</span>
            <span>{meta.readingMinutes}분 읽기</span>
          </div>
        </header>

        <article className="guide-prose">
          <Content />
        </article>

        <footer className="mt-12 border-t border-border/40 pt-8">
          <div className="rounded-2xl bg-secondary/30 p-5">
            <p className="text-sm font-semibold text-foreground">
              조기축구·풋살 동호회 운영을 한 곳에서
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              회비 OCR · 출석 투표 · AI 자동 라인업 · 전술판 · 경기 기록 — 90+ 팀이 무료로
              사용합니다.
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
