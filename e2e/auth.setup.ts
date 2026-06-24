import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * 인증 E2E 사전 단계: 데모 계정(POST /api/auth/demo)으로 로그인해
 * 서명된 pm_session 쿠키를 storageState 로 저장한다.
 *
 * - 성공(로컬: SESSION_SECRET + Supabase service role + 데모 계정 존재) → demo.json 에 세션 기록
 * - 실패(CI/placeholder DB: getSupabaseAdmin null → 500, 또는 데모 계정 없음 → 404)
 *   → 빈 storageState 를 기록하고 경고만 남긴 뒤 통과. 이후 인증 테스트는 /login 리다이렉트를
 *     감지해 스스로 skip 한다 (guard.ts). 따라서 setup 실패가 CI 를 빨갛게 만들지 않는다.
 */
const authFile = path.join(__dirname, ".auth/demo.json");

setup("authenticate as demo president", async ({ request }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // CSRF 미들웨어(src/middleware.ts)가 Origin/Referer 없는 POST 를 403 으로 막으므로
  // localhost Origin 을 명시해 화이트리스트를 통과시킨다.
  const res = await request.post("/api/auth/demo", {
    headers: { Origin: "http://localhost:3000" },
  });
  if (!res.ok()) {
    console.warn(
      `[auth.setup] 데모 로그인 불가 (status ${res.status()}) — 인증 E2E 는 skip 됩니다. ` +
        `로컬에서 실행하려면 .env 의 SESSION_SECRET·Supabase service role 키와 데모 계정(demo_kakao_id_pitchmaster)이 필요합니다.`,
    );
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // 응답 Set-Cookie(pm_session)가 request 컨텍스트 쿠키 jar 에 담김 → storageState 로 직렬화.
  await request.storageState({ path: authFile });
});
