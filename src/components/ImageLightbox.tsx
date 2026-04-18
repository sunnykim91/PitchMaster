"use client";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

function ImageLightboxBase({ src, alt = "", onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const historyPushed = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!src) return;

    // 모바일 뒤로가기: 히스토리 스택에 더미 엔트리 push
    history.pushState({ lightbox: true }, "");
    historyPushed.current = true;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 뒤로가기(popstate) → 라이트박스 닫기로 가로채기
    const handlePop = () => {
      historyPushed.current = false;
      onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);
    window.addEventListener("popstate", handlePop);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
      window.removeEventListener("popstate", handlePop);
      // 정상 닫기(클릭/ESC)면 push한 히스토리 엔트리 제거
      if (historyPushed.current) {
        historyPushed.current = false;
        history.back();
      }
    };
  }, [src, onClose]);

  if (!src || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in cursor-zoom-out"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg cursor-zoom-out"
          onClick={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}

export const ImageLightbox = memo(ImageLightboxBase);
