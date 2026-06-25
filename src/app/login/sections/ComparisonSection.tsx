"use client";

import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonData: {
  feature: string;
  pm: string;
  other: string | null;
  isHighlight: boolean;
}[] = [
  {
    feature: "참석 투표",
    pm: "링크 1개 → 다가오는 경기 한곳에서 응답 + 마감 자동 알림",
    other: "경기마다 새 투표 / 갠톡 추적",
    isHighlight: false,
  },
  {
    feature: "AI 라인업·전술 편성",
    pm: "팀 기록·상대팀 이력·참석자 분석해 포메이션 추천",
    other: null,
    isHighlight: true,
  },
  {
    feature: "AI 감독 코칭",
    pm: "편성 근거·고비 쿼터·공격 루트 자동 브리핑",
    other: null,
    isHighlight: true,
  },
  {
    feature: "공정 쿼터 로테이션",
    pm: "벤치 편중 자동 분배, 출전 시간 균형",
    other: null,
    isHighlight: false,
  },
  {
    feature: "회비 OCR + 휴회 면제",
    pm: "은행 앱 캡처 자동 매칭 + 휴회·부상 자동 면제",
    other: "엑셀 / 메모 수기",
    isHighlight: true,
  },
  {
    feature: "자동 경기 후기",
    pm: "경기 종료 즉시 한 문장 후기 자동 생성",
    other: null,
    isHighlight: false,
  },
  {
    feature: "선수 카드 & 시즌 어워드",
    pm: "FIFA 스타일 카드 + 7종 자동 시상",
    other: null,
    isHighlight: false,
  },
  {
    feature: "PC·모바일",
    pm: "PC 웹 + 갤럭시 앱(Google Play), 아이폰은 홈 화면 추가 — 어디서나",
    other: "모바일 앱 위주",
    isHighlight: false,
  },
  {
    feature: "가격·광고",
    pm: "₩0 — 광고·결제 없이 현재 무료",
    other: "앱별 다름 (유료 플랜 또는 광고)",
    isHighlight: false,
  },
];

export default function ComparisonSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.06,
      },
    },
  };

  return (
    <section
      ref={sectionRef}
      id="comparison"
      className="relative w-full overflow-hidden bg-background py-20 lg:py-28"
    >
      <BackgroundEffects prefersReducedMotion={prefersReducedMotion} />

      <div className="relative z-10 mx-auto max-w-[1080px] px-5 lg:px-14">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mb-12 lg:mb-16"
        >
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{
              background: "hsl(16 85% 58% / 0.13)",
              border: "1px solid hsl(16 85% 58% / 0.30)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "hsl(16 85% 58%)" }}
            />
            <span
              className="text-xs tracking-[0.20em]"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                color: "hsl(16 85% 58%)",
              }}
            >
              왜 PitchMaster?
            </span>
          </div>

          <h2
            className="relative mt-4 mb-3"
            style={{
              fontSize: "clamp(30px, 5.4vw, 52px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
              textWrap: "balance",
            }}
          >
            <HeadlineWithReveal
              prefersReducedMotion={prefersReducedMotion}
              isInView={isHeaderInView}
            />
          </h2>

          <p
            className="max-w-[680px]"
            style={{
              fontSize: "clamp(15.5px, 1.5vw, 17px)",
              lineHeight: 1.55,
              color: "hsl(40 5% 62%)",
              textWrap: "pretty",
            }}
          >
            다른 앱은 다양한 스포츠 다 노리느라 어정쩡합니다.
            <br className="hidden lg:block" />{" "}
            우린 조기축구·풋살 한 곳만 보고,{" "}
            <span
              style={{
                fontWeight: 600,
                color: "hsl(40 10% 92%)",
              }}
            >
              회장이 매주 직접 쓰면서 다듬었습니다.
            </span>
          </p>
        </motion.div>

        <div
          className="relative mb-3 hidden grid-cols-[1.1fr_1.5fr_1.2fr] gap-4 px-5 md:grid"
          style={{
            borderBottom: "1px solid hsl(240 4% 30%)",
            paddingBottom: "12px",
          }}
        >
          <span
            className="tracking-[0.22em]"
            style={{
              fontSize: "12.5px",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              color: "hsl(40 5% 62%)",
            }}
          >
            기능
          </span>
          <span
            className="tracking-[0.22em]"
            style={{
              fontSize: "12.5px",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              color: "hsl(16 85% 58%)",
            }}
          >
            PitchMaster
          </span>
          <span
            className="tracking-[0.22em]"
            style={{
              fontSize: "12.5px",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              color: "hsl(40 5% 62%)",
            }}
          >
            다른 앱 · 카톡
          </span>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-col gap-3"
        >
          {comparisonData.map((row, index) => (
            <ComparisonRow
              key={index}
              row={row}
              index={index}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>

        <motion.div
          className="mt-12 flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.6,
            delay: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.span
            className="h-2 w-2 rounded-full"
            style={{ background: "hsl(16 85% 58%)" }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 1, 0.7],
                  }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span
            className="text-sm tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "hsl(40 5% 62%)",
            }}
          >
            9가지 차이 · 단 하나의 선택
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function BackgroundEffects({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean | null;
}) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-[200px] -top-[200px] h-[600px] w-[600px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, hsl(16 85% 58% / 0.3) 0%, hsl(16 85% 58% / 0.1) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, 50, 0],
                y: [0, 30, 0],
              }
        }
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}

function HeadlineWithReveal({
  prefersReducedMotion,
  isInView,
}: {
  prefersReducedMotion: boolean | null;
  isInView: boolean;
}) {
  const words = ["왜", "PitchMaster", "인가요?"];

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={
            isInView
              ? { opacity: 1, filter: "blur(0px)" }
              : { opacity: 0, filter: "blur(8px)" }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            delay: prefersReducedMotion ? 0 : i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            color:
              word === "PitchMaster" ? undefined : "hsl(40 10% 92%)",
          }}
          className={word === "PitchMaster" ? "inline-block" : ""}
        >
          {word === "PitchMaster" ? (
            <IridescentText>{word}</IridescentText>
          ) : (
            word
          )}
        </motion.span>
      ))}
    </span>
  );
}

/* coral → amber → coral (no pink) — breathing iridescent via framer-motion */
function IridescentText({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      className="bg-clip-text text-transparent inline-block"
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(16 85% 58%), hsl(40 60% 55%), hsl(16 85% 58%))",
        backgroundSize: "300% 100%",
      }}
      animate={prefersReducedMotion ? {} : {
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}

function ComparisonRow({
  row,
  index,
  prefersReducedMotion,
}: {
  row: (typeof comparisonData)[0];
  index: number;
  prefersReducedMotion: boolean | null;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rowRef, { once: true, margin: "-50px" });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      ref={rowRef}
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-[16px] p-5 transition-all duration-300"
      style={{
        border: row.isHighlight
          ? "1px solid hsl(16 85% 58% / 0.32)"
          : isHovered
            ? "1px solid hsl(240 4% 50%)"
            : "1px solid hsl(240 4% 30%)",
        background: row.isHighlight
          ? undefined
          : "hsl(240 4% 16% / 0.4)",
        backdropFilter: "blur(20px)",
        boxShadow:
          isHovered && !row.isHighlight
            ? "0 8px 32px -16px hsl(16 85% 58% / 0.3)"
            : undefined,
        transform: isHovered ? "translateY(-2px)" : undefined,
      }}
    >
      {row.isHighlight && (
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(90deg, hsl(16 85% 58% / 0.08), hsl(40 60% 55% / 0.04) 60%, transparent)",
          }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  opacity: [0.8, 1, 0.8],
                }
          }
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {row.isHighlight && (
        <motion.div
          className="absolute left-0 top-0 w-[3px] rounded-l-[16px]"
          style={{
            background:
              "linear-gradient(180deg, hsl(16 85% 58%), hsl(40 60% 55%))",
          }}
          initial={{ height: 0 }}
          animate={isInView ? { height: "100%" } : { height: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.6,
            delay: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      )}

      {!prefersReducedMotion && isHovered && (
        <div
          className="pointer-events-none absolute -z-10 h-[300px] w-[300px] rounded-full transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle, hsl(16 85% 58% / 0.08) 0%, transparent 70%)",
            left: mousePosition.x - 150,
            top: mousePosition.y - 150,
          }}
        />
      )}

      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "hsl(40 10% 92%)",
              letterSpacing: "-0.01em",
            }}
          >
            {row.feature}
          </span>
          {row.isHighlight && (
            <OnlyHereBadge prefersReducedMotion={prefersReducedMotion} />
          )}
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle
            isHighlight={row.isHighlight}
            isInView={isInView}
            index={index}
            prefersReducedMotion={prefersReducedMotion}
          />
          <span
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "hsl(40 10% 92%)",
              textWrap: "pretty",
            }}
          >
            {row.pm}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <XCircle />
          <StrikethroughText
            text={row.other ?? "지원 안함"}
            isNull={row.other === null}
            isInView={isInView}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </div>

      <div className="hidden grid-cols-[1.1fr_1.5fr_1.2fr] items-center gap-4 px-0 py-0 md:grid">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "hsl(40 10% 92%)",
              letterSpacing: "-0.01em",
            }}
          >
            {row.feature}
          </span>
          {row.isHighlight && (
            <OnlyHereBadge prefersReducedMotion={prefersReducedMotion} />
          )}
        </div>

        <div className="flex items-center gap-3">
          <CheckCircle
            isHighlight={row.isHighlight}
            isInView={isInView}
            index={index}
            prefersReducedMotion={prefersReducedMotion}
          />
          <span
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "hsl(40 10% 92%)",
              textWrap: "pretty",
            }}
          >
            {row.pm}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <XCircle />
          <StrikethroughText
            text={row.other ?? "지원 안함"}
            isNull={row.other === null}
            isInView={isInView}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </div>
    </motion.div>
  );
}

function CheckCircle({
  isHighlight,
  isInView,
  index,
  prefersReducedMotion,
}: {
  isHighlight: boolean;
  isInView: boolean;
  index: number;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          "linear-gradient(135deg, hsl(16 85% 58%), hsl(16 70% 44%))",
      }}
      initial={{ scale: 0 }}
      animate={isInView ? { scale: [0, 1.2, 1] } : { scale: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        delay: prefersReducedMotion ? 0 : index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {isHighlight && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, hsl(16 85% 58%), hsl(16 70% 44%))",
          }}
          animate={{
            boxShadow: [
              "0 0 0px hsl(16 85% 58% / 0)",
              "0 0 16px hsl(16 85% 58% / 0.6)",
              "0 0 0px hsl(16 85% 58% / 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <Check className="relative z-10 h-3 w-3 text-white" strokeWidth={3} />
    </motion.div>
  );
}

function XCircle() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted)_/_0.6)]">
      <X className="h-3 w-3 text-muted-foreground/70" strokeWidth={2.5} />
    </div>
  );
}

function StrikethroughText({
  text,
  isNull,
  isInView,
  prefersReducedMotion,
}: {
  text: string;
  isNull: boolean;
  isInView: boolean;
  prefersReducedMotion: boolean | null;
}) {
  if (!isNull) {
    return (
      <span
        style={{
          fontSize: "14px",
          lineHeight: 1.55,
          color: "hsl(40 7% 72%)",
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className="relative inline-block"
      style={{
        fontSize: "14px",
        lineHeight: 1.55,
        color: "hsl(40 7% 72%)",
        fontStyle: "italic",
      }}
    >
      {text}
      <motion.span
        className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2"
        style={{ background: "hsl(40 5% 62% / 0.5)" }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.5,
          delay: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
      />
    </span>
  );
}

function OnlyHereBadge({
  prefersReducedMotion: _prefersReducedMotion,
}: {
  prefersReducedMotion: boolean | null;
}) {
  return (
    <motion.span
      className="relative inline-flex shrink-0 items-center rounded-md"
      style={{
        background: "hsl(240 6% 8%)",
        border: "1.5px solid hsl(16 85% 60%)",
        color: "hsl(16 90% 70%)",
        fontSize: "13px",
        letterSpacing: "0.10em",
        fontFamily: "'Pretendard Variable', system-ui, sans-serif",
        fontWeight: 800,
        padding: "3px 10px 2px",
        boxShadow: "0 4px 14px -4px hsl(16 85% 58% / 0.55)",
      }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      ONLY
    </motion.span>
  );
}
