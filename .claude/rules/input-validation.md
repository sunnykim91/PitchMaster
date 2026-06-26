---
paths:
  - "src/lib/validators/**"
  - "src/app/api/**"
  - "src/lib/auth.ts"
  - "src/app/onboarding/**"
  - "src/app/team/**"
---

## 입력 검증 (2026-05-02 신규 — SQL/script 인젝션 사고 대응)

**헬퍼**: `src/lib/validators/safeText.ts`
- `validateSafeName(input, options)` — 사용자/팀 이름 검증
- `sanitizeKakaoNickname(input)` — 카카오 닉네임 자동 정제 ("사용자" 폴백)

**거부 패턴**:
- SQL/script: `' " ; \ < > -- /* */`
- 제어문자: `\x00-\x1f \x7f`
- (옵션 `requireMeaningful`) 의미문자(`[가-힣a-zA-Z0-9]`) 부재 — 자모만/특수문자만 거부

**적용 위치 6곳 + 권장 옵션**:
1. `src/lib/auth.ts findOrCreateKakaoUser` — `sanitizeKakaoNickname` (위험 시 "사용자" 폴백)
2. `src/app/onboarding/actions.ts` — `validateSafeName` + `requireMeaningful: true`
3. `src/app/api/profile/route.ts PUT` — 위와 동일
4. `src/app/team/actions.ts createTeam` — `validateSafeName` + `minLength: 2` + `requireMeaningful: true`
5. `src/app/api/teams/route.ts PUT` — 위와 동일
6. `src/app/api/auth/kakao/callback/route.ts` — `ACCOUNT_BLOCKED` catch + `/login?error=blocked` redirect

**카카오 ID 차단 흐름** (커밋 6e3dfb7):
- `findOrCreateKakaoUser` 진입 시 `users.deleted_at IS NOT NULL` 사전 체크 → `ACCOUNT_BLOCKED` throw
- 한계: `cron/hard-delete-withdrawn`이 14일 후 row 삭제하면 차단 풀림. 영구 차단은 `users.is_banned` 컬럼 신설 백로그

**규칙**: 새 user-text 입력 필드 추가 시 위 헬퍼 동일 적용 의무 (게시판 글·댓글, 회비 메모 등 미적용 영역은 백로그)

**테스트**: `src/__tests__/lib/safeText.test.ts` (43 케이스)
