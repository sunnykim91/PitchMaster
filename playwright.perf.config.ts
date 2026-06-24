import { defineConfig, devices } from "@playwright/test";

/**
 * 성능 측정 전용 설정 (기능 E2E 와 분리).
 *
 * ⚠️ 성능은 dev 가 아닌 **prod 대상**으로만 의미가 있다 (dev 는 미압축·HMR 로 2~5배 부풀려짐).
 * 기본 타깃은 라이브 사이트. 로컬 prod 빌드/프리뷰로 바꾸려면 PERF_BASE_URL 로 override.
 *   예: PERF_BASE_URL=http://localhost:3000  (먼저 `next build && next start` 로 띄운 뒤)
 *
 * webServer 를 두지 않는다 — 외부 URL 을 그대로 측정.
 */
const BASE_URL = process.env.PERF_BASE_URL || "https://pitch-master.app";

export default defineConfig({
  testDir: "./perf",
  fullyParallel: false, // 측정 안정성 위해 순차
  workers: 1, // 동시 실행은 CPU 경합으로 측정 왜곡
  retries: 0,
  reporter: [["list"]],
  timeout: 120_000,

  use: {
    baseURL: BASE_URL,
    // 모바일 우선 서비스 — 모바일 뷰포트로 측정 (Lighthouse 는 자체 모바일 emulation 사용)
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },

  projects: [{ name: "perf", use: {} }],
});
