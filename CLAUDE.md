# PitchMaster — Claude Code 컨텍스트 문서

## 🎯 작업 흐름 (매 응답 전 의무)

매 응답 전 **MEMORY.md 상단 "답변 전 워크플로우" 6단계 + 🔴 CRITICAL 12개**를 의식.

**역할 분리**:
- **CLAUDE.md** (이 파일): 프로젝트 구조·기술 스택·도메인 핵심 정책·매 세션 협업 규칙·알려진 UI/UX 부채
- **MEMORY.md**: 사용자 피드백·세션 학습·도메인 정책 상세·인프라/기술 패턴 reference (12 카테고리 그룹)

답변 전 흐름: 요청 파악 → 메모리 grep → 코드 Read·grep → agent 결과 spot check → 답변 → 수정 후 검증. **상세는 MEMORY.md 참조**.

---

## 프로젝트 개요
풋살/축구 팀 관리 웹앱. 총무/회장이 카카오톡 단체방으로 하던 운영(출석, 회비, 일정, 기록)을 앱 하나로 대체하는 서비스.

- **도메인**: pitch-master.app (Cloudflare DNS + Vercel 자동배포)
- **실서비스 중**: 131+ 팀 / 627+ 가입 회원 (2026-06-09 직접 조회 기준, 일 단위로 변동)
  - **외부 콘텐츠·블로그·광고 작성 시 반드시 Supabase 직접 조회로 최신 수치 확인** (참고: `reference_supabase_direct.md`, `reference_pitchmaster_stats.md`)
  - 이 README 수치는 outdated 가능성 높음 — 절대 그대로 인용 금지
- **데모 계정**: kakao_id=`demo_kakao_id_pitchmaster`, 팀=FC DEMO, 역할=회장

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4 |
| Backend | Supabase (PostgreSQL + RLS), Next.js API Routes |
| 인증 | 카카오 OAuth 2.0 + HMAC-SHA256 서명 세션 쿠키 (30일) |
| 테스트 | Vitest (820+ 케이스), Playwright E2E |
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
상단 햄버거: 전체 메뉴 Sheet (홈/경기/기록/회비/회원/게시판/회칙/설정/가이드)
```

두 시스템이 공존하는 건 의도된 설계 (탭바=빠른이동, 햄버거=팀전환/설정).
`src/app/(app)/ClientLayout.tsx`에 둘 다 구현되어 있음.

### 햄버거 Drawer 구조 (2026-04-29 갱신)
```
프로필 (팀명·역할·이름)
──────────────────────
SidebarNav (홈/경기/기록/회비/회원/게시판/회칙/설정/가이드)
[계정 섹션 레이블]
  📩 피드백 보내기  (nav-row 스타일, mailto 열기)
  🚪 로그아웃       (nav-row 스타일, hover 시 destructive)
──────────────────────
초대 코드 카드
v{hash}
```
- 피드백/로그아웃은 SidebarNav와 동일한 nav-row 시각 언어 (`ghost`, `py-2.5 px-3`, icon+label)
- 로그아웃: `POST /api/auth/logout` → `/login` redirect, `loggingOut` state로 버튼 비활성

---

## 디자인 시스템

### CSS 변수 토큰 위치 — 단일 source (2026-05-14 통합)
- `src/app/globals.css` — **다크(`:root`) + 라이트(`:root.light`) 둘 다 정의**
- `src/app/layout.tsx` — FOUC 방지 인라인 스크립트 = `classList.add('light')` 토글만
- `src/lib/ThemeContext.tsx` — `applyTheme()` = `classList.toggle('light')` 토글만

라이트/다크 색상 변경 시 **globals.css 한 곳만** 수정.

### 주요 색상 토큰
- `--primary`: coral (#FF6B6B 계열)
- `--success`, `--warning`, `--info`, `--accent`
- 참조 패턴: `text-[hsl(var(--warning))]` — Tailwind config에 미등록 상태

### 카드 컴포넌트 — 표준은 `<Card>` (2026-06-28 정리)
**신규 카드는 Radix `<Card>`(`src/components/ui/card.tsx`)를 표준으로 사용.** 나머지는 국소 레거시 — 확산 금지.
- ✅ `<Card>` Radix 컴포넌트 (**표준**, 41+ 파일) — base: `rounded-xl bg-card border-border/40 shadow-sm`
- 🗑️ `card-featured` — 미사용 dead 코드라 제거됨 (globals.css에서 삭제 완료)
- 🔒 `card-stat` (records 통계 그리드 1곳) — `<Card>`로 통일 보류. base 스타일 차이 + `item.bg` 반투명 틴트와 `background` 그라디언트의 cascade 상호작용 때문에 변환 시 픽셀이 바뀜. 국소 레거시로 유지
- 🔒 `card-list-item` (MatchRecordTab 2곳) — 동일 사유(transition easing 차이)로 유지
- ⚠️ raw `<div className="rounded-xl border bg-card ...">` (8곳) — bespoke shadow 섞여 일괄 전환 시 시각 변경. 신규 작성 지양, `<Card>` 우선

> 핵심: `<Card>`/card-stat/card-list-item/raw div는 base 스타일이 서로 달라 "픽셀 안 깨지는 통일"이 구조적으로 불가. 표준 문서화 + dead 제거로 부채 해소하고, 작동 중 유틸은 보존.

---

## 경기 상세 탭 구조 → `.claude/rules/matches-tabs-tactics.md` (matches/positionRoles 작업 시 자동 로드)

## 실제 미구현 항목 (2026-05-14 정정 — 채택된 큰 미구현 0개)

이전 박제(회원 벌크 CSV·guide.html 마이그)는 **둘 다 완료**:
- ✅ 회원 벌크 CSV/paste 등록 — `MemberBulkUploadModal.tsx` + `/api/members/bulk` (max 200명, paste+CSV, PRESIDENT only)
- ✅ guide.html(앱 사용법 16섹션) → Next.js `/help` 이관 완료 (92차, 1515ab5). `/guide`는 SEO 블로그 허브(`/guide/[slug]`), `/help`는 앱 사용법 manual. next.config 301 `/guide.html→/help`. 푸터: "사용 가이드"→/help, "운영 노하우"→/guide 분리.

남은 채택 후보 (조기싸커 차용 검토 — 마감 없음):
- ✅ 풋살 키퍼·교대 순번 룰렛 — `KeeperRotationCard.tsx` + `/api/keeper-rotation` + `keeper_rotation` JSONB 컬럼 (마이그 00077). 풋살 전술 탭 전용. 고정 키퍼 유무 이진(선호포지션 GK 단독 자동 감지)·원형 쿼터 회전·번호 랜덤 (92차, 6f3481d~014eeb5).
- GK 로테이션 자동 (AutoFormationBuilder 통합 후보, 축구 전용) — 풋살은 위 기능으로 대체됨
- 라인 밸런스 시각화 — PitchScore 50차 제거로 보류

UI/UX 부채 잔존 (CLAUDE.md 알려진 이슈 참조)

## 골 기록 설계 → `.claude/rules/mvp-and-scoring.md` (records/matches API·mvpThreshold 작업 시 자동 로드)

## MVP 집계 정책 → `.claude/rules/mvp-and-scoring.md` (records/matches API·mvpThreshold 작업 시 자동 로드)

## AI 기능 설계 → `.claude/rules/ai-features.md` (api/ai·전술 탭 작업 시 자동 로드)

## 역할 가이드 → `.claude/rules/matches-tabs-tactics.md` (matches/positionRoles 작업 시 자동 로드)

## 전술 탭 카드 순서 → `.claude/rules/matches-tabs-tactics.md` (matches/positionRoles 작업 시 자동 로드)

---

## 알려진 코드 품질 이슈

- **stagger-children 딜레이**: 해결됨 — globals.css가 4번째(90ms)까지만 누적, 5번째부터 동시 표시 (과거 360ms 부채 정리 완료)
- **생일 confetti**: 해결됨 — div 하드코딩 제거, `pm-dash-bday-banner`(🎂 이모지+아바타칩)로 교체됨 (코드에 confetti 흔적 0)
- **스크린샷 경로**: 해결됨 — `public/screenshots/`(복수) 단일 폴더로 일원화 완료(2026-06-28). 단수 `public/screenshot/`는 제거, AppScreenSlider·middleware matcher 모두 복수로 갱신. 모든 스크린샷 참조는 `/screenshots/`

## Supabase Realtime 구독 주의사항 (2026-04-29)

- `useRealtimeSubscription` 사용 시 **반드시 filter 지정** (`match_id=eq.xxx` 등)
- **filter 없는 전체 테이블 구독 절대 금지** — WAL 폴링이 전체 DB 시간의 86%를 점유하는 사고 발생 (2026-04-29)
- 현재 Supabase 실시간 구독: **0개** (2026-04-29 사고 후 전부 제거 — 86차 재확인). 동기화는 window CustomEvent(`match-squads-saved`) + 본인 액션 직후 refetch로 대체
- 제거된 위험 구독: `MatchesClient.tsx` match_attendance 전체 구독 (필터 없음) / `MatchDetailClient.tsx` 3개 구독
- 대안: 본인 액션 직후 refetch, 또는 window CustomEvent로 동기화

---

## 입력 검증 → `.claude/rules/input-validation.md` (validators·auth·onboarding·team API 작업 시 자동 로드)

---

## 랜딩페이지 개선 대기 항목

`src/app/login/sections/`

- ~~FAQ 3개 → 7-8개 확장~~ ✅ 완료 (`FaqSection.tsx` 현재 ~19개, 102차 확인)
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

- E2E·성능 측정 상세 → `.claude/rules/testing.md` (테스트/perf 파일 작업 시 자동 로드)

---

## 협업 규칙 (필수)

### 1. 큰 범위 수정은 사전 확인
- **4개 이상 파일** 또는 **공통 타입·디자인 토큰·핵심 라이브러리** 수정은 **수정 전에 계획·범위·트레이드오프를 보고하고 승인받기**
- 1~3개 파일 국소 변경은 그냥 진행 (사후 보고)
- "전수 점검·일괄 수정" 류 요청은 발견 결과만 먼저 보고, 수정은 별도 승인 후
- 옵션이 여러 개일 땐 A/B/C 표로 트레이드오프 제시 — 사용자가 고르게 함

### 2. 파일 모듈화 — 한 파일에 다 넣지 말 것
- 한 파일이 **600줄 넘으면 분리 신호**. 새 기능 추가 시 기존 파일 비대화 의식적으로 막기
- 분리 기준:
  - **컴포넌트**: 탭·모달·카드 단위로 별도 파일 (예: `MatchVoteTab.tsx`, `MatchTacticsTab.tsx`)
  - **타입**: `*.types.ts` 별도 (예: `initialData.types.ts`)
  - **헬퍼·유틸**: 도메인 단위 `lib/<domain>/` 폴더 (예: `lib/positionRoles/`, `lib/server/`)
  - **상수·설정**: `lib/<domain>/config.ts` 또는 `*Constants.ts`
- 새 컴포넌트·헬퍼는 처음부터 적절한 위치에 만들기 — "일단 한 파일에 다 넣고 나중에 분리"는 거의 안 됨

### 3. 모호하면 추측 금지 — 확인 먼저
- 요청이 모호하거나 여러 해석 가능성이 있으면 **추측해서 진행하지 말고 사용자에게 짧게 확인**
- 특히 위험: 단어 의미가 모호("케페", "후속버전"), 대상이 명시 안 됨("그거 고쳐줘"), 범위가 불명확("정리해줘")
- 1~2개 가능성으로 좁혀지면 "A인가요 B인가요?" 형식으로 질문
- 코드 작성·파일 수정에 들어가기 전에 확인 — 작업 중간에 방향 틀면 롤백 비용 큼

### 4. 인프라 동작 영향 설정은 라인 수 무관 사전 확인 필수
- `next.config.ts`의 `redirects()`/`rewrites()`/`headers()`/`middleware`, `vercel.json`, `robots.ts`, `sitemap.ts` 등 **인프라/엣지 동작에 영향을 주는 설정**은 1줄 수정이라도 사전 확인
- 이 프로젝트 인프라: **Cloudflare DNS + Vercel 자동배포**
- **Cloudflare/Vercel이 이미 처리 중인 동작을 코드 단에서 중복 추가하면 무한루프 등 라이브 다운 위험** (실제 사례: 2026-04-28 next.config redirects www→non-www 추가 후 Vercel/Cloudflare 와 핑퐁 → ERR_TOO_MANY_REDIRECTS)
- 사전에 확인할 것:
  - 같은 동작이 Vercel 도메인 설정 / Cloudflare Page Rule / Cloudflare Workers / 다른 미들웨어에서 이미 처리되고 있는지
  - 의심되면 사용자에게 "Vercel/Cloudflare 단에서 X 처리되고 있나요?" 물어보고 진행
- 인프라 redirect는 인프라에서, 코드 redirect는 코드에서. 둘 다 만지면 충돌

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

---

## 멀티 컴퓨터 메모리 동기화

세션 메모리는 별도 **private repo** `sunnykim91/pitchmaster-memory` 로 관리됨.
- 위치: `~/.claude/projects/<슬러그>/memory/`
- 자동 동기화: `SessionEnd` 훅 → `scripts/sync-claude-memory.sh` (슬러그 동적 감지, dirty일 때만 commit+push)
- 새 컴퓨터 셋업 절차: [docs/MULTI_COMPUTER_SETUP.md](docs/MULTI_COMPUTER_SETUP.md)
- 세션 시작 전 다른 기기 변경 가져오려면 메모리 폴더에서 `git pull` 한 번
