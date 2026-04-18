# PitchMaster — Claude Code 컨텍스트 문서

## 프로젝트 개요
풋살/축구 팀 관리 웹앱. 총무/회장이 카카오톡 단체방으로 하던 운영(출석, 회비, 일정, 기록)을 앱 하나로 대체하는 서비스.

- **도메인**: pitch-master.app (Cloudflare DNS + Vercel 자동배포)
- **실서비스 중**: 82개 팀, 647+ 명 회원 (2026-04 기준)
- **데모 계정**: kakao_id=`demo_kakao_id_pitchmaster`, 팀=FC DEMO, 역할=회장

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4 |
| Backend | Supabase (PostgreSQL + RLS), Next.js API Routes |
| 인증 | 카카오 OAuth 2.0 + HMAC-SHA256 서명 세션 쿠키 (30일) |
| 테스트 | Vitest (615+ 케이스), Playwright E2E |
| 언어 | TypeScript strict mode |
| PWA | Service Worker + Web Push (VAPID) |
| 테마 | 다크 기본, 라이트/시스템 순환 토글 |

---

## 폴더 구조 핵심

```
src/
  app/
    (app)/          # 인증 필요 영역 (로그인 후)
      dashboard/    # 홈
      matches/      # 경기 목록 + [matchId] 상세
      records/      # 통계/기록
      dues/         # 회비 관리
      members/      # 회원 관리
      board/        # 게시판
      settings/     # 팀 설정
    login/          # 랜딩페이지 + 카카오 로그인
    api/            # API Routes
  components/       # 공통 컴포넌트
  lib/
    server/         # 서버사이드 데이터 fetch
    supabase/       # Supabase 클라이언트
supabase/
  migrations/       # SQL 마이그레이션 파일
```

---

## 권한 체계

```
PRESIDENT (회장) > STAFF (운영진) > MEMBER (일반 회원)
```

- DB RLS 정책으로 강제
- 클라이언트에서도 `PERMISSIONS` 상수로 이중 체크
- **주의**: 납부현황 탭(`DuesClient.tsx`)이 `staffOnly: true` — 일반 회원은 자기 납부 기록 직접 접근 불가

---

## 네비게이션 구조

```
하단 탭바: 홈 | 일정 | 기록 | 회비 | 더보기(Sheet)
상단 햄버거: 전체 메뉴 Sheet (홈/경기/기록/회비/회원/게시판/회칙/설정)
```

두 시스템이 공존하는 건 의도된 설계 (탭바=빠른이동, 햄버거=팀전환/설정).
`src/app/(app)/ClientLayout.tsx`에 둘 다 구현되어 있음.

---

## 디자인 시스템

### CSS 변수 토큰 위치 — 3곳 분산 (주의)
1. `src/app/globals.css` → 다크모드 기본 변수
2. `src/app/layout.tsx` → `<script>` 인라인으로 라이트모드 CSS 변수 주입 (하드코딩)
3. `src/app/(app)/ClientLayout.tsx` → 테마 토글 로직

라이트모드 색상 변경 시 **layout.tsx 스크립트 문자열 안**을 수정해야 함.

### 주요 색상 토큰
- `--primary`: coral (#FF6B6B 계열)
- `--success`, `--warning`, `--info`, `--accent`
- 참조 패턴: `text-[hsl(var(--warning))]` — Tailwind config에 미등록 상태

### 카드 컴포넌트 종류 (5종 혼재)
- `card-featured` (CSS 유틸리티, globals.css)
- `card-stat` (CSS 유틸리티)
- `card-list-item` (CSS 유틸리티)
- `<Card>` Radix 컴포넌트
- `<div className="rounded-xl border ...">` 직접 작성

---

## 경기 상세 탭 구조

`src/app/(app)/matches/[matchId]/MatchDetailClient.tsx`

```
정보 | 투표 | 전술 | 출석 | 기록 | 일지
```
6개 탭 전부 텍스트 전용 (아이콘 없음), `flex-1` 균등 분할.
좁은 화면에서 터치 타겟이 작아짐.

---

## 실제 미구현 항목 (코드 기준, 3개)

> **중요**: TODO.md는 outdated. 아래가 실제 미구현.

1. **회비 선납** (6개월/1년) — UI도 로직도 없음
2. **회원 벌크 CSV 등록** — 현재 한 명씩만 등록 가능
3. **guide.html → Next.js 마이그레이션** — `public/guide.html` 방치 중

## 골 기록 설계 (2026-04-18 기준)

- `match_goals.quarter_number` — **nullable** (migration 00032). `null` = 쿼터 모름
- `+ 득점` / `+ 실점` 버튼: 원클릭 즉시 등록 (기본값: 득점자 UNKNOWN, 쿼터 null, 골유형 NORMAL)
- 상세 수정은 골 카드 수정 버튼 → 아코디언 폼에서 처리
- API: `quarter=0` → `null` 변환 저장, 유효범위 0~10 (`goals/route.ts`)

---

## AI 기능 설계 (2026-04-18 기준)

### Feature Flag
```typescript
// page.tsx (서버 컴포넌트)
const enableAi = session.user.name === "김선휘";

// MatchDetailClient.tsx (클라이언트)
const effectiveEnableAi = enableAi && sportType === "SOCCER";
// → 풋살팀에는 AI 기능 전체 비노출
```

### AI 기능 목록 (5개)
| 기능 | 위치 | 공개 범위 | 모델 |
|------|------|-----------|------|
| 선수 시그니처 | /player/[id] | 캐시 전체 공개, 생성은 김선휘만 | Haiku 4.5 |
| 경기 후기 | 경기 일지 탭 | 캐시 전체 공개, 재생성은 김선휘만 | Haiku 4.5 |
| AI 코치 분석 | 전술 탭 | 김선휘 + 축구 팀 전용 | Haiku 4.5 |
| AI Full Plan | 자동편성 빌더 | 김선휘 + 축구 팀 전용 | Haiku 4.5 |
| OCR 거래 파싱 | 회비 일괄등록 | 전체 공개 | Haiku 4.5 Vision |

### AI 코치 분석 데이터 파이프라인

```
AutoFormationBuilder
  └─ onAnalysisContextReady({
       placement,          // 1쿼터 슬롯-선수 배치
       quarterPlacements,  // 전 쿼터 배치 (로테이션 분석)
       allSlotsFilled,     // 전술판 채움 여부 (false면 버튼 비활성)
       attendees,          // 참석자 (isGuest=true면 용병)
       formationName,
       quarterCount,
     })
  → AiCoachAnalysisCard
       playerWorkload 계산 (quarterPlacements에서 선수별 쿼터 배치 수)
  → POST /api/ai/tactics
       payload: { placement, quarterPlacements, playerWorkload, attendees, ... }
  → generateAiTacticsAnalysisStream()
       historyBlock = getOrComputeTeamStats(teamId) → buildHistoryBlock()
         - 포메이션별 전적
         - 선수별 커리어 (totalMatches, totalGoals, totalAssists, mvpCount, mostPlayedPosition)
         - 포지션별 활약 Top 10
         - 쿼터별 득실 (누적 + 경기당 평균)
         - 상대팀 이력
```

### TeamStats 캐시 (`ai_team_stats_cache`, TTL 24h)
- `playerCareerStats`: 선수별 커리어 — 출전수/골/어시/MVP 수상횟수/주포지션
- `quarterStats`: 쿼터별 누적 득실 + 경기당 평균
- MVP 집계: `match_mvp_votes.candidate_id`(users.id) → users.id→team_members.id 브릿지 → 경기별 최다득표 winner 방식

### 시스템 프롬프트 핵심 규칙 (aiTacticsAnalysis.ts)
- 선수 역할은 placement의 slot 기준으로만 서술 (preferredPosition 혼동 금지)
- 용병(`isGuest=true`)에 단정적 표현 금지
- 상대팀 이력 없으면 hallucination 금지, "첫 대결"로 명시
- `playerWorkload`에서 전 쿼터 출전 선수 → 3단락 체력 부담 언급 필수
- 쿼터별 득실 패턴(3쿼터 실점 집중 등) → 해당 쿼터 주의점으로 반영
- 선수 커리어(골/어시/MVP) → 2단락 핵심 선수 서술에 반영

---

## 알려진 코드 품질 이슈

- **OCR 에러 이중 표시**: `setOcrStatus()` + `showToast()` 동시 발생
- **stagger-children 딜레이**: 12번째 항목까지 360ms — 리스트 많으면 답답
- **생일 confetti**: JSX div 6개로 하드코딩 (CSS pseudo-element로 대체 가능)
- **스크린샷 경로**: `/screenshot/` vs `/screenshots/` 혼재

---

## 랜딩페이지 개선 대기 항목

`src/app/login/sections/`

- FAQ 3개 → 7-8개 확장 필요 (`FaqSection.tsx`)
- 사용자 후기 이니셜 처리 명시 필요 (`TestimonialsSection.tsx`)
- 모바일 헤더 CTA 버튼 추가 필요 (`HeaderSection.tsx`)
- HowItWorks 섹션 순서 이동: Comparison/Testimonials 앞으로

---

## 코드 작업 필수 워크플로

```bash
# 1. 테스트
npx vitest run

# 2. 빌드
npm run build

# 3. 커밋 (사용자 요청 시)
git add <파일>
git commit -m "feat: ..."   # Conventional Commits
git push origin main        # Vercel 자동배포
```

**규칙:**
- 테스트 실패 → 수정 후 진행
- 빌드 실패 → 수정 후 커밋
- `.env` 파일 절대 커밋 금지
- 커밋 메시지: 영어 Conventional Commits (feat/fix/refactor/docs/chore)

---

## 주요 데이터 (실제 팀)

- **FCMZ** (축구), **FCMZ 풋살**, **FK Rebirth**, **FC서순**, **FC DEMO** (데모), **시즌FC**
- **FK Rebirth 시즌**: 2024(1-12월), 2025(1-11월), 2026(12월-12월) — 다른 팀과 시즌 구조 다름
- **시즌FC**: 34명, 14경기 데이터 이관 완료 (2026 시즌)

---

## MCP 설정

- **Serena MCP**: `serena-agent v1.1.2` 연동 완료
  - 실행파일: `C:\Users\온유아빠\.local\bin\serena.exe`
  - 기능: LSP 기반 심볼 탐색, 의존성 추적, 정확한 리팩토링
  - 상태: Connected (claude mcp list 확인됨)
