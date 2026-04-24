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

## MVP 집계 정책 (2026-04-23 기준)

**확정 조건** (둘 중 하나):
1. 운영진(STAFF+) 1명 이상이 해당 경기에 투표 → 즉시 확정 (투표율 무관)
2. 일반 팀원 투표가 실제 참석자(`attendance_status=PRESENT|LATE`) 70% 이상 → 최다득표자 확정

**구현 헬퍼** (`src/lib/mvpThreshold.ts`):
- `resolveValidMvp(votes, attendedCount, staffDecision)` — 정책 판정
- `pickStaffDecision(rows, staffVoterIds)` — `is_staff_decision=true` OR 현재 STAFF+ voter 투표를 확정 후보로 리턴. 2026-04-20(커밋 `2d457b8`) 이전에 저장된 staff 투표가 `false`로 남아있는 백필 누락을 동적 치유.

**집계 경로 9곳** — 하나 수정 시 전부 같이 건드려야 일관성 유지:
- SSR: `src/lib/server/getRecordsData.ts`, `src/lib/server/getDashboardData.ts`
- API: `src/app/api/records/route.ts`, `src/app/api/records/detail/route.ts` (`type=mvp`), `src/app/api/season-awards/route.ts`, `src/app/api/player-card/route.ts`, `src/app/api/share-card/route.ts`
- AI 캐시: `src/lib/server/aiTeamStats.ts` (24h TTL)
- 실시간 UI: `MatchRecordTab.tsx`의 "현재 1위" 표시는 확정 정책과 별개 (건드리지 말 것)

**설정 토글**: 팀 설정 `mvp_vote_staff_only` — 일반 팀원 투표를 막는 게이트. 운영진이 투표할 땐 **자동으로 `is_staff_decision=true`** 저장되므로, 토글 OFF 상태에서도 운영진 투표는 즉시 확정됨.

**UI 안내**: MVP 투표 카드에 threshold 미달 시 "참석자 70% 이상이 투표해야 공식 MVP로 확정됩니다. 미달 시 운영진이 직접 지정할 수 있어요." 문구 자동 노출.

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

### AI 코치 분석 데이터 파이프라인 (2026-04-19 갱신)

```
MatchTacticsTab
  ├─ AutoFormationBuilder → onAnalysisContextReady(ctx)   (자동 편성 경로)
  └─ /api/squads + attendingPlayers + formationTemplates
       → dbAiCoachContext                                 (DB fallback — 수동 편집·기존 기록)
     effectiveAiCoachContext = autoCtx ?? dbCtx
  → AiCoachAnalysisCard
       - match-squads-saved 이벤트 구독 → refetch로 실시간 갱신
  → POST /api/ai/tactics
       payload에 사전 계산 5종 자동 포함 (aiTacticsAnalysis.ts 헬퍼):
         - playerRotation      선수별 [{quarter, slot}]
         - positionChangers    쿼터 간 포지션 바뀐 선수 (서술 의무)
         - slotSharing         같은 slot을 여러 명이 쿼터 나눠 맡는 경우만
         - quarterBreakdown    쿼터별 {GK,DEF,MID,FWD} 인원
         - benchPlayers        미배치 참석자
  → generateAiTacticsAnalysisStream()
       historyBlock = getOrComputeTeamStats(teamId) → buildHistoryBlock()
         - 포메이션별 전적
         - 선수별 커리어 Top 20
         - 포지션별 활약 Top 10
         - 쿼터별 득실 (누적 + 경기당 평균)
         - 최근 3경기 요약 (폼 상태)
         - 상대팀 이력
```

### TeamStats 캐시 (`ai_team_stats_cache`, TTL 24h)
- `playerCareerStats`: 출전수/골/어시/MVP/주포지션
- `quarterStats`: 쿼터별 누적 득실 + 경기당 평균
- `recentMatchSummaries`: 최근 3경기 (상대/스코어/결과/포메이션/최다득점자)
- MVP 집계: `match_mvp_votes.candidate_id`(users.id) → team_members.id 브릿지 → 경기별 최다득표 winner

### 사용량 로그 (`ai_usage_log`)
- 컬럼: feature / user_id / team_id / **match_id** / entity_id / source / model / tokens / latency / error_reason
- `source`: `"ai"` | `"rule"` | `"error"`. **`"ai"`만 `checkRateLimit` 집계** → 실패·룰 폴백은 한도 차감 안 됨
- 캡: 경기당 1회 (match_id 기준) + 팀 월 10회 (tactics)
- logBase에 `matchId` 세팅은 aiTactics·aiMatchSummary·aiFullPlan 3곳 공통

### 시스템 프롬프트 핵심 규칙 (aiTacticsAnalysis.ts)
- **포메이션 이름 hallucination 금지** — `formationName`/`quarterFormations` 값 그대로만 사용. placement 숫자 집계로 "4-6-0" 같은 창작 금지 (규칙 0)
- 선수 역할은 **playerRotation 전체**의 slot 기준 (1쿼터 placement만으로 고정 서술 금지)
- `positionChangers`에 있는 선수는 쿼터 간 변화 **반드시** 서술 (예: "1쿼터 DM → 2쿼터 ST")
- `slotSharing`의 같은 slot을 여럿이 나눠 맡으면 **전원 언급**
- 용병(`isGuest=true`)에 단정적 표현 금지
- 상대팀 이력 블록 없으면 hallucination 금지, "첫 대결"로 명시
- `playerWorkload`에서 전 쿼터 출전 선수 → 3단락 체력 부담 언급 필수
- 쿼터별 득실 패턴(3쿼터 실점 집중 등) → 해당 쿼터 주의점으로 반영

### dbAiCoachContext allSlotsFilled 계산 규칙 (2026-04-24 버그 수정)

`MatchTacticsTab.tsx` `dbAiCoachContext` useMemo 내 슬롯 카운팅:
- **playerId 존재 여부만으로 카운트** — `nameMap`(attendingPlayers+guests)에 없어도 포함
- 수정 전: `if (!playerName) continue;` → 참석 취소 선수 슬롯 카운트 누락 → `allSlotsFilled=false` → 버튼 비활성
- 수정 후: `nameMap.get(playerId) ?? \`선수(${playerId.slice(0,6)})\`` — DB 배치 기록 있으면 무조건 카운트
- ⚠️ 이 규칙 절대 원상복구 금지: nameMap 기반으로 되돌리면 앱 재진입 후 버튼 비활성 버그 재발

### AI UI 공통 컴포넌트 (2026-04-19 신규)
- `src/components/AiBadge.tsx` — variant: `ai`/`rule`/`loading`/`error`, size: `sm`/`md`
- 박스 안에 variant별 아이콘(Sparkles/Cog/Loader2/AlertCircle) + 축약 라벨("AI"/"룰"/"생성중"/"실패")
- 1차 적용: AiCoachAnalysisCard. 순차 적용 대기: 경기 후기·AI Full Plan·선수 시그니처·OCR

### 미해결 성능 이슈 (2026-04-19)
- `src/lib/server/getMatchDetailData.ts:82-109` — 경기 상세 SSR에서 `enableAi=true` + 후기 캐시 없는 경기마다 `getOrComputeTeamStats()` await 블로킹
- 후기 생성 API route로 이동 필요 (SSR 언블록). 사용자 승인 대기

---

## 역할 가이드 (2026-04-19 신규)

경기 전술 탭에서 쿼터별 본인 포지션의 역할·주의점을 보여주는 결정론적 지식 베이스.

- **파일**: `src/lib/positionRoles/` (types · base 24 포지션 · override 10 포메이션 · merge 유틸)
- **UI**: `src/components/MatchRoleGuide.tsx`
- **지원**: 축구 11인제 10 포메이션만 (풋살·8/9/10인제는 조용히 미노출)
- **구조**: base(포메이션 무관 공통) + override(포메이션별 whyItMatters·linkage) 병합
- **권한별 뷰**:
  - MEMBER — 본인만. 불참 시 안내. 전술판 미작성이면 섹션 숨김
  - PRESIDENT/STAFF — 드롭다운(용병 제외)으로 다른 선수 가능. 전술판 미작성이면 포메이션 폴백
- **쿼터 그룹화**: 같은 (formationId, role)이면 비연속 쿼터도 한 카드 ("2·4쿼터 RCB"). 포메이션 다르면 별도 카드
- **동기화**: `match-squads-saved` window CustomEvent — TacticsBoard/AutoFormationBuilder 저장 시 발행 → MatchRoleGuide·MatchTacticsTab이 구독해 refetch

---

## 전술 탭 카드 순서 (2026-04-19 재정비)

카드 순서 프리셋 드롭다운 제거 + 고정 `order` 기반 배치. 상세는 [src/app/(app)/matches/CLAUDE.md](src/app/(app)/matches/CLAUDE.md) 참고.

- 용병 카드는 **편성 완료 여부**에 따라 동적 이동 (-5 상단 / 95 하단)
- "편성 완료" = 매 쿼터마다 정규 슬롯 전부 채워진 squad 존재 (심판/촬영 제외, `match_squads`에 DB 영속 기준)

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
