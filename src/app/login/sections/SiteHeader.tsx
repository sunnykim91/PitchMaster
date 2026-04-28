"use client";

/**
 * SiteHeader v2 — sticky with scroll-driven backdrop-blur + progress bar.
 * Mobile: 56px · brand + "무료 시작" pill
 * Desktop: 64px · brand + nav + "카카오로 무료 시작"
 */

import { motion, MotionConfig, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useState } from "react";
import { KakaoLoginLink } from "@/components/KakaoLoginLink";

export type SiteHeaderProps = {
  kakaoEnabled: boolean;
  kakaoHref: string;
  logoText?: string;
  ctaCopy?: { mobile: string; desktop: string };
  navItems?: { label: string; href: string }[];
};

export default function SiteHeader({
  kakaoEnabled,
  kakaoHref,
  logoText = "PITCHMASTER",
  ctaCopy = { mobile: "무료 시작", desktop: "카카오로 무료 시작" },
  navItems = [
    { label: "기능", href: "#features" },
    { label: "사용법", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ],
}: SiteHeaderProps) {
  const { scrollY, scrollYProgress } = useScroll();

  const blur = useTransform(scrollY, [0, 600], [6, 20]);
  const alpha = useTransform(scrollY, [0, 600], [0.5, 0.92]);
  const borderAlpha = useTransform(scrollY, [0, 800], [0.2, 0.6]);

  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));

  const bg = useTransform(alpha, (a) => `hsl(var(--background) / ${a})`);
  const filter = useTransform(blur, (b) => `saturate(140%) blur(${b}px)`);
  const borderColor = useTransform(borderAlpha, (a) => `hsl(var(--border) / ${a})`);
  const widthPct = useTransform(scrollYProgress, (p) => `${p * 100}%`);

  const ctaClass =
    "inline-flex items-center gap-1.5 h-9 lg:h-10 px-3.5 lg:px-[18px] rounded-full font-bold text-[13px] lg:text-[14px] tracking-[-0.01em] cursor-pointer transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-105 active:scale-[0.97] no-underline";
  const ctaStyle: React.CSSProperties = {
    background: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
    boxShadow: "0 6px 18px -6px hsl(var(--primary) / 0.6)",
    border: 0,
  };

  const ctaInner = (
    <>
      <KakaoIcon />
      <span className="hidden lg:inline">{ctaCopy.desktop}</span>
      <span className="lg:hidden">{ctaCopy.mobile}</span>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="fixed top-0 left-0 z-[100] h-[2px] origin-left"
        style={{
          width: widthPct,
          background: "linear-gradient(90deg, hsl(var(--primary)), hsl(40 90% 60%))",
          boxShadow: "0 0 8px hsl(var(--primary) / 0.8)",
        }}
      />

      <motion.header
        className="fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 px-4 lg:px-8 flex items-center justify-between transition-shadow duration-200"
        style={{
          background: bg,
          backdropFilter: filter,
          WebkitBackdropFilter: filter,
          borderBottom: "1px solid",
          borderBottomColor: borderColor,
          boxShadow: scrolled ? "0 8px 24px -12px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <a href="#hero" className="flex items-center gap-2.5 no-underline">
          <span
            className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center text-white font-display text-sm lg:text-base tracking-[0.04em]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 70% 44%) 100%)",
              boxShadow:
                "inset 0 0 0 1px hsl(0 0% 100% / 0.18), 0 4px 10px -4px hsl(var(--primary) / 0.55)",
            }}
          >
            PM
          </span>
          <span className="font-heading text-base lg:text-lg tracking-[0.16em] text-foreground">
            {logoText}
          </span>
        </a>

        <nav className="hidden lg:flex ml-auto mr-5 gap-7">
          {navItems.map((it) => (
            <a
              key={it.href}
              href={it.href}
              className="text-[14px] font-medium tracking-[-0.01em] text-muted-foreground hover:text-foreground transition-colors"
            >
              {it.label}
            </a>
          ))}
        </nav>

        {kakaoEnabled ? (
          <KakaoLoginLink href={kakaoHref} source="header" className={ctaClass} style={ctaStyle}>
            {ctaInner}
          </KakaoLoginLink>
        ) : (
          <button type="button" disabled className={`${ctaClass} opacity-60`} style={ctaStyle}>
            {ctaInner}
          </button>
        )}
      </motion.header>
    </MotionConfig>
  );
}

function KakaoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
    </svg>
  );
}
