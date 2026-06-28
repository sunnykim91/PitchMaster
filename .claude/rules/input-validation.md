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
- `validateSafeName(input, options)` — 사용자/팀 이름·용병 이름 등 **엄격** 검증 (SQL/script 특수문자 거부)
- `validateFreeText(input, options)` — 게시판 글·댓글·메모 등 **자유 텍스트** 검증 (제어문자만 차단, 일상 구두점·따옴표 허용)
- `sanitizeKakaoNickname(input)` — 카카오 닉네임 자동 정제 ("사용자" 폴백)

**거부 패턴**:
- SQL/script: `' " ; \ < > -- /* */`
- 제어문자: `\x00-\x1f \x7f`
- (옵션 `requireMeaningful`) 의미문자(`[가-힣a-zA-Z0-9]`) 부재 — 자모만/특수문자만 거부

**`validateSafeName` 적용 위치 (엄격 — 이름류)**:
1. `src/lib/auth.ts findOrCreateKakaoUser` — `sanitizeKakaoNickname` (위험 시 "사용자" 폴백)
2. `src/app/onboarding/actions.ts` — `validateSafeName` + `requireMeaningful: true`
3. `src/app/api/profile/route.ts PUT` — 위와 동일
4. `src/app/team/actions.ts createTeam` — `validateSafeName` + `minLength: 2` + `requireMeaningful: true`
5. `src/app/api/teams/route.ts PUT` — 위와 동일
6. `src/app/api/auth/kakao/callback/route.ts` — `ACCOUNT_BLOCKED` catch + `/login?error=blocked` redirect
7. `src/app/api/guests/route.ts` · `src/app/api/members/bulk/route.ts` — 용병·대량 회원 이름

**`validateFreeText` 적용 위치 (자유 텍스트 — 글·메모)**:
- `src/app/api/posts/route.ts` (제목/내용, POST·PUT) · `comments/route.ts` (댓글) · `match-comments/route.ts`
- `src/app/api/dues/route.ts` (회비 메모 description, POST·PUT) · `diary/route.ts` (경기 일지) · `rules/route.ts` · `matches/route.ts` (상대팀명) · `teams/join-request/route.ts`

**카카오 ID 차단 흐름** (커밋 6e3dfb7):
- `findOrCreateKakaoUser` 진입 시 `users.deleted_at IS NOT NULL` 사전 체크 → `ACCOUNT_BLOCKED` throw
- 한계: `cron/hard-delete-withdrawn`이 14일 후 row 삭제하면 차단 풀림. 영구 차단은 `users.is_banned` 컬럼 신설 백로그

**규칙**: 새 user-text 입력 필드 추가 시 위 헬퍼 동일 적용 의무 — 이름류는 `validateSafeName`, 글·메모류는 `validateFreeText`. (2026-06-28 기준 게시판·댓글·회비 메모 등 주요 자유 텍스트 입력은 모두 적용 완료)

**테스트**: `src/__tests__/lib/safeText.test.ts` (43 케이스)
