import { defineConfig, devices } from "@playwright/test";
import path from "path";

// 데모 로그인으로 저장한 세션 storageState (auth.setup.ts 가 기록). gitignore 처리됨.
const STORAGE_STATE = path.join(__dirname, "e2e/.auth/demo.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // 1) 비로그인 스모크 — Desktop Chrome (랜딩·로그인·404·접근성)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/auth\.setup\.ts/, /authenticated[\/\\]/],
    },

    // 2) setup — 데모 계정으로 로그인해 세션 storageState 저장.
    //    로컬(.env SESSION_SECRET + Supabase service role + 데모 계정 존재)에서만 성공.
    //    CI/placeholder 환경에선 빈 state 를 기록하고 넘어감 → 인증 테스트는 자동 skip.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // 3) 로그인 후 화면 — 모바일 뷰포트(탭바·햄버거가 보이도록 lg 미만)로 데모 세션 재사용.
    {
      name: "chromium-auth",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
      // .spec.ts 만 테스트로 — guard.ts 등 헬퍼는 제외 (테스트 파일 간 import 금지 규칙 회피)
      testMatch: /authenticated[\/\\].*\.spec\.ts$/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // 권한별 테스트용 dev-login 활성화 (NODE_ENV!=production 이중 게이트 → prod 무영향).
    // ⚠️ reuseExistingServer 로 기존 서버를 재사용하면 적용 안 됨 → 그 경우 permissions 스펙은 자동 skip.
    env: { DEV_IMPERSONATE: "1" },
  },
});
