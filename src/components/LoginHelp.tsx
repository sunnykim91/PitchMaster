"use client";

/**
 * LoginHelp — 랜딩(로그인) 페이지 하단의 "로그인이 잘 안 되나요?" 접이식 도움말.
 *
 * 카카오 로그인 차단(비공개 릴레이·VPN)·인앱 브라우저·로그인 비유지·푸시 미수신·
 * 팀 미노출 등 실제 제보된 진입 장벽을 상황별로 친절하게 안내.
 *
 * - 카카오 에러 화면(accounts.kakao.com)에는 우리가 개입 불가 → 로그인 전/후 우리 화면에서 안내
 * - 모든 항목 기본 접힘. 탭하면 인라인 확장
 * - id="login-help" 로 앵커 연결 가능 (인앱 배너 등에서 유도)
 */

import { useState, type ReactNode } from "react";
import {
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Bell,
  Users,
  Plus,
  type LucideIcon,
} from "lucide-react";

type HelpItem = {
  icon: LucideIcon;
  q: string;
  intro?: string;
  steps: ReactNode[];
};

const ITEMS: HelpItem[] = [
  {
    icon: ShieldAlert,
    q: "카카오 화면에서 “접속 정보를 확인해 주세요”가 떠요",
    intro:
      "회사 보안 VPN이나 아이폰 ‘비공개 릴레이’가 켜져 있으면, 로그인 도중 접속 위치가 바뀌어서 카카오가 막아요.",
    steps: [
      "회사 와이파이·보안 VPN을 쓰는 중이면 잠깐 끄고 시도하세요 (휴대폰 데이터로 바꿔도 돼요)",
      <>
        아이폰: <b>설정 → 맨 위 본인 이름 → iCloud → ‘비공개 릴레이’ 끄기</b>
      </>,
      "따로 켜둔 VPN 앱이 있으면 끄기",
      "그래도 막히면 카카오톡을 완전히 종료했다 다시 열고 시도",
    ],
  },
  {
    icon: ExternalLink,
    q: "카톡·인스타·밴드 안에서 열었더니 안 돼요",
    intro:
      "단톡방·인스타·밴드 안에서 링크를 누르면 ‘앱 속 미니 브라우저’로 열려요. 여기선 로그인이 막히거나 알림이 안 와요.",
    steps: [
      <>
        화면 <b>우측 위 ⋯(점 세 개)</b> 또는 아래쪽 아이콘 → <b>“사파리로 열기”</b>(아이폰) /{" "}
        <b>“다른 브라우저로 열기”</b>(안드로이드)
      </>,
      <>
        또는 사파리·크롬을 직접 열어 <b>pitch-master.app</b> 으로 접속해 로그인
      </>,
    ],
  },
  {
    icon: RefreshCw,
    q: "로그인이 자꾸 풀려요 (매번 다시 로그인해야 해요)",
    intro: "한 번 로그인하면 30일 동안 유지돼요. 그런데도 자꾸 풀린다면 보통 아래 중 하나예요.",
    steps: [
      "카톡·인스타 같은 인앱 브라우저로 들어오면 매번 새 창이라 로그인이 저장되지 않아요 → 사파리·크롬으로 여세요",
      "회사 보안 VPN·프록시가 로그인 정보를 끊을 수 있어요 → VPN을 끄고 시도",
      <>
        가장 확실한 방법: 사파리·크롬에서 연 뒤 <b>“홈 화면에 추가”</b>로 앱처럼 설치하면 로그인이
        안정적으로 유지돼요
      </>,
    ],
  },
  {
    icon: Bell,
    q: "알림(푸시)이 안 와요",
    intro:
      "알림은 휴대폰에 ‘앱처럼’ 설치돼 있어야 와요. 안드로이드(갤럭시)는 Google Play 앱으로, 아이폰은 ‘홈 화면에 추가’로 설치하면 됩니다. 카톡·인스타 같은 인앱 브라우저나 그냥 띄운 웹 화면에선 안 옵니다.",
    steps: [
      <>
        안드로이드(갤럭시): <b>Google Play에서 “피치마스터” 앱을 설치</b>하면 알림이 가장
        안정적으로 와요 →{" "}
        <a
          href="https://play.google.com/store/apps/details?id=app.pitchmaster"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          앱 설치하기
        </a>
      </>,
      <>
        아이폰: 사파리에서 연 뒤 <b>공유 버튼 → “홈 화면에 추가”</b> → 홈 화면 아이콘으로 실행해야
        알림을 받아요
      </>,
      "카톡·인스타 같은 인앱 브라우저에선 알림이 지원되지 않아요 → 사파리·크롬으로 여세요",
      "휴대폰 설정 → 알림에서 PitchMaster(또는 브라우저) 알림이 켜져 있는지 확인",
    ],
  },
  {
    icon: Users,
    q: "로그인은 됐는데 우리 팀이 안 보여요",
    intro:
      "로그인은 ‘내 카카오 계정’에 되는 거고, 팀은 따로 들어가야 보여요. 보통 아래 둘 중 하나예요.",
    steps: [
      "회장이 보내준 초대 링크로 다시 들어가면 자동으로 팀에 들어가요",
      <>
        아직 팀이 없다면 <b>“팀 만들기”</b>로 직접 새 팀을 만들 수 있어요
      </>,
      "평소와 다른 카카오 계정으로 로그인했을 수도 있어요 → 로그아웃 후 평소 쓰는 계정으로 다시 로그인",
    ],
  },
];

export function LoginHelp() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section
      id="login-help"
      className="relative px-5 lg:px-14 py-16 lg:py-20"
      style={{ background: "hsl(var(--background))", wordBreak: "keep-all" }}
    >
      <div className="mx-auto max-w-[680px]">
        <div className="text-center">
          <h2
            className="font-extrabold leading-[1.15]"
            style={{ fontSize: "clamp(24px, 4.4vw, 36px)", letterSpacing: "-0.02em" }}
          >
            로그인이 잘 안 되나요?
          </h2>
          <p
            className="mt-3 text-[14.5px] lg:text-[15.5px] leading-[1.55]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            상황을 골라보세요. 대부분 1분 안에 해결돼요.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          {ITEMS.map((item, i) => {
            const open = openIdx === i;
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-[14px] transition-colors"
                style={{
                  background: open ? "hsl(var(--card) / 0.85)" : "hsl(var(--secondary) / 0.45)",
                  border: open
                    ? "1px solid hsl(var(--primary) / 0.35)"
                    : "1px solid hsl(var(--border))",
                }}
              >
                {open && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{
                      background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 lg:px-5 py-4 text-left"
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: open ? "hsl(var(--primary) / 0.14)" : "hsl(var(--muted) / 0.5)",
                      color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span
                    className="flex-1 text-[15px] lg:text-[15.5px] font-bold leading-[1.4]"
                    style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
                  >
                    {item.q}
                  </span>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200"
                    style={{
                      background: open ? "hsl(var(--primary) / 0.16)" : "hsl(var(--muted) / 0.5)",
                      color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      transform: open ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>

                {open && (
                  <div className="px-4 lg:px-5 pb-5 pt-0">
                    {item.intro && (
                      <p
                        className="mb-3 text-[14px] leading-[1.6]"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {item.intro}
                      </p>
                    )}
                    <ul className="flex flex-col gap-2">
                      {item.steps.map((s, j) => (
                        <li key={j} className="flex gap-2.5 text-[14px] leading-[1.6]">
                          <span
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: "hsl(var(--primary))" }}
                          />
                          <span style={{ color: "hsl(var(--foreground) / 0.92)" }}>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p
          className="mt-7 text-center text-[13px] leading-[1.6]"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          그래도 안 되면 더보기 → <b className="text-foreground">피드백 보내기</b>로 알려주세요. 바로
          도와드릴게요.
        </p>
      </div>
    </section>
  );
}
