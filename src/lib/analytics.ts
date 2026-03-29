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
  /** 카카오 로그인 클릭 */
  loginClick: (source: string) => trackEvent("login_click", { method: "kakao", source }),
  /** 온보딩 완료 */
  onboardingComplete: () => trackEvent("onboarding_complete"),
  /** 팀 생성 */
  teamCreate: (teamName: string) => trackEvent("team_create", { team_name: teamName }),
  /** 팀 가입 */
  teamJoin: (method: string) => trackEvent("team_join", { method }),

  // ── 핵심 기능 사용 ──
  /** 경기 생성 */
  matchCreate: (matchType: string) => trackEvent("match_create", { match_type: matchType }),
  /** 투표 완료 */
  voteComplete: (vote: string, source: string) => trackEvent("vote_complete", { vote_type: vote, source }),
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
};
