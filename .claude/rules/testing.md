---
paths:
  - "e2e/**"
  - "perf/**"
  - "**/*.spec.ts"
  - "**/*.test.ts"
  - "playwright.config.ts"
  - "playwright.perf.config.ts"
  - "vitest.config.ts"
---

### E2E 테스트 (Playwright)

```bash
npm run test:e2e          # 전체 (자동으로 npm run dev 띄움, reuseExistingServer)
npm run test:e2e:ui       # UI 모드 (디버깅)
npm run test:e2e:report   # 마지막 HTML 리포트 열기
```

- **3개 프로젝트**: `chromium`(비로그인 스모크, Desktop) / `setup`(데모 로그인) / `chromium-auth`(인증, 모바일 390px)
- **인증 방식**: `setup`이 `POST /api/auth/demo`로 데모 계정(FC DEMO·회장) 세션을 `e2e/.auth/demo.json`(gitignore)에 저장 → `chromium-auth`가 재사용
  - ⚠️ **prod 빌드 금지** — `setSession`이 prod에서 `secure:true` 쿠키를 굽는데 http://localhost에선 세션이 안 잡힘. 반드시 `npm run dev`(secure:false)로 실행
  - CSRF 미들웨어 때문에 API 호출 시 `Origin: http://localhost:3000` 헤더 필수
- **로컬 전용**: 인증 테스트는 `.env`(SESSION_SECRET·service role)+데모 계정 필요. **CI**(placeholder DB)에선 `setup`이 빈 state 기록 → 인증 테스트 자동 skip (`guard.ts`가 `/login` 리다이렉트 감지). CI 항상 green 유지
- **변경(write) 테스트**: `vote.spec.ts`는 데모 28경기가 전부 COMPLETED라 임시 경기 생성→투표→`afterEach` 삭제(CASCADE)로 잔여물 없이 실행
- **권한별 테스트**: `permissions.spec.ts` — dev-login(`DEV_IMPERSONATE=1`, playwright.config webServer env)으로 FC DEMO STAFF(`demo_정공미`)/MEMBER(`demo_서공격`) 가장 → staffOnly 게이트(회비 납부현황·설정 탭, 햄버거 "빠른 처리" 그룹) 노출 차이 검증. **fresh 서버에서만 동작**(reuseExistingServer 로 기존 서버 재사용 시 env 미적용 → 자동 skip)
- 첫 방문 코치마크(`localStorage["pm_coach_mark_v1"]`)·Next dev 오버레이(`<nextjs-portal>`)는 `guard.ts`의 `addInitScript`로 차단 (클릭 가로채기 방지)

### 성능 측정 (Playwright, `perf/` + `playwright.perf.config.ts`)

```bash
npm run test:perf             # Web Vitals + Lighthouse 전체
npm run test:perf:vitals      # 경량 Web Vitals만 (의존성 0)
npm run test:perf:lighthouse  # Lighthouse 종합 감사만
PERF_BASE_URL=http://localhost:3000 npm run test:perf  # 로컬 prod 빌드 대상 (먼저 next build && next start)
```

- ⚠️ **성능은 dev 가 아닌 prod 대상** — 기본 타깃 = 라이브(`https://pitch-master.app`). dev 는 미압축으로 2~5배 부풀려져 무의미. (E2E 와 정반대 — 그래서 **별도 config**)
- `web-vitals.spec.ts`(의존성 0): LCP·FCP·CLS·TTFB + 요청수·전송량, Google 기준 판정 출력 + 관대한 회귀 가드. `lighthouse.spec.ts`: perf·a11y·BP·SEO 점수 (모바일 emulation, `playwright-lighthouse`+`lighthouse`)
- ⚠️ **`/` 는 비로그인 시 `/login`(=실제 랜딩/마케팅 페이지)으로 리다이렉트** ([src/app/page.tsx](src/app/page.tsx)). 랜딩 측정은 `/login` 직접. 공개 측정 대상: `/login`·`/guide`·`/pricing`
- ⚠️ **콜드 캐시 1회 측정값은 노이즈** (라이브 랜딩 LCP가 cold 6.3s ↔ warm 1.2s). 비교·검토는 워밍 후 또는 여러 번 median
- **부하/스트레스 테스트는 범위 밖** (k6·Artillery 별도). Playwright 는 클라이언트 측 측정 전용
- 베이스라인(2026-06-24): 랜딩 Lighthouse perf 63(상대 약점, 43요청·889KB) / 가이드 100 / 요금제 99, a11y·BP·SEO 거의 만점
