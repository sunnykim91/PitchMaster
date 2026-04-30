import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, Sparkles, Crown, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "가격 — PitchMaster",
  description:
    "PitchMaster는 현재 모든 기능 무료입니다. 향후 일부 고급 기능은 유료 전환 예정이며, 기존 사용자는 grandfather 혜택으로 보호됩니다.",
  alternates: { canonical: "https://pitch-master.app/pricing" },
};

type Tier = {
  id: "free" | "pro" | "premium";
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  highlighted?: boolean;
  cta: string;
  features: { label: string; included: boolean | "limited"; note?: string }[];
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "0원",
    priceSub: "현재·평생 (광고 없음)",
    tagline: "조기축구·풋살 팀 운영의 기본",
    cta: "무료 시작",
    features: [
      { label: "참석 투표 (다음 6경기 한 번에)", included: true },
      { label: "회비 OCR 자동 매칭", included: true },
      { label: "휴면·부상 자동 면제", included: true },
      { label: "AI 라인업 자동 편성", included: true },
      { label: "AI 감독 코칭", included: "limited", note: "월 5회" },
      { label: "공정 쿼터 로테이션", included: true },
      { label: "선수 카드 (시즌 1개)", included: true },
      { label: "자동 경기 후기", included: true },
      { label: "회칙·공지·게시판", included: true },
      { label: "월별 결산 리포트", included: "limited", note: "기본 (PDF X)" },
      { label: "멀티팀", included: "limited", note: "1팀" },
      { label: "데모 체험", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "9,900원",
    priceSub: "월 / 팀당 (운영진 1명)",
    tagline: "회장·총무를 위한 고급 자동화",
    highlighted: true,
    cta: "준비 중",
    features: [
      { label: "Free 모든 기능", included: true },
      { label: "AI 감독 코칭 무제한", included: true },
      { label: "월별 결산 PDF 내보내기", included: true },
      { label: "시즌 어워드 7종 카드 공유", included: true },
      { label: "선수 카드 무제한 시즌", included: true },
      { label: "자동 푸시 알림 고급", included: true, note: "MVP·역할 가이드" },
      { label: "데이터 엑셀 백업·이관", included: true },
      { label: "OCR 우선 처리", included: true },
      { label: "멀티팀", included: "limited", note: "최대 3팀" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "14,900원",
    priceSub: "월 / 팀당 (대형팀·운영진 다수)",
    tagline: "여러 팀·여러 운영진의 풀세트",
    cta: "준비 중",
    features: [
      { label: "Pro 모든 기능", included: true },
      { label: "멀티팀", included: true, note: "최대 5팀+" },
      { label: "운영진 다수 권한 분리 고급", included: true },
      { label: "고급 통계·랭킹 리포트", included: true },
      { label: "API 액세스", included: true, note: "데이터 외부 연동" },
      { label: "우선 고객 지원", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background py-16 lg:py-24 px-5 lg:px-14">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display tracking-[0.18em] mb-5"
            style={{
              background: "hsl(var(--primary) / 0.13)",
              border: "1px solid hsl(var(--primary) / 0.30)",
              color: "hsl(var(--primary))",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(var(--primary))" }}
            />
            가격
          </span>
          <h1
            className="font-extrabold leading-[1.12] tracking-[-0.02em] text-balance mb-4"
            style={{ fontSize: "clamp(30px, 5.4vw, 52px)" }}
          >
            지금은 <span style={{ color: "hsl(var(--primary))" }}>모든 기능 무료</span>
          </h1>
          <p
            className="text-[15.5px] lg:text-[17px] leading-[1.6] max-w-[640px] mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            조기축구 5년차 회장이 직접 만들어 매주 쓰는 앱입니다.
            <br />
            추후 일부 고급 기능이 유료로 전환될 수 있으나, 기존 사용자에겐 충분한 사전 공지와 grandfather 혜택을 보장합니다.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid gap-5 lg:grid-cols-3 mb-16">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* Grandfather notice */}
        <div
          className="rounded-2xl p-6 lg:p-8 mb-16"
          style={{
            background: "linear-gradient(135deg, hsl(var(--success) / 0.08), hsl(var(--info) / 0.04))",
            border: "1px solid hsl(var(--success) / 0.30)",
          }}
        >
          <div className="flex items-start gap-3">
            <Heart className="w-6 h-6 shrink-0 mt-0.5" style={{ color: "hsl(var(--success))" }} />
            <div>
              <h3 className="font-bold text-lg mb-1.5">기존 사용자 보호 약속</h3>
              <p className="text-[14.5px] leading-[1.6]" style={{ color: "hsl(var(--muted-foreground))" }}>
                PitchMaster를 일찍부터 써주신 분들에게 항상 감사드립니다.
                <br />
                유료 정책 시행 시점에 이미 가입돼 있던 사용자(팀)는 일정 기간 무료 사용을 보장하며, 이후에도 평생 할인 혜택이 적용됩니다.
                <br />
                정확한 정책은 시행 최소 60일 전 카카오톡·이메일·앱 내 공지로 사전 안내드립니다.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ shortcut */}
        <div className="text-center">
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            가격에 대해 궁금하신 점이 더 있으시면{" "}
            <Link
              href="/login#faq"
              className="font-bold underline-offset-4 hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              자주 묻는 질문
            </Link>
            을 확인하시거나{" "}
            <a
              href="mailto:tjsgnl2002@gmail.com"
              className="font-bold underline-offset-4 hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              메일
            </a>
            로 문의해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const isHighlighted = tier.highlighted;
  return (
    <div
      className="relative rounded-2xl p-6 lg:p-7 flex flex-col"
      style={{
        background: isHighlighted
          ? "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--card)))"
          : "hsl(var(--card))",
        border: isHighlighted
          ? "1px solid hsl(var(--primary) / 0.50)"
          : "1px solid hsl(var(--border) / 0.5)",
        boxShadow: isHighlighted
          ? "0 24px 60px -24px hsl(var(--primary) / 0.40)"
          : undefined,
      }}
    >
      {isHighlighted && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display tracking-[0.16em] whitespace-nowrap"
          style={{
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(40 95% 60%))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <Sparkles className="w-3 h-3" />
          가장 많이 선택
        </span>
      )}

      {/* Tier name + icon */}
      <div className="flex items-center gap-2 mb-1">
        {tier.id === "premium" && <Crown className="w-4 h-4" style={{ color: "hsl(40 95% 60%)" }} />}
        <h2 className="font-display text-lg tracking-[0.06em]">{tier.name}</h2>
      </div>
      <p className="text-[13px] mb-5" style={{ color: "hsl(var(--muted-foreground))" }}>
        {tier.tagline}
      </p>

      {/* Price */}
      <div className="mb-5 pb-5 border-b border-border/40">
        <div className="font-display text-3xl lg:text-4xl tracking-[0.01em]">
          {tier.price}
        </div>
        <div className="text-[12px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {tier.priceSub}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-6">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[14px] leading-[1.5]">
            {f.included === true ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--success))" }} strokeWidth={3} />
            ) : f.included === "limited" ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }} />
            ) : (
              <Minus className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }} />
            )}
            <span
              style={{
                color: f.included === false ? "hsl(var(--muted-foreground) / 0.6)" : "hsl(var(--foreground))",
              }}
            >
              {f.label}
              {f.note && (
                <span
                  className="ml-1.5 text-[12px]"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  ({f.note})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {tier.id === "free" ? (
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full h-11 rounded-xl font-bold text-sm transition-all hover:brightness-105 active:scale-[0.98]"
          style={{
            background: "hsl(var(--kakao))",
            color: "hsl(var(--kakao-foreground))",
            boxShadow: "0 6px 18px -8px hsl(var(--kakao) / 0.55)",
          }}
        >
          {tier.cta}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center w-full h-11 rounded-xl font-bold text-sm cursor-not-allowed"
          style={{
            background: "hsl(var(--secondary))",
            color: "hsl(var(--muted-foreground))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          {tier.cta}
        </button>
      )}
    </div>
  );
}
