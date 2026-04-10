# 세션 쿠키 HMAC 서명 도입 기록

**작업일**: 2026-04-10
**대상 파일**: `src/lib/auth.ts`, `src/lib/sessionSign.ts`(신규), `src/__tests__/lib/sessionSign.test.ts`(신규), `.env`
**배포 효과**: 기존 모든 사용자의 세션 쿠키가 무효화되어 **카카오 재로그인 필요**. 데이터 손실 없음.

---

## 1. 왜 필요했나 — 취약점 개요

### 1-1. 직접적 원인
`pm_session` 쿠키가 **서명 없는 일반 JSON 문자열**이었다. 즉 쿠키 값 자체가 곧 세션이었고, 클라이언트에서 쿠키만 조작하면 임의의 사용자로 위장할 수 있는 상태였다.

- 기존 형식: `pm_session=<JSON.stringify(session)>` (httpOnly는 켜져 있음)
- 위장 시나리오:
  1. 공격자가 피해자의 `users.id` UUID를 획득 (팀 멤버 목록, 게시판 작성자 등 UI에서 노출 가능)
  2. 자신의 브라우저 devtools 또는 서버에서 `document.cookie`와 무관하게 HTTP 요청 시 직접 쿠키 헤더 조작
  3. `{"user":{"id":"<피해자 UUID>","name":"...",...}}` 형태로 JSON 조립 → 쿠키에 주입
  4. 이후 모든 요청이 피해자로 처리됨 — 회장 권한 훔치기, 다른 팀의 회비 조작, 게시글 위작 등 전체 서비스 도메인에 걸친 위장 가능

### 1-2. `httpOnly`는 보호 수단이 아니었다
httpOnly는 **XSS로부터 쿠키 탈취를 막는 것**이지 쿠키 자체의 신뢰성을 보장하지 않는다. 공격자는 자기 쿠키를 조작하는 것이므로 httpOnly는 무관하다.

### 1-3. 실제 위험 사건의 발단
2026-04-10 박태수(제니스 FC 회장) 케이스에서 **설명할 수 없는 권한 변경**이 발견되었다 — 박태수가 회장에서 MEMBER로 강등돼 있었다. 감사 로그가 없어 경로를 단정할 수 없었지만 조사 중에 다음 두 가지 구조적 문제가 드러났다.

1. **권한 변경 audit log가 없음** — 누가 언제 누구의 role을 바꿨는지 추적 불가
2. **세션 쿠키가 서명 없음** — 이론상 누구나 다른 사용자로 위장 가능

이 중 2번이 이번 작업의 대상이다. 1번(audit log)은 별도 작업.

### 1-4. 서비스 규모상 시급성
- 현재 81팀 520명, **최근 14일 신규 37팀**. 사용자가 빠르게 증가하는 시점에 보안 부재가 노출되면 신뢰 회복이 거의 불가능하다.
- 서비스 인지도는 낮지만 공개 URL(`pitch-master.app`)과 오픈 카카오 채널이 있어 내부 고발성 공격 가능성은 0이 아님.
- 보안 마이그레이션은 사용자가 적을 때가 가장 쉽다 (재로그인 요구의 부담이 작음).

---

## 2. 어떻게 구현했나 — 기술적 결정

### 2-1. 암호화 대신 서명 (HMAC)
**결정**: 쿠키 내용을 암호화(iron-session 등)하지 않고 **HMAC-SHA256으로 서명만** 붙인다.

**이유**:
- 세션 안에는 `user.id`, `name`, `teamId`, `teamRole`, `teamName` 등이 들어있다. 모두 **어차피 UI에서 보이는 값**(멤버 페이지, 팀 설정 등에서 전부 노출). 기밀이 아님.
- 진짜 지켜야 할 것은 "이 쿠키를 위조할 수 없다"는 **무결성**. 무결성은 서명만으로 보장됨.
- 암호화를 도입하면 키 관리·성능·디버깅 부담이 늘어나지만 이득은 없음.
- 추후 JWT 같은 표준으로 옮길 수 있는 여지도 남겨둠 (JWT도 본질적으로는 서명된 JSON).

### 2-2. 서명 형식
```
<base64url(payload)>.<base64url(HMAC-SHA256(payload, SECRET))>
```
- payload는 `JSON.stringify(session)`
- SHA-256, 32바이트 base64url로 인코딩된 SECRET 사용
- base64**url**(`-`, `_`, no padding)을 쓴 이유: 표준 base64의 `+`, `/`, `=`가 쿠키 값에서 이스케이프 이슈를 일으킬 수 있음

### 2-3. 타이밍 공격 방어
검증은 **`crypto.timingSafeEqual`** 로 수행. 단순 `===` 비교는 초기 바이트가 다를수록 빠르게 false를 반환하기 때문에 고정밀 타이머로 올바른 서명 접두사를 한 바이트씩 브루트포스할 수 있다. 타이밍 공격은 이론적으로 극히 드물지만 세션 쿠키 같은 핵심 자산에서는 기본 방어.

### 2-4. 시크릿 미설정 시 동작 — 'fail-closed'
`SESSION_SECRET`이 없거나 16자 미만이면:
- `signSession()` → `null` 반환
- `verifySession()` → 모든 쿠키 거부(null 반환)
- `parseSession()` → 콘솔 경고 후 null 반환 = 모든 요청이 비로그인으로 처리
- `setSession()` → `throw` (새 로그인도 불가)

**이유**: 시크릿이 빠진 상태에서 앱이 "그냥 서명 안 하고 돌아가는" 것은 보안 작업을 되돌리는 결과. 반드시 끊어내야 함. Vercel 배포 전에 환경변수를 설정하지 않으면 서비스가 로그인 거부 상태가 되므로 실수로 배포해도 안전.

### 2-5. 기존 쿠키 호환성 — 하드 컷오버
**결정**: 이전 unsigned 쿠키는 즉시 무효화. 모든 사용자가 1회 카카오 재로그인.

**이유**:
- 백워드 호환(unsigned도 잠시 받아주기)은 그 기간 동안 여전히 위조 가능 → **보안 작업의 의미를 없앰**.
- 카카오 OAuth는 1클릭 로그인이라 사용자 부담이 작음.
- 520명이 한꺼번에 재로그인하더라도 Supabase·Vercel 부하 관점에서 무의미한 규모.

### 2-6. 쿠키 옵션
기존 옵션을 그대로 유지: `httpOnly`, `sameSite: lax`, `path: /`, `maxAge: 30일`.
- `secure`는 추가하지 않음 → 현재 코드에 없는 필드인데, Vercel 배포는 HTTPS이므로 브라우저가 자동으로 HTTPS-only로 취급. localhost 개발을 위해 명시적으로 `secure: true`는 붙이지 않음.
- 향후 프로덕션 전용으로 `secure: process.env.NODE_ENV === "production"`을 추가하는 것을 고려할 수 있음.

### 2-7. Edge runtime 미고려
Next.js middleware(Edge runtime)에서 `node:crypto`는 제한적으로만 쓸 수 있다. 이번 코드는 **미들웨어가 아닌 서버 컴포넌트/라우트 핸들러(Node runtime)**에서만 호출되므로 `crypto`를 자유롭게 사용. 향후 미들웨어에서 세션을 검증해야 한다면 `SubtleCrypto` API로 이식하거나 Edge-safe 라이브러리로 교체 필요.

---

## 3. 구현 상세

### 3-1. 신규 파일 — `src/lib/sessionSign.ts`
- `signSession(payload: string): string | null` — payload를 서명된 쿠키 문자열로 변환
- `verifySession(cookie: string): string | null` — 쿠키를 검증하고 payload 복원 (실패 시 null)
- `isSessionSigningConfigured(): boolean` — 시크릿 설정 여부 확인 (부팅 시 진단용)
- 모든 함수는 에러를 throw하지 않고 null 반환 (호출부가 일관되게 graceful 처리)

### 3-2. 수정 파일 — `src/lib/auth.ts`
- `parseSession()` 이 이제 `verifySession()`을 통과한 payload만 파싱. 시크릿 미설정 시 warning 후 null.
- `setSession()` 이 `signSession()`으로 서명 후 쿠키에 저장. 시크릿 미설정 시 throw.
- `auth()` 내부의 세션 동기화 로직(DB에서 role/logo 업데이트)도 재서명 후 쿠키 재설정.

### 3-3. 환경변수
```
SESSION_SECRET=<32바이트 base64>
```
- 로컬: `.env`에 추가 (2026-04-10 시점 값은 .env 참고)
- 프로덕션: **Vercel 대시보드에 수동 등록 필요** (아래 배포 가이드 참고)

### 3-4. 테스트
`src/__tests__/lib/sessionSign.test.ts` — 7개 케이스:
1. 정상 서명-검증 round-trip
2. 서명 부분 변조 → 거부
3. payload 부분 교체(공격자 payload 삽입) → 거부
4. 다른 시크릿으로 검증 → 거부
5. 잘못된 쿠키 형식 → 거부
6. 시크릿 미설정 → 거부
7. 시크릿 16자 미만 → 거부

모두 통과(7/7). 전체 테스트 587/587.

---

## 4. 배포 가이드 (Vercel)

1. **Vercel 프로젝트 → Settings → Environment Variables**
2. 신규 변수 추가:
   - Name: `SESSION_SECRET`
   - Value: 로컬 `.env`에 방금 생성한 값 그대로 복사
   - Environments: **Production, Preview, Development 모두 체크**
3. Save
4. **재배포**: 환경변수는 기존 배포에 자동 적용되지 않음. Deployments 탭에서 최신 배포를 "Redeploy" 하거나, 다음 `git push`가 자동 트리거.
5. 배포 직후 모든 기존 세션이 무효화됨 → 사용자가 카카오 로그인 버튼 클릭 1회로 복구.

**주의**: 환경변수를 설정하지 않고 배포하면 모든 로그인 시도가 실패하고 앱은 "비로그인 상태"로만 돌아간다 (fail-closed). 배포 전 반드시 Vercel에 먼저 등록.

**시크릿 생성 명령** (재생성이 필요할 때):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 5. 한계와 남은 과제

### 5-1. 이번 작업으로 해결된 것
- ✅ 쿠키 조작으로 다른 사용자 위장 — **불가능**
- ✅ 기존 unsigned 쿠키 무효화
- ✅ 타이밍 공격 방어
- ✅ fail-closed 동작으로 환경변수 누락 시에도 안전

### 5-2. 이번 작업으로 해결되지 않은 것
- ❌ **RLS Policy 부재** — Supabase anon key가 클라이언트에 노출되어 직접 DB 접근 가능. 별도 작업 필요. (현재는 Realtime 구독용으로만 사용 중이라 실질 피해는 제한적이지만 방치하면 안 됨)
- ❌ **역할 변경 audit log** — 박태수 케이스의 나머지 절반. 누가 언제 role을 바꿨는지 추적할 수 있어야 함
- ❌ **세션 무효화(revocation)** — 이번 구현도 쿠키 만료(30일) 전에 특정 세션을 서버에서 강제 로그아웃시키는 메커니즘은 없음. DB에 세션 테이블을 만들거나 시크릿 roll로 모든 세션 일괄 무효화하는 방법만 존재.
- ❌ **시크릿 roll 절차** — 시크릿이 유출되면 새 시크릿으로 교체해야 하는데, 그 순간 모든 사용자가 로그아웃됨. 정책 문서화 필요.
- ❌ **Vercel 환경변수 저장의 안전성** — Vercel 대시보드에 접근할 수 있는 사람(=김선휘)이 곧 시크릿 접근 권한자. 팀 규모 커지면 secret manager 고려.

### 5-3. 후속 권장 작업
1. **RLS Policy 작성** (이번 보안 작업의 자매편 — 1번 항목)
2. **역할 변경 audit log 테이블** (`role_change_logs`: user_id, changed_by, old_role, new_role, reason, changed_at)
3. **프로덕션 쿠키에 `secure: true` 명시**
4. **시크릿 roll 절차 문서화** (이 파일 업데이트)

---

## 6. 커밋

```
feat(security): 세션 쿠키 HMAC 서명 도입 — 쿠키 조작 위장 방지
```

변경 파일:
- `src/lib/sessionSign.ts` (신규)
- `src/lib/auth.ts` (parseSession/setSession 재작성)
- `src/__tests__/lib/sessionSign.test.ts` (신규, 7 케이스)
- `.env` (SESSION_SECRET 추가 — git 무시)
- `docs/security-session-hmac.md` (이 파일)
