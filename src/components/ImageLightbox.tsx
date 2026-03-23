"use client";
import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

function ImageLightboxBase({ src, alt = "", onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!src) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
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
