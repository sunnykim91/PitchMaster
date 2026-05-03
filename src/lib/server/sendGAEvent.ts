import type { NextRequest } from "next/server";

const GA_MEASUREMENT_ID = "G-XWRB861513";

export interface GAServerEvent {
  name: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * 서버사이드 GA4 Measurement Protocol 이벤트 발화.
 *
 * 카카오 인앱 WebView에서 클라이언트 GA(team_create 등)가 누락되는 사고
 * (2026-04-29 7팀 가입 vs GA 1회) 보정용. signup·전환 이벤트는 callback
 * 라우트에서 서버 측 직접 발화로 누락 0%에 가깝게 측정.
 *
 * client_id는 _ga 쿠키에서 추출 → 클라이언트 GA와 동일 사용자로 매칭.
 * 쿠키 없으면 임시 client_id 생성 (별도 사용자로라도 카운트되는 게 누락보다 나음).
 *
 * 실패해도 호출자 흐름 차단하지 않음 (silent fail).
 */
export async function sendServerGAEvent(
  request: NextRequest,
  events: GAServerEvent[],
): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET;
  if (!apiSecret) return;

  const gaCookie = request.cookies.get("_ga")?.value;
  let clientId = "";
  if (gaCookie) {
    const parts = gaCookie.split(".");
    if (parts.length >= 4) {
      clientId = `${parts[2]}.${parts[3]}`;
    }
  }
  if (!clientId) {
    clientId = `srv-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${apiSecret}`,
      {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, events }),
      },
    );
  } catch (e) {
    console.error("[GA Server Event] failed", e);
  }
}
