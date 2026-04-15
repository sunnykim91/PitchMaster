# src/lib 컨텍스트

## 핵심 파일 역할

### 인증 / 권한
- `auth.ts` — 카카오 OAuth 설정, 세션 쿠키 검증, `isKakaoConfigured()`
- `sessionSign.ts` — HMAC-SHA256 세션 서명 (30일 쿠키)
- `permissions.ts` — 역할 체계 + `PERMISSIONS` 상수 + `canPerform()` 헬퍼

### 권한 체계 (`permissions.ts`)
```typescript
PERMISSIONS = {
  MATCH_CREATE: "STAFF",    MATCH_DELETE: "PRESIDENT",
  DUES_SETTING_EDIT: "STAFF", DUES_RECORD_ADD: "STAFF",
  MEMBER_ROLE_CHANGE: "PRESIDENT", MEMBER_KICK: "PRESIDENT",
  TEAM_SETTINGS: "PRESIDENT", SEASON_CREATE: "STAFF",
  GOAL_RECORD: "MEMBER",   // 누구나 가능
  ...
}
```

### 데이터 / API
- `api-helpers.ts` — `apiMutate()` 래퍼 (fetch + 에러 처리)
- `useApi.ts` — GET 요청 훅 (`data`, `loading`, `error`, `refetch`)
- `useAsyncAction.ts` — 비동기 액션 훅 (로딩 상태 + 에러 처리)
- `types.ts` — 공통 타입 (`Role`, `TeamMember`, `Match` 등)

### UI / UX
- `errorMessages.ts` — 표준화된 에러 메시지 상수
- `formatters.ts` — 날짜/숫자 포매터
- `ToastContext.tsx` — `showToast()` 전역 훅
- `ConfirmContext.tsx` — `useConfirm()` 전역 확인 다이얼로그
- `ThemeContext.tsx` — 라이트/다크/시스템 테마 토글
- `ViewAsRoleContext.tsx` — 역할 오버라이드 (개발용, 다른 역할로 UI 확인)

### 특수 기능
- `analytics.ts` — GA4 이벤트 (landingView, demoStart, matchCreate 등 완비)
- `formationAI.ts` — AI 자동 포지션 배치 로직
- `formations.ts` — 포메이션 정의 (4-4-2, 4-3-3 등)
- `kakaoShare.ts` — 카카오 공유 API 연동
- `pushSubscription.ts` — Web Push 구독 관리 (VAPID)
- `mvpThreshold.ts` — MVP 선정 기준 로직

### 서버사이드 (`server/`)
- 서버 컴포넌트에서만 사용하는 데이터 fetch 함수들
- `getRecordsData.ts`, `getDashboardData.ts` 등

### Supabase (`supabase/`)
- `admin.ts` — service role 클라이언트 (서버사이드 전용)
- `client.ts` — anon 클라이언트 (클라이언트사이드)
