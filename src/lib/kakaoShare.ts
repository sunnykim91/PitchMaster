/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    Kakao?: any;
  }
}

const APP_URL = "https://pitch-master.app";

let sdkLoading: Promise<boolean> | null = null;

/** 카카오 SDK를 필요할 때만 로드 (lazy) */
function loadKakaoSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Kakao) return Promise.resolve(true);
  if (sdkLoading) return sdkLoading;

  sdkLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return sdkLoading;
}

function ensureInit(): boolean {
  if (typeof window === "undefined" || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return false;
    window.Kakao.init(key);
  }
  return true;
}

/** SDK 로드 + 초기화 (비동기) */
async function ensureKakao(): Promise<boolean> {
  await loadKakaoSdk();
  return ensureInit();
}

/** 경기 결과 공유 */
export async function shareMatchResult({
  matchId,
  date,
  score,
  opponent,
  mvp,
}: {
  matchId: string;
  date: string;
  score: string;
  opponent?: string;
  mvp?: string;
}) {
  if (!(await ensureKakao())) {
    // Fallback: Web Share API or clipboard
    fallbackShare(`${APP_URL}/matches/${matchId}`, `경기 결과: ${score} vs ${opponent ?? "상대팀"}`);
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `⚽ ${score} vs ${opponent ?? "상대팀"}`,
      description: `${date} 경기 결과${mvp ? ` | MVP: ${mvp}` : ""}`,
      imageUrl: `${APP_URL}/icons/icon-512.png`,
      link: {
        mobileWebUrl: `${APP_URL}/matches/${matchId}`,
        webUrl: `${APP_URL}/matches/${matchId}`,
      },
    },
    buttons: [
      {
        title: "상세 기록 보기",
        link: {
          mobileWebUrl: `${APP_URL}/matches/${matchId}`,
          webUrl: `${APP_URL}/matches/${matchId}`,
        },
      },
    ],
  });
}

/** 참석 투표 공유 */
export async function shareVoteLink({
  matchId,
  date,
  time,
  location,
  opponent,
  matchType,
}: {
  matchId: string;
  date: string;
  time?: string;
  location?: string;
  opponent?: string;
  matchType?: string;
}) {
  const isEvent = matchType === "EVENT";
  const label = isEvent ? "일정" : "경기";
  const voteUrl = `${APP_URL}/matches/${matchId}?tab=vote`;
  if (!(await ensureKakao())) {
    fallbackShare(voteUrl, `${date} ${label} 참석 투표에 참여하세요!`);
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `📋 ${date} ${label} 참석 투표`,
      description: [
        opponent && (isEvent ? opponent : `vs ${opponent}`),
        time,
        location,
      ].filter(Boolean).join(" · "),
      imageUrl: `${APP_URL}/icons/icon-512.png`,
      link: {
        mobileWebUrl: voteUrl,
        webUrl: voteUrl,
      },
    },
    buttons: [
      {
        title: "투표 참여하기",
        link: {
          mobileWebUrl: voteUrl,
          webUrl: voteUrl,
        },
      },
    ],
  });
}

/** 팀 초대 공유 */
export async function shareTeamInvite({
  teamName,
  inviteCode,
}: {
  teamName: string;
  inviteCode: string;
}) {
  // GA4 이벤트
  try { const { GA } = await import("@/lib/analytics"); GA.inviteSent("kakao_talk"); } catch { /* ignore */ }
  if (!(await ensureKakao())) {
    fallbackShare(`${APP_URL}/team?code=${inviteCode}`, `${teamName} 팀 참석투표/회비관리 앱이에요!\n아래 링크 눌러서 카카오 로그인하면 바로 가입돼요 👇`);
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `⚽ ${teamName}에 합류하세요!`,
      description: `링크를 누르면 바로 가입됩니다.\n참석투표 · 회비관리 · 라인업 — 팀 운영을 한 곳에서.`,
      imageUrl: `${APP_URL}/icons/icon-512.png`,
      link: {
        mobileWebUrl: `${APP_URL}/team?code=${inviteCode}`,
        webUrl: `${APP_URL}/team?code=${inviteCode}`,
      },
    },
    buttons: [
      {
        title: "팀 합류하기",
        link: {
          mobileWebUrl: `${APP_URL}/team?code=${inviteCode}`,
          webUrl: `${APP_URL}/team?code=${inviteCode}`,
        },
      },
    ],
  });
}

/** Kakao SDK 없을 때 Web Share API / 클립보드 fallback */
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function fallbackShare(url: string, text: string) {
  if (typeof navigator === "undefined") return;

  // 모바일에서만 Web Share API 사용 (PC Windows 공유 모달은 불편)
  if (isMobile() && navigator.share) {
    navigator.share({ title: "PitchMaster", text: `${text}\n${url}` }).catch(() => {});
    return;
  }

  // PC: 클립보드 복사
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${url}`)
      .then(() => alert("링크가 클립보드에 복사되었습니다!"))
      .catch(() => {
        // clipboard 실패 시 prompt fallback
        prompt("아래 링크를 복사해주세요:", `${text}\n${url}`);
      });
  } else {
    prompt("아래 링크를 복사해주세요:", `${text}\n${url}`);
  }
}
