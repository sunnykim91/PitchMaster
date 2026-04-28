---
title: 개선 백로그 — 미완료 (HIGH/MEDIUM/LOW)
summary: 우선순위별 미완료 항목 정리. HIGH=81팀 운영 직접 영향, MEDIUM=팀 50+ 시, LOW=팀 100+ 시
last_updated: 2026-04-28
related: [completed-recent.md, reviews.md]
---

# 미완료 백로그

우선순위 기준:
- **HIGH**: 현재 81팀 운영에 직접 영향
- **MEDIUM**: 팀 50개 이상 시
- **LOW**: 팀 100개 이상 시 / nice-to-have

## 🔴 최우선 — 즉시 처리 (2026-04-28)

### ~~PWA/앱 아이콘 모서리 흰 영역 제거~~ ✅ 완료 (1ac37cb, 34차)
- [x] scripts/fill-icon-bg.mjs로 icon-192·512·maskable-192·512 픽셀 변환 완료
- [ ] TWA AAB 재빌드 시점에 Android 적응형 아이콘도 같이 갱신 (아직 미완)

## HIGH — 33차 신규 추가 (2026-04-28) — 랜딩 추가 디자인

### Claude Design 추가 섹션 적용 (사용자가 한도 초기화 후 받아올 예정)

- [ ] **BeforeAfterSection** — Claude Design 결과물 수령 후 적용 (프롬프트 이미 제공, 차별점 강조 포함)
- [ ] **FinalCtaSection** — Claude Design 결과물 수령 후 적용
- [ ] **FaqSection** — 비주얼 업그레이드 (현재 텍스트 기반, 클로드 디자인 레이아웃으로 교체)
- [ ] **ComparisonSection** — 비주얼 강화
- [ ] **TestimonialsSection** — 실 사용자 후기로 교체 포함
- [ ] **MoreFeaturesSection** — 추가 기능 섹션 신설
- [ ] **FooterSection** — 리뉴얼

### .gitattributes LF 설정 추가 (선택 — Vercel 환경 sh 실행 안정성)
- [ ] `.gitattributes`에 `*.sh text eol=lf` 추가 — Windows CRLF/LF 경고 해소
- [ ] `scripts/vercel-ignore.sh` LF 확인 (현재는 동작 중이나 경고 잠재적)

### 카피·마케팅 톤 통일 (33차 카피 정정 결과 적용 확산)
- [ ] 카페 글·인스타 광고에서 "휴면·부상 자동 면제"·"AI 전술 감독" 강조 톤을 랜딩과 통일
- [ ] 아직 v1 카피인 나머지 섹션에 사실 기반 차별화 카피 반영 여부 검토 (특히 BeforeAfter·Comparison)

## HIGH — 34차 신규 추가 (2026-04-28)

### velog/블로그 게시 후속 작업
- [ ] velog 프로필 정비 (소개·링크 업데이트)
- [ ] GeekNews 제출 (1~2차 velog 글 기반)
- [ ] Threads 스레드 — 랜딩 v2 + velog 연동 게시

### 네이버 서치어드바이저 사이트맵 재제출 (사용자 수동)
- [ ] https://searchadvisor.naver.com/ 에서 www 제출 삭제 후 non-www(pitch-master.app) 로 재제출
- [ ] 완료 후 색인 상태 2~4주 후 확인

### CLAUDE.md 통계 수치 outdated 정정
- [ ] "82개 팀, 647+ 명" 고정 수치 제거 → "실사용자 통계는 Supabase 직접 조회" 안내로 대체
- [ ] 이후 외부 콘텐츠 생성 시 reference_pitchmaster_stats.md + 직접 조회 활용

## HIGH — 32차 신규 추가 (2026-04-28)

### Meta 비즈니스 제한 — 검토 대기 (2026-04-28 발생)
- [ ] **검토 결과 대기 중** (보통 1~7일, 대부분 1~3일)
- [ ] 비즈니스 ID: `1455008159692614` (피치마스터)
- [ ] 원인: redirect loop·로그인 재시도 반복으로 자동화 의심 분류 (사용자 잘못 X)
- [ ] **현재 광고 자동 정지 + Meta Pixel 설치 불가 + 환불 자동 처리 예정**
- [ ] **검토 기다리는 동안 절대 금지**: 페이스북·비즈니스 매니저 반복 로그인, 시크릿 창 우회, 다른 IP 시도 (검토 결과 악화)
- [ ] 검토 통과 시 → Meta Pixel 설치 작업 재개 (아래 항목)

### Meta Pixel 설치 (검토 통과 후 재개)
- [ ] 비즈니스 매니저 → 이벤트 관리자 → ➕ 데이터 연결 → 웹 → Meta Pixel → 수동 설치
- [ ] ⚠️ Vible(앱 데이터세트) 클릭 X / Shopify·파트너 통합 옵션 X
- [ ] Pixel ID 16자리 받으면 코드 작업 (5분):
  - `layout.tsx`에 `<Script>` 컴포넌트로 Meta Pixel base script 삽입 (`afterInteractive`)
  - `analytics.ts`에 `fbq()` 호출 추가 (PageView·Lead·CompleteRegistration)
- [ ] 참고: reference_meta_ads_setup.md

### ~~랜딩 개선 (1순위 A)~~ ✅ 33차에서 Hero·HowItWorks·Features v2 완료 (e4ba64c, f67fb28)
- 나머지 섹션(BeforeAfter·Faq·Comparison·Testimonials·Footer)은 33차 신규 추가 항목으로 이동

### 네이버 서치어드바이저 사이트맵 재제출 (사용자 수동)
- [ ] https://searchadvisor.naver.com/ 에서 www 제출 삭제
- [ ] non-www(pitch-master.app) 도메인으로 사이트맵 재제출

### UTM 파라미터 다음 광고에 적용
- [ ] 인스타 광고 링크에 `?utm_source=instagram&utm_medium=paid&utm_campaign=YYYYMMDD` 추가
- [ ] 카페 포스팅 링크에도 `?utm_source=naver_cafe&utm_medium=community` 적용

## HIGH — 31차 신규 추가 (2026-04-28)

### GA4 404 referrer 추적 + redirect 정비
- [ ] GA4 탐색 분석에서 404 페이지 유입 소스 확인 (세션 소스/매체 + 페이지 경로 필터)
- [ ] 오래된 외부 링크 → 실제 경로 redirect 추가 (`next.config.ts` redirects)
- [ ] 대상 후보: `/public/guide.html` 등 legacy 경로
- 배경: 이탈률 91.7% 페이지 GA4 보고서에서 발견. referrer 확인 후 조치 결정.

### 광고/SEO 백로그 (2026-04-28 신규)
**2순위 — 배포 대기 (사용자 직접 작업)**
- [ ] v1.0.2 AAB 재빌드 + Play Console Alpha 업로드 (웹 코드 `c14ea2d`)
- [ ] migration 00044 Supabase SQL Editor 수동 실행

**3순위 — 알려진 미구현 (CLAUDE.md)**
- [ ] 회비 선납 (6개월/1년) — UI·로직 모두 없음. 신규 기능 (3~5파일)
- [ ] 회원 벌크 CSV 등록 — 한 명씩만 가능. 중간 작업 (2~3파일)
- [ ] guide.html → Next.js 마이그레이션 — 883줄 정적 HTML 컴포넌트화 (장기)

**4순위 — 코드 품질**
- [ ] OCR 에러 이중 표시 (`setOcrStatus` + `showToast` 동시 발생) 정리
- [ ] 생일 confetti CSS pseudo-element 리팩토링 (현재 div 6개 하드코딩)
- [ ] 스크린샷 경로 통일 (`/screenshot/` vs `/screenshots/`)

**SEO 장기 — 광고 안정화 후**
- [ ] 랜딩 텍스트 SEO 키워드 보강 (HeroSection·FeaturesSection·FaqSection 등)
  - "조기축구 팀관리", "풋살 매니저 앱", "조기축구 회비 관리" 등 롱테일 키워드 자연스럽게 포함
  - h1/h2 구조 강화
- [ ] velog 1·2편 게시 + 카페 게시 (초안: docs/blog-post-1·2-draft.md, marketing-cafe-post.md)
- [ ] /login 콘텐츠를 / 로 통합 (현재 / 는 redirect만 — 색인 효율 떨어짐)

## HIGH — 30차 후반부 신규 추가 (2026-04-25)

### v1.0.3 빌드 + Alpha 업로드 (5/2~3 목표)
- [ ] 상대팀 전적 UI + 개인 출석 히트맵 포함 (코드 완료: `ac5f2aa`)
- [ ] TWA AAB 재빌드 (versionCode=7, versionName=1.0.3)
- [ ] Play Console Alpha 트랙 업로드

### 5/8 프로덕션 재신청
- [ ] 증빙 자료 준비: 테스터 수(12명+)·버전 이력(v1.0.1/1.0.2/1.0.3)·피드백 건수 정성 작성

### 인스타 광고 2차 사이클 개선
- [ ] 첫 3초 후킹 강화 (현재 시청률 23%, 목표 30%+)
- [ ] UTM 파라미터 적용 (`?utm_source=instagram&utm_medium=paid&utm_campaign=...`)

### 온보딩 가입 경로 1문항 추가
- [ ] "어디서 알게 됐나요?" (조기축구 카페 / 인스타 광고 / 지인 소개 / 구글 검색 / 기타)

## HIGH — 29차 신규 추가 (2026-04-24) — 일부 완료

### ~~v1.0.2 AAB 재빌드 + Play Console Alpha 업로드~~ ✅ 완료 (4/25 23:16)
- [x] TWA AAB 재빌드 versionCode=6, Play Console Alpha 업로드, 12명 테스터 자동 배포

### migration 00044 Supabase 적용 ← (구 00042, 번호 충돌로 리네임)
- [ ] `penalty_records` PARTIAL UNIQUE INDEX (match_id, rule_id, member_id)
- [ ] Supabase SQL Editor에서 수동 실행 필요
- 참고: `fdfed72` 에서 00042/43 → 00044/45 리네임 완료 (번호 충돌 해소)

## HIGH — 27차 신규 추가 (2026-04-23)

### Play Console 프로덕션 재신청 대응 (14일 테스트)

- [x] v1.0.1 AAB Alpha 업로드 (4/23)
- [x] v1.0.2 AAB Alpha 업로드 (4/25)
- [ ] 5/2~3 v1.0.3 릴리스 (코드 완료)
- [ ] 5/6~7 v1.0.4 최종 안정화
- [ ] 5/8 프로덕션 액세스 재신청 (증빙: 테스터 수·피드백 건수·버전 이력·정성 작성)

### 홍보 영상 제작 (12컷 스토리보드 기반)

- [ ] 영상화 파이프라인: Runway Gen-3 또는 Kling으로 각 컷 2.5초 렌더
- [ ] 내레이션: ElevenLabs 한국어 또는 자체 녹음
- [ ] BGM/SFX 적용 (문서 BGM 디렉션 참조)
- [ ] 30초 풀버전 + 15초 숏컷 + 썸네일 3종 파생물
- [ ] 배포 채널: 인스타 릴스·유튜브 쇼츠·플레이스토어 프리뷰·조기축구 페북/카페

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

## v1.0.3 이후 후보 (29차 숨은 자산 발굴 결과)

- [ ] **상대팀 전적 UI** — AI 내부 집계(`aiTeamStats`의 opponentHistory)가 이미 있음. UI만 없는 상태. 기록 페이지 또는 경기 상세 정보 탭에 표시
- [ ] **포메이션별 승률 UI** — 내부 집계 존재, UI 미노출. 기록 페이지 통계 탭 후보
- [ ] **개인 출석률 히트맵** — 월별 참석 패턴 시각화 (GitHub contribution 스타일)
- [ ] **AI 회비 독촉 문구 생성** — 총무 pain 직접 해소. TeamLinkt Emi 벤치마크. 미납자 목록 → Haiku로 문구 초안 생성
- [ ] **AI 경기 공지 초안 생성** — 경기 일정 정보 → 카카오 단체방용 공지 초안
