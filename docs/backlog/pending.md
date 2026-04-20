---
title: 개선 백로그 — 미완료 (HIGH/MEDIUM/LOW)
summary: 우선순위별 미완료 항목 정리. HIGH=81팀 운영 직접 영향, MEDIUM=팀 50+ 시, LOW=팀 100+ 시
last_updated: 2026-04-19
related: [completed-recent.md, reviews.md]
---

# 미완료 백로그

우선순위 기준:
- **HIGH**: 현재 81팀 운영에 직접 영향
- **MEDIUM**: 팀 50개 이상 시
- **LOW**: 팀 100개 이상 시 / nice-to-have

## 🔄 다음 세션 즉시 착수 (26차 작업 연속성)

### 역할 가이드 검증 (26차 배포 확인)
- [ ] **용병 카드 위치 동작 확인** — 배포 `24d2b31` 반영 후 테스트
  - 새 경기 진입 시 용병 카드 상단에 뜨는지 (사용자가 "맨밑에 있다" 보고, quarterCount 0/undefined 방어 후 재확인 필요)
  - 자동 편성 전체 완료 → 용병 카드 하단으로 이동 확인
  - 수동 배치 전부 완료 → 용병 카드 하단으로 이동 확인
  - 부분 배치·포메이션만 변경·심판만 지정 → 편성 미완료로 상단 유지되는지
  - 자체전(INTERNAL) A/B 편성 케이스 확인
- [ ] **역할 가이드 실전 테스트** — 회원/운영진 계정으로 FCMZ 등 실제 경기에서:
  - 회원 뷰: 본인 배치된 쿼터 카드만 뜨는지, 불참 시 메시지 정상인지
  - 운영진 뷰: 선수 드롭다운 정상 작동, 용병 제외됐는지
  - 쿼터별 다른 포메이션 (3-5-2 → 4-4-2 등) → 포메이션별로 다른 whyItMatters·linkage 나오는지
  - 같은 포메이션·같은 포지션 비연속 쿼터 → "2·4쿼터" 형태로 합쳐지는지
  - 전술판 미작성 + 운영진 진입 → 포메이션 폴백 가이드 정상인지

### 역할 가이드 콘텐츠 피드백 수집
- [ ] 실사용자(FCMZ 등 대표) 몇 명에게 카드 내용 검토 요청
  - 톤/용어가 친근한지, 이유 설명이 충분한지, 혼동되는 부분 없는지
- [ ] 피드백 반영해 base/override 튜닝 (필요 시)

### AI 기능 품질 스윕 (25차에서 연기됨)
- [ ] **4/13 FCMZ vs 올챙이FC 경기 후기 재생성 검증**
  - Vercel 배포(07107ca 이후) 확인 → 경기 상세 → 일지 탭 → 재생성 버튼
  - 스코어 6-2 정확히 반영되는지, 용병 이름(지두찬/박상혁) 포함되는지, MOM 최일훈·고건우 언급되는지
  - 환각 없는지 (있는 정보만 서술)
- [ ] **다른 AI 기능 순차 점검**
  1. **AI 코치 분석** (`aiTacticsAnalysis.ts`) — 전술 탭 활성화 시 품질 샘플 확인
  2. **AI Full Plan** (자동편성) — `formationAI.ts` 관련 — 품질·맥락 검증
  3. **OCR 회비 파싱** (`api/ocr/route.ts`, Clova + Claude) — 인식 정확도 체크

### 경기 후기 관련 후속 작업
- [ ] 경기 후기에도 **레이트리밋 v2** 동일 적용 확인 (경기당 1회 + 팀당 월 10회)
- [ ] 프롬프트 튜닝 후 5~10개 경기로 품질 재평가

### AI 시그니처 전환 후속
- [ ] 룰 기반 50개 패턴 실사용자 반응 수집 (FCMZ·시즌FC 등)
- [ ] 사용자 제시 패턴을 풀에 심기 (`playerCardUtils.ts generateSignature`)

### 다음 세션 유의사항
- `scorer_id` / `assist_id` / `candidate_id`는 **users.id + team_members.id + match_guests.id 세 소스** 중 하나
- AI 기능 점검 시 **실제 DB 샘플 조회**가 핵심
- 전술판 이벤트 동기화는 `window.dispatchEvent(new CustomEvent('match-squads-saved', { detail: { matchId } }))` 규약
- 용병 카드 위치 판단은 `isFormationComplete` computed (state 아님). 수정 시 `MatchTacticsTab.tsx` 해당 memo 확인

## HIGH

### RLS 근본 방어 + Supabase 커스텀 JWT (별도 스프린트, 2~3일)

- [ ] **RLS Policy 전면 작성 + 카카오 세션 → Supabase JWT 발급 시스템**
  - 현재 상태: 모든 테이블 RLS enabled 이나 Policy 0개. `anon key` 가 클라이언트에 노출되어 이론상 curl 로 전체 DB 스크래핑 가능
  - Realtime 실시간 동기화(match_attendance·match_goals·match_mvp_votes) 가 anon key 로 구독되고 있어 단순 비활성화 불가
  - 26차 진단 시 W2#6 로 논의됐으나 작업량(2~3일) 초과로 별도 스프린트로 분리
  - 설계 방향:
    1. 카카오 로그인 성공 시 Supabase 커스텀 JWT 발급 (SUPABASE_JWT_SECRET 으로 서명)
    2. 클라이언트에서 Supabase client 초기화 시 이 JWT 를 헤더로
    3. RLS Policy: `auth.uid()` 기반 본인 팀 데이터만 SELECT 허용
    4. Realtime 구독도 이 JWT 로 인증 → 필터 조작해도 본인 팀 아니면 구독 실패
  - 중간 완화안(사용 안 함): write 차단 Policy 만 추가(10분) — "읽기는 뚫림" 상태 남아 실효 약함
  - 트리거: 마케팅 이후 사용자 증가 + 잠재 공격 표면 커지면 즉시 착수

### API Rate Limiting (보류 — 사고 시 3일 내 도입 가능)

- [ ] **일반 API 레이트리밋 도입**
  - 현재: AI 라우트만 `checkRateLimit` 적용. `/api/auth/*` `/api/posts` `/api/comments` `/api/dues` 등 무방어
  - 리스크: brute force 로그인, 스팸 스크립트, Vercel CPU 한도 소진(Pro 100h) 통한 과금
  - 26차 진단 시 W1에서 "당장 CRITICAL은 아님"으로 판단해 보류 (82팀 규모, 악의적 자동화 공격 경험 없음)
  - 도입 시 권장 구성: **Upstash Redis 무료 티어** + `@upstash/ratelimit` `slidingWindow`
    - `/api/auth/*` : 5분 10회 (brute force 방어)
    - 그 외 `/api/*` : 1분 60회
    - `/api/cron/*` : Bearer 인증 있으므로 제외
  - 트리거: 마케팅 이후 봇 트래픽 관측되면 즉시 도입. 3일이면 완료 가능.

### W3 — 마케팅 유입 폭증 대비 (26차 진단 기반, 2026-04-19)

W1(보안)·W2(운영 안전망) 완료 후 순차 착수.

- [ ] **경기 상세 SSR AI 블로킹 해소**
  - 현재: `src/lib/server/getMatchDetailData.ts:82-109`에서 `getOrComputeTeamStats()` await
  - 신규팀·캐시 미스 시 LCP +2~3초
  - 조치: AI 팀스탯 계산을 경기 후기 API route로 이동 (SSR 언블록)
- [ ] **탭별 중복 fetch 통합**
  - 현재: `MatchTacticsTab`의 `/api/squads`, `MatchInfoTab`의 `/api/weather` 등 탭마다 독립 fetch
  - 경기 상세 상위에서 공통 데이터 fetch 후 props 주입
- [ ] **ClientLayout 60초 폴링 visibilityState 게이트**
  - 현재: `/api/notifications` 항상 폴링 (탭 비활성이어도)
  - 조치: `document.visibilityState === 'visible'` 일 때만 폴링
- [ ] **신규가입자 팀 선택 경로 CTA 개선**
  - 현재: 초대 없이 자체 가입 시 "팀 만들기" 버튼 눈에 안 띔
  - 조치: `/team` 페이지에 "이미 팀이 있으신가요?" vs "새로 팀 만들기" 2-column 명확 분기
- [ ] **탭 내부 로딩 상태 통일**
  - 현재: 탭 전환 시 데이터 로드 중 아무 표시 없음
  - 조치: 각 탭 Skeleton 또는 최소 스피너 패턴 표준화

### 19차 보류(출시 후 첫 패치용)
- [ ] **옵티미스틱 업데이트 롤백 패턴 도입** — MatchRecordTab/DuesRecordsTab 외 다른 곳에도 실패 시 rollback 적용 (현재는 pessimistic이라 당장 치명적이지 않음)
- [ ] **MVP 후보자 팀 소속 검증** — POST /api/mvp에서 candidateId가 team_members에 속하는지 추가 검증 (UI에서 이미 필터링되지만 방어 심화)
- [ ] **모바일 터치 타겟 44px** — MatchVoteTab 대리 투표/마감·재개 버튼 등 < 44px 높이 보정
- [ ] **긴 텍스트 UI 넘침** — 멤버 이름 20자+/장소 긴 주소/게시글 제목 200자에 `truncate` 일괄 적용
- [ ] **포지션 약자 설명** — GK/CB/CDM/FIXO/ALA/PIVO 첫 진입 시 튜토리얼 또는 long-press 툴팁
- [ ] **댓글 Enter 자동 제출** — Shift+Enter 개행 + Enter 제출
- [ ] **드롭다운 키보드 네비게이션** — MatchesClient 장소 자동완성 화살표 키/Enter 선택
- [ ] **유니폼 색상 다크모드 대비** — 밝은 색 유니폼 border 자동 추가
- [ ] **매우 큰 금액·매우 과거 날짜 경고** — 회비 1억+ / 경기 5년 전 등록 시 확인 모달
- [ ] **경기 삭제 버튼 접기** — "위험한 작업" 섹션에 숨겨 오터치 방지
- [ ] **ClientLayout fetchNotifications deps 안정화** — 유지보수 위험 예방
- [ ] **useApi AbortController 패턴 강화**
- [ ] **DB CASCADE 정책 검토** — users 삭제 시 goals/posts orphan 처리 확인
- [ ] **파일 업로드 스토리지 쿼터 모니터링** — 팀별 쿼터 + 오래된 파일 자동 정리
- [ ] **RLS Policy 활성화 검토** — 현재 서비스 롤로 전부 접근 중, 직접 SQL 노출 방어

### 운영/마케팅
- [ ] 중복/테스트 팀 정리 (골드문FC/골드문, fc_libre/FC.LIBRE) **[수동 SQL]**
- [ ] 활성 팀 CS 대응 — 피드백 수집 **[수동]**
- [ ] 실제 사용자 후기로 소셜프루프 교체 (실명 + 팀명) **[수동+개발]**
- [ ] 회비 선납 기능 (6개월/1년치 일괄 납부 처리)

### 킬러 기능 v2 UI wiring
- [ ] 선수 카드 디자인 개선 (FIFA 스타일) — **백엔드 v2 완료** (JSON variant, rarity/signature/rank/streak/isHero). v0 컴포넌트 `v0card/` 에 이식, 실제 페이지 wiring 남음
- [ ] 시즌 어워드 디자인 개선 (7종 시상) — **백엔드 v2 완료** (mvp/seasonSummary/context). v0 컴포넌트 이식 + 노출 경로 결정 남음
- [ ] 개인 커리어 프로필 디자인 개선 (/player/[id] 공개 페이지) — **백엔드 v2 완료** (bestMoments/ranks/streaks). v0 디자인 wiring 남음

## MEDIUM

### 기능
- [ ] Play Store 등록 (TWA, $25) **[추후 과제]**
- [ ] 회원 벌크 사전등록 (CSV/다중 입력)
- [ ] 회비 월별 수지결산 대시보드 (수입/지출/잔고 추이)
- [ ] 회비 납부 현황 통계 (월별 납부율, 장기 미납자)
- [ ] 회비 납부 현황 통계 차트 (월별 납부율 추이)
- [ ] 전적 전체 기록 모바일 카드 정보 밀도 축소 (기본 2항목 + 탭 확장)

### 마케팅/SEO
- [ ] guide.html → Next.js 라우트 마이그레이션
- [ ] GA4 커스텀 이벤트 확장 (데모 전환율, 가입 퍼널)

### 캘린더
- [ ] 한국 공휴일 표시 (하드코딩 또는 API, 날짜 코랄/빨강 강조)

### 풋살 특화
- [ ] 쿼터 라벨 개선 ("1Q" → "전반/후반" 옵션)

### 포메이션 확장 (2026-04-10 옵션A 완료 후 남은 작업)
- [ ] 풋살 추가 포메이션 3종 (5인 2-2, 6인 3-2, 7인 3-3)
- [ ] 축구 인원별 포메이션 카테고리 신설 (6인/7인/8인/9인 조기축구)
  - `FormationTemplate.fieldCount`를 축구에도 적용
  - 경기 등록 시 인원수 선택 → 포메이션 필터
  - 자동 포메이션(AutoFormationBuilder)도 인원별 지원
  - 후보:
    - 6인(GK+5): 2-2-1, 1-3-1, 1-2-2
    - 7인(GK+6): 2-3-1, 3-2-1, 2-2-2
    - 8인(GK+7): 3-3-1, 2-3-2, 3-2-2
    - 9인(GK+8): 3-3-2, 3-4-1, 4-3-1

## LOW

- [ ] 게시판 페이지네이션/무한스크롤
- [ ] 개별 선수 상세 통계 페이지
- [ ] 벌금 관리 별도 페이지
- [ ] 데모 데이터 일일 자동 리셋 (Vercel Cron)
- [ ] 프리미엄 모델 설계
- [ ] 바이럴 공유 메커니즘 (결과 카드 워터마크)
- [ ] 다른 스포츠 확장 (농구, 배구)
- [ ] 실력 기반 자체전 팀 분배 (레이팅)
- [ ] 출석률 기반 자동 휴면 전환
