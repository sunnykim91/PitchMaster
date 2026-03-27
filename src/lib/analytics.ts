/** GA4 커스텀 이벤트 전송 */
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && "gtag" in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", eventName, params);
  }
}

// 주요 전환 이벤트
export const GA = {
  /** 데모 모드 시작 */
  demoStart: () => trackEvent("demo_start"),
  /** 카카오 로그인 클릭 */
  loginClick: () => trackEvent("login_click", { method: "kakao" }),
  /** 온보딩 완료 */
  onboardingComplete: () => trackEvent("onboarding_complete"),
  /** 팀 생성 */
  teamCreate: (teamName: string) => trackEvent("team_create", { team_name: teamName }),
  /** 팀 가입 */
  teamJoin: () => trackEvent("team_join"),
  /** 경기 생성 */
  matchCreate: (matchType: string) => trackEvent("match_create", { match_type: matchType }),
  /** 투표 완료 */
  voteComplete: (vote: string) => trackEvent("vote_complete", { vote_type: vote }),
  /** 푸시 알림 구독 */
  pushSubscribe: () => trackEvent("push_subscribe"),
};
