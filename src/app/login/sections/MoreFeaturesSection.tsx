"use client";

/**
 * MoreFeaturesSection — "이것만이 아닙니다"
 *
 * 핵심 3개(투표·회비·전술) 외 보조 기능 10개를 4-column 그리드로 가볍게 어필.
 * 다크 베이스 + 코랄 시그너처, framer-motion stagger reveal.
 */

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  Megaphone,
  BarChart3,
  FileText,
  AlertCircle,
  Users,
  Eye,
  Activity,
  Swords,
  PieChart,
  Goal,
  ClipboardList,
} from "lucide-react";

type Tone = "primary" | "info" | "accent" | "warning";

const FEATURES: Array<{
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  desc: string;
  tone: Tone;
}> = [
  { Icon: Megaphone,     label: "게시판 / 공지",      desc: "고정 공지 + 댓글, 단톡방에 묻히지 않음",     tone: "primary" },
  { Icon: BarChart3,     label: "경기 기록",          desc: "골/어시/MVP 자동 집계, 시즌 누적 통계",       tone: "info" },
  { Icon: ClipboardList, label: "감독의 전술노트",    desc: "운영진만 보는 능력치 기록, 라인업 참고용",    tone: "accent" },
  { Icon: FileText,      label: "회칙 페이지",        desc: "팀 규정·운영 원칙 한 페이지에 명문화",        tone: "warning" },
  { Icon: AlertCircle,   label: "자동 벌금 부과",     desc: "지각·불참 자동 차감, 매번 묻기 X",            tone: "primary" },
  { Icon: Users,         label: "멀티팀",             desc: "한 카카오 계정으로 여러 팀 관리",             tone: "info" },
  { Icon: Eye,           label: "데모 체험",          desc: "가입 없이 30초 만에 둘러보기",                tone: "accent" },
  { Icon: Activity,      label: "출석 히트맵",        desc: "선수별 출석 패턴 한눈에",                     tone: "warning" },
  { Icon: Swords,        label: "상대팀 전적 카드",   desc: "맞대결 이력·최근 5경기 자동 표시",            tone: "primary" },
  { Icon: PieChart,      label: "월별 결산 리포트",   desc: "회비 수입·지출 자동 집계, PDF 내보내기",      tone: "info" },
  { Icon: Goal,          label: "풋살 3~8인제",        desc: "포지션·전술판 별도 지원",                     tone: "accent" },
];

const TONE_FG: Record<Tone, string> = {
  primary: "hsl(var(--primary))",
  info:    "hsl(var(--info))",
  accent:  "hsl(var(--accent))",
  warning: "hsl(40 95% 60%)",
};
const TONE_BG: Record<Tone, string> = {
  primary: "hsl(var(--primary) / 0.13)",
  info:    "hsl(var(--info) / 0.13)",
  accent:  "hsl(var(--accent) / 0.14)",
  warning: "hsl(40 95% 60% / 0.14)",
};
const TONE_BORDER: Record<Tone, string> = {
  primary: "hsl(var(--primary) / 0.30)",
  info:    "hsl(var(--info) / 0.30)",
  accent:  "hsl(var(--accent) / 0.32)",
  warning: "hsl(40 95% 60% / 0.32)",
};

export default function MoreFeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = useReducedMotion();

  return (
    <section
      ref={ref}
      id="more-features"
      className="relative overflow-hidden py-16 lg:py-24 px-5 lg:px-14"
      style={{
        background:
          "radial-gradient(ellipse 70% 40% at 50% 0%, hsl(var(--info) / 0.08), transparent 60%), hsl(var(--background))",
        wordBreak: "keep-all",
      }}
    >
      <div className="relative max-w-[1280px] mx-auto">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.20em] whitespace-nowrap"
          style={{
            background: "hsl(var(--info) / 0.13)",
            border: "1px solid hsl(var(--info) / 0.32)",
            color: "hsl(var(--info))",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          더 많은 기능
        </span>

        <h2
          className="font-extrabold leading-[1.12] mt-4 mb-3"
          style={{
            fontSize: "clamp(30px, 5.4vw, 52px)",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          이것만이 <span style={{ color: "hsl(var(--info))" }}>아닙니다</span>
        </h2>
        <p
          className="text-[15.5px] lg:text-[17px] leading-[1.55] max-w-[680px]"
          style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
        >
          운영하다 부딪히는 작은 일들도 알아서 처리됩니다.
        </p>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.Icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }
                }
                whileHover={reduced ? undefined : { y: -2 }}
                className="group relative p-5 lg:p-[22px] rounded-[18px] cursor-default"
                style={{
                  background: "hsl(var(--secondary) / 0.5)",
                  border: "1px solid hsl(var(--border))",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition: "border-color 220ms, background 220ms",
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3.5 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: TONE_BG[f.tone],
                    border: `1px solid ${TONE_BORDER[f.tone]}`,
                    color: TONE_FG[f.tone],
                  }}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                </span>
                <div
                  className="text-[15px] font-bold mb-1.5"
                  style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
                >
                  {f.label}
                </div>
                <p
                  className="text-[13px] leading-[1.5] m-0"
                  style={{ color: "hsl(var(--muted-foreground))", textWrap: "pretty" }}
                >
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
