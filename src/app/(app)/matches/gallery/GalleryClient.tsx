"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Calendar } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { ImageLightbox } from "@/components/ImageLightbox";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateKo } from "@/lib/utils";

type GalleryMatch = {
  matchId: string;
  matchDate: string;
  matchTime: string | null;
  opponentName: string | null;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  photos: string[];
};

type GalleryData = {
  matches: GalleryMatch[];
  totalPhotos: number;
};

function matchTitle(m: GalleryMatch): string {
  if (m.matchType === "INTERNAL") return "자체전";
  if (m.matchType === "EVENT") return m.opponentName?.trim() ? m.opponentName : "팀 일정";
  return m.opponentName?.trim() ? `vs ${m.opponentName}` : "팀 경기";
}

export default function GalleryClient({ teamName }: { teamName: string }) {
  const { data, loading, error } = useApi<GalleryData>("/api/gallery", { matches: [], totalPhotos: 0 });
  const [lightboxIndex, setLightboxIndex] = useState<{ matchIdx: number; photoIdx: number } | null>(null);

  // 모든 사진을 평탄화해서 prev/next 네비게이션 계산
  const flatPhotos = useMemo(() => {
    const arr: { src: string; matchIdx: number; photoIdx: number; match: GalleryMatch }[] = [];
    data.matches.forEach((m, matchIdx) => {
      m.photos.forEach((src, photoIdx) => {
        arr.push({ src, matchIdx, photoIdx, match: m });
      });
    });
    return arr;
  }, [data.matches]);

  const currentFlatIndex = useMemo(() => {
    if (!lightboxIndex) return -1;
    return flatPhotos.findIndex(
      (p) => p.matchIdx === lightboxIndex.matchIdx && p.photoIdx === lightboxIndex.photoIdx,
    );
  }, [lightboxIndex, flatPhotos]);

  const currentPhoto = currentFlatIndex >= 0 ? flatPhotos[currentFlatIndex] : null;

  function goPrev() {
    if (currentFlatIndex <= 0) return;
    const prev = flatPhotos[currentFlatIndex - 1];
    setLightboxIndex({ matchIdx: prev.matchIdx, photoIdx: prev.photoIdx });
  }
  function goNext() {
    if (currentFlatIndex < 0 || currentFlatIndex >= flatPhotos.length - 1) return;
    const next = flatPhotos[currentFlatIndex + 1];
    setLightboxIndex({ matchIdx: next.matchIdx, photoIdx: next.photoIdx });
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">팀 앨범</h1>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {teamName} · 총 {data.totalPhotos}장 · {data.matches.length}경기
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/matches" className="text-xs text-muted-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            일정으로
          </Link>
        </Button>
      </div>

      {/* 본문 */}
      {loading ? (
        <GallerySkeleton />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          사진을 불러오지 못했습니다: {error}
        </div>
      ) : data.matches.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="아직 올라온 사진이 없습니다"
          description="경기 후 일지 탭에서 사진을 업로드하면 여기에 모입니다."
          action={
            <Button size="sm" asChild>
              <Link href="/matches">경기 목록 보기</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {data.matches.map((m, matchIdx) => (
            <section key={m.matchId}>
              {/* 경기 구분 헤더 */}
              <Link
                href={`/matches/${m.matchId}?tab=diary`}
                className="mb-2 flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-semibold">{formatDateKo(m.matchDate)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="truncate text-muted-foreground">{matchTitle(m)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{m.photos.length}장</span>
              </Link>

              {/* 사진 그리드 — 3열 정사각 */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {m.photos.map((src, photoIdx) => (
                  <button
                    key={`${m.matchId}-${photoIdx}`}
                    type="button"
                    onClick={() => setLightboxIndex({ matchIdx, photoIdx })}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-secondary/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Image
                      src={src}
                      alt={`${matchTitle(m)} 사진 ${photoIdx + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 200px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 라이트박스 — prev/next 버튼 포함 */}
      {currentPhoto && (
        <>
          <ImageLightbox
            src={currentPhoto.src}
            alt={matchTitle(currentPhoto.match)}
            onClose={() => setLightboxIndex(null)}
          />
          {/* 좌/우 화살표 — lightbox 위에 덧대기 */}
          <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-between px-2 sm:px-4">
            <button
              type="button"
              disabled={currentFlatIndex <= 0}
              onClick={goPrev}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-30"
              aria-label="이전 사진"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={currentFlatIndex >= flatPhotos.length - 1}
              onClick={goNext}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-30"
              aria-label="다음 사진"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {/* 사진 위치 표시 */}
          <div className="pointer-events-none fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {currentFlatIndex + 1} / {flatPhotos.length}
          </div>
        </>
      )}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <section key={i}>
          <Skeleton className="mb-2 h-5 w-48" />
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4, 5].map((j) => (
              <Skeleton key={j} className="aspect-square rounded-lg" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
