import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles, Heart, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "가격 — PitchMaster",
  description:
    "PitchMaster는 조기축구·풋살 팀 운영 자동화 풀세트입니다. 현재 모든 기능 무료, 추후 정기 구독 전환 예정. 기존 가입자는 일정 기간 무료 + 평생 할인 혜택으로 보호됩니다.",
  alternates: { canonical: "https://pitch-master.app/pricing" },
};

const FEATURES = [
  "참석 투표 — 링크 1개로 다음 6경기 한 번에 응답",
  "회비 OCR — 은행 앱 캡처 자동 매칭 + 휴면·부상 자동 면제",
  "AI 라인업·전술 코치 — 팀 기록·상대 이력 분석해 자동 추천",
  "공정 쿼터 로테이션 — 벤치 편중 자동 분배",
  "선수 카드 & 시즌 어워드 — FIFA 스타일 + 7종 자동 시상",
  "자동 경기 후기 — 종료 즉시 한 문장 후기 자동 생성",
  "회칙·공지·게시판 + 자동 벌금",
  "월별 결산 리포트 + PDF 내보내기",
  "멀티팀 (한 계정으로 여러 팀)",
  "PC·모바일 어디서나, 광고 없음",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background py-16 lg:py-24 px-5 lg:px-14">
      <div className="max-w-[1080px] mx-auto">
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
            지금은 <span style={{ color: "hsl(var(--primary))" }}>전체 무료</span>
          </h1>
          <p
            className="text-[15.5px] lg:text-[17px] leading-[1.6] max-w-[640px] mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            조기축구 5년차 회장이 직접 만들어 매주 쓰는 앱입니다.
            <br />
            지금 가입한 팀은 향후 유료 전환 시점에도{" "}
            <b className="text-foreground font-bold">일정 기간 무료 + 평생 할인</b>
            으로 보호됩니다.
          </p>
        </div>

        {/* Differentiation strip */}
        <div className="max-w-[560px] mx-auto mb-5">
          <div
            className="rounded-2xl px-4 py-3 text-center"
            style={{
              background: "hsl(var(--primary) / 0.06)",
              border: "1px solid hsl(var(--primary) / 0.22)",
            }}
          >
            <p
              className="text-[12.5px] leading-[1.55] tracking-[0.01em]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <b className="text-foreground">다른 무료 앱과 결정적으로 다른 3가지</b>
              <br />
              AI 라인업·전술 코치 · OCR 회비 자동매칭 · FIFA 스타일 선수카드
            </p>
          </div>
        </div>

        {/* Single Plan Card */}
        <div className="max-w-[560px] mx-auto mb-8">
          <div
            className="relative rounded-3xl p-7 pt-10 lg:p-9 lg:pt-11"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--card)))",
              border: "1px solid hsl(var(--primary) / 0.40)",
              boxShadow: "0 24px 60px -24px hsl(var(--primary) / 0.40)",
            }}
          >
            {/* Status badge */}
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display tracking-[0.16em] whitespace-nowrap"
              style={{
                background:
                  "linear-gradient(90deg, hsl(var(--success)), hsl(152 50% 40%))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              <Sparkles className="w-3 h-3" />
              현재 무료
            </span>

            {/* Plan name */}
            <h2 className="font-display text-xl tracking-[0.06em] text-center mb-2">
              팀 운영 풀세트
            </h2>
            <p
              className="text-[13px] text-center mb-6"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              조기축구·풋살 팀 운영에 필요한 모든 기능
            </p>

            {/* Price */}
            <div className="text-center mb-8 pb-8 border-b border-border/40">
              <div className="flex items-baseline justify-center gap-2">
                <span
                  className="font-display text-5xl lg:text-6xl tracking-[0.01em]"
                  style={{ color: "hsl(var(--success))" }}
                >
                  0원
                </span>
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  지금 / 평생 무료
                </span>
              </div>
              <p
                className="mt-3 text-[12px] leading-[1.5] tracking-[0.02em]"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <Calendar className="inline w-3 h-3 mr-1 mb-0.5" />
                향후 정기 구독 전환 예정 ·{" "}
                <b className="text-foreground">월 9,900원</b> 수준
                <br />
                <span className="opacity-80">광고·트래킹 없음 · AI 호출 비용 회수용</span>
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-8">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5]">
                  <Check
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: "hsl(var(--success))" }}
                    strokeWidth={3}
                  />
                  <span style={{ color: "hsl(var(--foreground))" }}>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-12 rounded-xl font-bold text-[15px] transition-all hover:brightness-105 active:scale-[0.98]"
              style={{
                background: "hsl(var(--kakao))",
                color: "hsl(var(--kakao-foreground))",
                boxShadow: "0 6px 18px -8px hsl(var(--kakao) / 0.55)",
              }}
            >
              지금 무료로 시작
            </Link>
          </div>
        </div>

        {/* Why paid (honest reasoning) */}
        <div className="max-w-[560px] mx-auto mb-12">
          <div
            className="rounded-2xl p-5 lg:p-6"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <h3 className="font-bold text-[15px] mb-3">왜 무료가 아닌지 — 솔직하게</h3>
            <ul
              className="space-y-2 text-[13.5px] leading-[1.6]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <li className="flex items-start gap-2">
                <span style={{ color: "hsl(var(--success))" }}>•</span>
                <span>
                  <b className="text-foreground">광고 0 · 트래킹 0</b> — 팀 데이터로 광고 안 만듭니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "hsl(var(--success))" }}>•</span>
                <span>
                  AI 라인업·전술·후기·OCR은 <b className="text-foreground">호출당 비용</b>이 발생합니다. 구독료로 회수합니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "hsl(var(--success))" }}>•</span>
                <span>
                  조기축구 5년차 회장이 직접 매주 쓰는 앱이라{" "}
                  <b className="text-foreground">계속 개선·운영</b>됩니다.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Existing user protection */}
        <div
          className="rounded-2xl p-6 lg:p-8 mb-16 max-w-[720px] mx-auto"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--success) / 0.08), hsl(var(--info) / 0.04))",
            border: "1px solid hsl(var(--success) / 0.30)",
          }}
        >
          <div className="flex items-start gap-3">
            <Heart
              className="w-6 h-6 shrink-0 mt-0.5"
              style={{ color: "hsl(var(--success))" }}
            />
            <div>
              <h3 className="font-bold text-lg mb-1.5">기존 가입자 보호 약속</h3>
              <p
                className="text-[14.5px] leading-[1.65]"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                PitchMaster를 일찍부터 써주신 팀들에게 항상 감사드립니다.
                <br />
                정기 구독으로 전환되더라도{" "}
                <b className="text-foreground">현재 가입돼 있던 모든 팀은 일정 기간 무료 사용 + 이후에도 평생 할인 혜택</b>
                이 적용됩니다.
                <br />
                정확한 정책과 가격은 시행 최소 60일 전 카카오톡·이메일·앱 내 공지로 사전 안내드립니다.
                <br />
                <span className="text-[13px] opacity-80">
                  (예: 2027년까지 무료 보장 → 이후 평생 50% 할인 — 정책 시행 시점에 확정)
                </span>
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
            을 확인하시거나 아래 메일로 문의해 주세요.
          </p>
          <p className="mt-2 text-sm">
            <a
              href="mailto:tjsgnl2002@gmail.com?subject=PitchMaster%20%EA%B0%80%EA%B2%A9%20%EB%AC%B8%EC%9D%98"
              className="font-bold underline-offset-4 hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              tjsgnl2002@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
