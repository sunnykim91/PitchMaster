/** GA4 커스텀 이벤트 전송 */
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && "gtag" in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", eventName, params);
  }
}

// 주요 전환 이벤트 — GA4 퍼널
export const GA = {
  // ── 가입 퍼널 ──
  /** 랜딩 페이지 조회 */
  landingView: () => trackEvent("landing_view"),
  /** 데모 모드 시작 */
  demoStart: () => trackEvent("demo_start"),
  /** 카카오 로그인 클릭. cta_source 키 — GA4 예약어 `source` 충돌 회피 (트래픽 채널 오분류 방지). */
  loginClick: (source: string) => trackEvent("login_click", { method: "kakao", cta_source: source }),
  /** 온보딩 완료 */
  onboardingComplete: () => trackEvent("onboarding_complete"),
  /** 팀 생성 */
  teamCreate: (teamName: string) => trackEvent("team_create", { team_name: teamName }),
  /** 팀 가입 */
  teamJoin: (method: string) => trackEvent("team_join", { method }),

  // ── 핵심 기능 사용 ──
  /** 경기 생성 */
  matchCreate: (matchType: string) => trackEvent("match_create", { match_type: matchType }),
  /** 투표 완료. vote_source 키 — GA4 예약어 `source` 충돌 회피 (트래픽 채널 오분류 방지). source=shared_link 면 공유 링크 경유 유입. */
  voteComplete: (vote: string, source: string) => trackEvent("vote_complete", { vote_type: vote, vote_source: source }),
  /** 투표 링크 공유 클릭 (카톡 등). vote_share 퍼널(공유→유입→투표) 측정용 — 공유가 실제로 일어나는지 확인. */
  voteShared: (method: string) => trackEvent("vote_shared", { method }),
  /** 팀원 초대 */
  inviteSent: (method: string) => trackEvent("invite_sent", { method }),
  /** 회원 사전등록 */
  memberPreRegister: () => trackEvent("member_pre_register"),
  /** 회비 기록 추가 */
  duesRecordAdd: (method: string) => trackEvent("dues_record_add", { method }),

  // ── 리텐션 ──
  /** 푸시 알림 구독 */
  pushSubscribe: (enabled: boolean) => trackEvent("push_toggle", { enabled }),
  /** PWA 설치 */
  pwaInstall: () => trackEvent("pwa_install"),

  // ── 온보딩·안내 효과 측정 ──
  /** HintCard 표시(첫 진입). storage_key로 5곳 구분: 출석·전술·OCR·후기 MVP·가입 신청 */
  hintShown: (storageKey: string) => trackEvent("hint_shown", { hint_key: storageKey }),
  /** HintCard 닫기. 닫기 빈도 = 안내 효과 측정 신호 (즉시 닫기율↑ = 안내 무용) */
  hintDismissed: (storageKey: string) => trackEvent("hint_dismissed", { hint_key: storageKey }),
  /** 다음 경기 유도 카드 클릭 (1→2 활성화 넛지). source: "dashboard"(기본)·"match_detail"(경기 완료 직후). */
  nextMatchNudge: (source?: string) => trackEvent("next_match_nudge_click", source ? { source } : undefined),
};
