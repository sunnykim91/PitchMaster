---
title: 개선 백로그 — 최근 완료 (16~33차)
summary: 2026-04-11~28 진행된 AI 도입 Phase 0/1/2/3, 출시 직전 보안·UX 스윕, v0 카드 UI 이식, 커리어 프로필 v0 완성, 골 기록 UX 개선, AI 코치 고도화, 축구 8/9/10:10 지원, 시그니처 룰 전환, 경기 후기 환각 수정, 역할 가이드 + 전술 탭 재정비, Supabase Advisor 전건 해소 + TWA v1.0.1 빌드, 실사용자 CS 5건 대응 + MVP 집계 백필 버그 치유, 투표 마감 UX + API 서버 가드 + 팀 앨범 + 월별 결산 + 게시판 통합, 역할 가이드 푸시 + 자동편성 버그 수정 + AI 코치 버튼 비활성 버그 수정, 라이트 모드 대비 + OCR Vision 전환 + 역할 가이드 ID 매칭 + GA page_view 수정, 광고 ROI 측정 + SEO 안정화 + OCR UX 정리, 랜딩 v2 디자인 통합 + 차별화 카피 정정 + .gitignore 정리
sections: [33차 랜딩 v2 디자인·카피 정정, 32차 광고 ROI·SEO·OCR UX, 31차 라이트 모드 대비·OCR·역할 가이드·GA 수정, 30차 자동편성 버그 수정 + AI 코치 버튼 수정, 29차 투표 마감 UX + 서버 가드 + v1.0.2 기능, 28차 실사용자 CS 대응 + MVP 집계 통일, 27차 Supabase Advisor 해소 + TWA v1.0.1 빌드, 26차 역할 가이드 + 전술 탭 재정비, 25차 AI 시그니처 룰 전환 + 경기 후기 환각 수정, 24차 AI 코치 고도화, 23차 골 기록 UX, 21차 AI Phase 0+1+2+3, 20차 커리어 프로필 v0, 19차 출시 직전 QA, 18차 보안 스윕, 17차 v0 카드 이식, 16차 전술판 매칭·킬러 백엔드]
last_updated: 2026-04-28
related: [completed-archive.md, pending.md]
---

# 최근 완료 (16~33차)

## 34차 (2026-04-28) — SEO 안정화 + GA4 이벤트 완성 + PWA 아이콘 픽셀 수정 + 마케팅 분석

**커밋 7개, 모두 main 푸시 완료**

**SEO 인프라 (225187a, 963b725, b58ea4b, 9dba6d9)**
- [x] robots.ts 인증 영역 disallow 적용 (/dashboard·/matches 등) — `225187a`
- [x] www→non-www redirect 코드 추가 → ERR_TOO_MANY_REDIRECTS 라이브 다운 → `963b725` revert
- [x] CLAUDE.md 협업 규칙 4번 추가 (인프라 영향 설정 사전 확인) — `b58ea4b`
- [x] canonical 4페이지(/login·/privacy·/terms·/guide) 명시 — `9dba6d9`

**GA4 이벤트 퍼널 완성 (10bd479)**
- [x] dead 이벤트 4종 발화 추가: team_join·onboarding_complete·push_toggle·pwa_install

**OCR UX 이중 표시 제거 (37f4fb2)**
- [x] setOcrStatus + showToast 페어 → ocrStatus 영역 단일 노출으로 통일

**PWA 아이콘 모서리 흰 여백 제거 (1ac37cb)**
- [x] PNG 모서리 픽셀이 alpha 투명이 아닌 RGB 흰색임을 사전 분석으로 확인
- [x] scripts/fill-icon-bg.mjs 신규 작성 — pixel 배열 순회로 #0a0c10 직접 교체
- [x] icon-192·512·maskable-192·512 4개 모두 적용

**분석 (코드 변경 없음)**
- GA4 1차 광고 분석: ₩172/프로필방문, 3초재생 23%(미달), 5팀 가입 ₩1,517/팀
- Search Console 색인 4개 원인 파악 (www/non-www 분산 + robots 미적용)
- 네이버 서치어드바이저 색인 0개 — www 도메인으로 잘못 제출, non-www 재제출 필요
- Meta Pixel 설치 시도 → 비즈니스 제한 발생 (자동화 의심), 검토 대기
- velog 블로그 1·2·3편 톤 재작성 (89팀 706명 수치 반영)

**삽질·반성**
- www→non-www redirect 코드 1줄 추가 → 라이브 전체 다운 (Vercel+Cloudflare 핑퐁)
  → 인프라 영향 설정은 반드시 사전 확인 (CLAUDE.md 협업 규칙 4번 박제)
- PNG flatten 만으로 흰 여백 제거 시도 → 무효. corner pixel 분석 후 픽셀 순회 방식으로 재작업
  → 이미지 처리 전 픽셀 타입 사전 분석 필수 (feedback_image_processing_verify.md 신규)
- CLAUDE.md "82팀 647명" 수치를 블로그 초안에 인용 → 실제 89팀 706명으로 정정 필요
  → 외부 콘텐츠 생성 전 Supabase 직접 조회로 최신 수치 확인 (reference_pitchmaster_stats.md 신규)
- Meta UI 옛 메뉴명("Pixel") 안내로 사용자 헤맴 → 최신 UI는 "데이터세트"로 통합됨

## 33차 (2026-04-28) — 랜딩 페이지 v2 디자인 통합 + 차별화 카피 정정 + .gitignore 정리

**커밋 6개, 모두 main 푸시 완료**

**Hero·Sticky Header v2 (e4ba64c)**
- [x] `framer-motion@11` 신규 도입
- [x] HeroSection 전면 교체 — 5년차 회장 정체성, 프리미엄 모션, 스크롤 parallax
- [x] SiteHeader(Sticky) 신규 — 스크롤 감지 배경/그림자 전환, CTA 버튼 포함
- 1000+ insertions

**HowItWorks·Features v2 + 차별화 카피 정정 (f67fb28)**
- [x] HowItWorksSection 통째 교체
- [x] FeaturesSection 합본 신규 베이스 — 실 PlayerCard·TacticsBoard 데모 보존
- [x] ComparisonSection·FaqSection·BeforeAfterSection 카피 보강
- [x] 차별화 카피 사실 기반 정정:
  - 참석투표: "링크 1개로 다음 6경기까지 한 번에 응답" (이전: "이름·전화번호 없이" — 사실 아님)
  - 회비정산: "휴면·부상 회원 자동 면제" 강조 (타 앱 없는 unique 기능)
  - AI 편성: "또 하나의 전술 감독 AI" 톤 강화
- 1668 insertions

**5년차 회장 정체성 + 차별화 강화 (3aa6478)**
- [x] 4개 파일 텍스트 패치 — 회장 시점 공감 카피 도입

**.gitignore 정리 (f2773ff)**
- [x] `.serena/`, `.agents/skills/`, `.claude/skills/`, `.claude/worktrees/` 도구 메타 ignore
- [x] `public/cardscreenshot/`, `duelsscreenshot/`, `newscreenshot/` 작업 캡처 ignore
- [x] `v0card/`, `scripts/fix-*.mjs`, `scripts/run-migration-*.mjs` ignore
- [x] 마케팅 docs 13개·시드 3개·demo-cards 페이지는 신규 커밋으로 보존

**Vercel ignoreCommand 추가 (a12efbc, b90b466)**
- [x] `deploymentEnabled: true` + `ignoreCommand` 설정
- [x] 256자 제한으로 `scripts/vercel-ignore.sh` 분리 후 `bash scripts/vercel-ignore.sh` 호출

**삽질·반성**
- 전술판 jersey 정렬: "SVG 수학적 대칭" 반박 3회 반복 → 사용자 짜증. 결국 좌표 보정 -3% ~ -5%로 해결
  - 교훈: 사용자 시각 판단에 수학 논리 반박 금지. 즉시 보정 후 검증 요청
- Jersey 매칭 표시: 실 코드 grep 없이 즉흥 디자인 반복 → 나중에 TacticsBoard.tsx grep 후 정상 구현
  - 교훈: 실 서비스 복제 목표라면 처음부터 grep
- AI 전술 카드 이미지: "실 스크린샷 신뢰감" 판단으로 교체 추천 → 카드 균형 깨짐 → SVG 복귀
  - 교훈: 스크린샷 vs SVG는 비주얼 균형·크기 같이 판단
- vercel.json ignoreCommand 256자 제한 사전 미검증 → Vercel 스키마 에러 → 스크립트 분리로 수정
- Cloudflare redirect rule 확인 안내: 메뉴 경로 불충분 → 사용자 재질문 → 구체 경로 명시 후 해결

## 32차 (2026-04-28) — 광고 ROI 측정 이벤트 완성 + SEO 안정화 + OCR UX 정리

**SEO 인프라 안정화**
- [x] robots.ts 인증 영역(/dashboard, /matches 등) disallow 적용 — `225187a`
- [x] canonical 페이지별 명시(/login·/privacy·/terms·/guide) — `9dba6d9`
- [x] CLAUDE.md 협업 규칙 4번 추가(인프라 영향 설정 사전 확인) — `b58ea4b`

**사고: www→non-www redirect 라이브 다운**
- `225187a`에서 next.config redirects()에 www→non-www 1줄 추가 → Vercel/Cloudflare 핑퐁 → ERR_TOO_MANY_REDIRECTS 전체 다운
- `963b725`로 즉시 revert 복구
- 교훈: Vercel+Cloudflare 환경에서 인프라 처리 여부 미확인하고 코드 추가 금지

**GA4 이벤트 완성 (analytics.ts 13개 전부 호출 박힘)**
- [x] team_join / onboarding_complete / push_toggle / pwa_install 4종 추가 — `10bd479`

**OCR UX 알림 이중 표시 제거**
- [x] setOcrStatus + showToast 페어 → ocrStatus 영역 단일 노출으로 통일 — `37f4fb2`

**분석(코드 변경 없음)**
- GA4 화면 해석: (not set) 소스 원인 = App Router SPA 구조 + send_page_view 미비활성 (31차에서 수정됨)
- Search Console: 색인 4개 → www/non-www 분산 + 인증 영역 크롤 원인. robots.ts 수정으로 개선 예상
- 네이버 서치어드바이저: 색인 0개 → www 도메인으로 잘못 제출. non-www 재제출 필요(사용자 수동)
- Meta Ads 1차 캠페인 분석: ₩172/프로필 방문(효율적), 3초 재생률 23%(미달), 5팀 가입 ₩1,517/팀
- Meta Pixel 설치 시도: 페이스북 로그인 redirect 차단 이슈로 보류 → 다음 광고 사이클 전 재시도

**삽질·보류**
- www→non-www redirect 코드 추가 → 라이브 다운 (상세: feedback_infra_redirect_risk.md)
- Meta Pixel 설치 — UI가 "픽셀" 대신 "데이터세트"로 변경되어 경로 혼동 + 페이스북 로그인 차단으로 보류

## 31차 (2026-04-28) — 라이트 모드 대비 + OCR Vision 전환 + 역할 가이드 ID 매칭 + GA page_view 수정

**라이트 모드 색상 대비 (접근성)**
- [x] 전술판 미매칭 이름 셀: `bg-black/70` 위 텍스트를 `text-foreground` → `text-white`로 수정 — `ffdc7c6`
- [x] 심판/촬영 라벨, AutoFormationBuilder POS_COLOR 13개, GK 칩/인디케이터 총 17곳: `text-{color}-400` → `text-{color}-700 dark:text-{color}-400` — `1b49ee8`

**삽질:** 1차 수정 후 커밋만 하고 푸시 안 해 사용자가 라이브에서 변화를 못 봄. 동일 피드백 두 번 수신 후 푸시.

**OCR 회비 일괄 등록 (DuesBulkTab.tsx)**
- [x] AI Haiku Vision을 메인 경로로 전환, Clova는 폴백 — `b282ba3`
- [x] `time_missing` 단독은 정상 분류, 잔고는 첫 번째(최신) 사용, 중복 체크는 description 첫 단어(이름) 기준으로 완화 — `7bf9e72`

**역할 가이드 ID 매핑 수정 (MatchRoleGuide.tsx)**
- [x] `AttendingPlayer`에 `userId?` / `memberId?` 양쪽 보존 — `b918d1a`
- [x] `currentMemberAttended`: attendance status OR vote=ATTEND 중 하나면 참석으로 인정 — `2da84c0`

**GA4 App Router page_view 수정 (GAPageTracker.tsx 신규)**
- [x] `gtag config`의 `send_page_view: false` + `GAPageTracker`(usePathname 변화 감지) 직접 발화 — `2a1265c`
- [x] GA4 보고서 (not set) 소스 원인 해소

**CLAUDE.md 협업 규칙 추가**
- [x] 큰 변경 사전 확인, 모듈화 원칙, 모호하면 확인 3종 추가 — `d632232`

## 30차 후반부 (2026-04-25) — v1.0.2 AAB 업로드 + 푸시 인프라 + v1.0.3 코드 사전 + 광고 분석

**선수 프로필 주발 표시** (커밋 `1ff3dde`)
- [x] /player/[memberId] 쿼리에 preferred_foot 추가, 히어로 subtitle 에 "오른발/왼발/양발" 표시

**MVP 푸시 + OVR 변동 알림 인프라** (커밋 `131308c` → `c5731a6` → `4e17874`)
- [x] migration 00045: matches.mvp_push_sent_at + team_members.last_ovr (백필 포함)
- [x] processMatchCompletedPush.ts / computeSeasonOvr.ts / /api/cron/match-completed-push
- [x] autoCompleteTeamMatches 즉시 트리거 + vercel.json cron 등록

**역할 가이드 푸시** (커밋 `255733b`)
- [x] migration 00046: matches.role_guide_push_sent_at + 백필
- [x] processRoleGuidePush.ts: vote_deadline 후 ATTEND 투표자별 개인 푸시 ("2쿼터 RCB" 구체)
- [x] 랜딩 FeaturesSection 역할 가이드 스포트라이트 신설

**마이그레이션 번호 충돌 수정** (커밋 `fdfed72`)
- [x] 00042/43 → 00044/45 리네임 (번호 충돌 수습)

**v1.0.2 TWA AAB + Play Console 업로드** (사용자 수동)
- [x] versionCode=6, versionName=1.0.2, Play Console Alpha 업로드 (4/25 23:16), 12명 테스터 자동 배포

**v1.0.3 코드 사전 완료** (커밋 `ac5f2aa`)
- [x] /api/team-stats/opponent + OpponentHistoryCard.tsx (경기 상세 정보 탭)
- [x] AttendanceHeatmap 컴포넌트 (15셀, 색상 4종)

**카페 3편 + 인스타 광고 효과 분석**
- [x] 카페 3편 작성 (AI 코칭 포함 재수정), 4/27~28 신규 5팀 가입 확인 (₩1,517/팀)

**사고 기록**
- mvp_push_sent_at 백필 누락 → 과거 경기 전체 푸시 폭탄 → 긴급 수습 (feedback_push_cron_backfill.md 신규)
- 카페 3편 1차에서 AI 코칭 누락 → 재작성 (feedback_release_notes_critical_features.md 신규)
- 마이그레이션 번호 충돌 재발 (동일 세션, 메모리 저장 후에도)

## 30차 (2026-04-24) — 자동편성 버그 수정 + AI 코치 버튼 비활성 버그 수정

**자동편성 AI-free 모드 전술판 초기화 버그 최종 수정** (`AutoFormationBuilder.tsx`)
- [x] 근본 원인: AI-free 모드에서 sheet apply 시 `applyAiPlanToResults()` fallback 미전달 → `results` stale closure가 null → AI 누락 쿼터(Q1 포함) 드롭 → 전술판 빈 화면
- [x] `useRef` import 추가, `aiFreeFallbackRef` 추가 — AI fetch 전 `scheduleQuarters` 기본 스케줄 보존
- [x] `setResults(currentResults)` 조기 호출 제거 — re-render 유발로 stale closure 악화 방지
- [x] sheet apply 버튼: `applyAiPlanToResults(undefined, aiFreeFallbackRef.current)` — fallback 전달
- [x] AI placeholder[] 반환 시 빈 positions 방어: `assignments.length === 0` 스킵 + `validSquads` 필터 + `onGenerated([])` 보호
- 커밋: `f821c13`

**AI 코치 버튼 앱 재진입 후 비활성 버그 수정** (`MatchTacticsTab.tsx`)
- [x] 근본 원인: `dbAiCoachContext` useMemo에서 `nameMap.get(posEntry.playerId)` 없으면 `continue` → DB 배치 선수가 `attendingPlayers`에 없을 경우(참석 취소 등) 슬롯 카운트 제외 → `totalAssignedFieldSlots < expectedTotal` → `allSlotsFilled = false` → 버튼 비활성
- [x] `if (!playerName) continue;` 제거 → `nameMap.get(playerId) ?? \`선수(${playerId.slice(0,6)})\`` fallback 방식으로 교체
- [x] DB에 배치 기록만 있으면 attendingPlayers 목록 무관하게 카운트 포함 — 앱 재진입 후 정상 활성화 보장
- 이미 HEAD 커밋에 반영됨

**반쿼터 출전 표기** (`MatchTacticsTab.tsx` 내 쿼터별 출전 현황 매트릭스)
- [x] `●` 풀타임 / `전` 전반 출전 후 교체 아웃 / `교` 교체(후반 인) — 반투명 채운 원 / 테두리만 원 구분
- [x] 합계 열: 풀타임=1, 반쿼터=0.5 가중치 계산 (`3.5/4` 형식)
- [x] 범례(legend) Sheet 상단 추가
- 커밋: `2b062b1` (이전 세션 완료 기록)

**자동편성 formationId stale closure 버그** (`AutoFormationBuilder.tsx`, `TacticsBoard.tsx`)
- [x] `scheduleQuarters` 결과에 `formationId` 미포함 → stale closure의 `formation` 사용 → 슬롯 불일치 → `positions: {}` 저장 → 전술판 초기화. 수정: `formationId: formation.id` 추가
- [x] `boardState` lazy initializer 미적용 → 재마운트 시 빈 화면 flash. 수정: `useState(() => {...})` lazy 패턴
- [x] `saveToTacticsBoard` 빈 positions 그대로 API 저장 → `positions 0개` 스쿼드 DB 저장. 수정: 빈 squad skip
- 커밋: `2b062b1`, `77fc83d`

**삽질 기록**
- `git show HEAD` 로 이미 수정된 코드 확인 — 이전 세션 종료 시 자동 커밋 포함된 것으로 추정. Edit 중복 적용됐으나 결과 동일
- 자동편성 버그는 단일 원인이 아니라 4가지 원인 복합: formationId 미포함 / boardState lazy 초기화 미적용 / fallback 누락 / stale closure

## 29차 (2026-04-24) — 투표 마감 UX + 서버 가드 일괄 + 팀 앨범 + 월별 결산 + 게시판 통합

**투표 마감 UX 일관화** (커밋 `7769848`, `d26bb89`, `f7361aa`)
- [x] DashboardClient: `vote_deadline` 기반 `isVoteClosed` 계산, 마감 시 버튼 → "투표 마감되었습니다" 박스 + 내 투표 배지
- [x] getDashboardData 타입에 `vote_deadline` 노출 (서버 select에는 있었으나 타입 미정의)
- [x] MatchesClient 리스트뷰: 동일 마감 패턴 적용
- [x] 본인 투표 하이라이트 버그 수정: `attendance[match.id]?.[userId]` → `myMemberId` useMemo 도입 후 memberId 키로 교체 (2176eda 회귀 수정)
- [x] MatchCalendar: voteDeadline props 추가 + isVoteClosed 계산 + 마감 안내 박스
- [x] MatchRecordTab: `match.status === "COMPLETED"` 검증 없어 예정 경기에도 MVP 카드 노출 → status 체크로 감쌈

**API 서버 가드 5건 일괄 강화** (커밋 `bab979b`)
- [x] `/api/match-comments` DELETE: cross-team 삭제 방지 (comment → match.team_id 조인 검증) + 운영진 타인 댓글 삭제 허용
- [x] `/api/attendance` POST: 투표 마감 체크 (본인 경로)
- [x] `/api/mvp` POST: `match.status === "COMPLETED"` 검증
- [x] `/api/diary` POST: requireRole(STAFF) 권한 검증
- [x] `/api/posts/vote` POST: optionId ↔ pollId 귀속 검증

**운영진 대리 투표 마감 후 허용 복구** (커밋 `4e17874`)
- [x] attendance API: isProxy 경로 마감 체크 스킵 (운영진 override 의도 복원)
- [x] attendance-check generatePenalty: DORMANT/PENDING/BANNED 회원 벌금 제외
- [x] migration 00042: penalty_records 중복 방지 PARTIAL UNIQUE INDEX (match_id, rule_id, member_id)
- [x] dues/penalties POST: 23505(UNIQUE 위반) 무시로 race condition 대응

**v1.0.2 핵심 기능 — 팀 앨범** (커밋 `df016cd`)
- [x] `GET /api/gallery`: match_diaries.photos 집계 + matches 조인
- [x] GalleryView 컴포넌트 추출 (`src/components/gallery/`) — 독립 페이지·탭 양쪽 재사용
- [x] 경기별 그룹화 3열 그리드 + ImageLightbox 재활용 + 좌/우 네비게이션

**v1.0.2 핵심 기능 — 월별 결산 + 게시판/앨범 통합** (커밋 `0e4e1ef`)
- [x] `GET /api/reports/monthly?month=YYYY-MM`: 재무(수입·지출·카테고리) + 경기(승무패·득실) + 출석 집계
- [x] `/dues/monthly`: 월 선택기 + 공유 카드 (html-to-image + Web Share API + PNG 폴백)
- [x] 게시판 탭 UI: `[게시글][앨범]`, URL `?tab=gallery` 동기화
- [x] `/matches/gallery` → `/board?tab=gallery` 레거시 리다이렉트
- [x] 더보기 메뉴 "팀 앨범" 제거 (게시판·앨범으로 통합)
- [x] 회비 탭 상단 "월별 결산 리포트" 배너 (운영진 only)

**메뉴 라벨 통일** (커밋 `a26f5f5`)
- [x] 햄버거·하단 Sheet·더보기 페이지 3곳: "게시판" → "게시판 · 앨범"
- [x] 설명: "공지/자유" → "공지/자유/경기사진"

**경기 목록 상단 앨범 버튼 제거** (커밋 `c14ea2d`) — 중복 진입점 정리

**주요 의사결정**
- AI 월간 총평 이번 버전 제외 ("미납 알림은 일반 기능으로 커버", "AI 총평 별 의미 없어 보인다")
- 경쟁사 리서치 (TeamLinkt·Spond·TeamSnap·JoGi·축구고) → 아마추어 팀 관리 AI 블루오션 확인
- 사용자 재방향: AI보다 "이미 만들었지만 활용 못하는 기능" 발굴 우선
- 초기 /matches/gallery 독립 페이지 구현 완료 후 사용자 제안으로 게시판 탭 통합으로 즉시 방향 전환

**삽질 기록**
- 투표 마감 체크를 attendance API 공통으로 추가 → isProxy 운영진 대리 경로도 차단 → 사용자 피드백 후 롤백 (feedback_understand_existing_flow.md)
- "PlayerCard 다운로드 주석 처리 = 미완성 기능" 으로 오판 → 실제 /player/[memberId] 이미 라이브 (feedback_verify_live_state.md)
- bash에서 `src/app/(app)/...` 경로 괄호 이스케이프 없이 실행 → syntax error

**커밋 목록**: `7769848`, `d26bb89`, `f7361aa`, `bab979b`, `4e17874`, `df016cd`, `0e4e1ef`, `a26f5f5`, `c14ea2d`

## 28차 (2026-04-23) — 실사용자 CS 5건 대응 + 연관 버그 선제 수정 + MVP 집계 9곳 통일

**CS 직접 대응** (커밋 0991db0)
- [x] MVP 카운트 winner 기반으로 교체 — 투표받은 사람 전부 집계되던 버그 수정. 경기별 1명(운영진 지정 또는 70% 통과 최다득표자)만 카운트
- [x] MVP 투표 취소 기능 — `DELETE /api/mvp?matchId=...` + `MatchRecordTab` "투표 취소" 버튼 (이미 투표한 경우만)
- [x] 등번호 0~999 허용 — UI 2곳(`MembersClient`, `PersonalSettings`) + API 검증 + 도움말 문구
- [x] 철벽수비·승리요정 산정 기준 설명 — `SeasonAwardsPage.tsx`에 보조 설명 한 줄
- [x] 자체전 `stats_included=false` 필터 누락 — `getRecordsData`, `player/[memberId]/page.tsx`, `player-card/route.ts`. 박길한 4승1무10패→4승2무10패 원인 해소
- [x] 경기 삭제 권한 `PRESIDENT` → `STAFF` 완화 — `permissions.ts` + 테스트 + 문서 동기화

**포괄 체크 선제 수정** (커밋 0991db0 동반)
- [x] `getDashboardData` 팀 전적 `stats_included` 필터 방어적 추가
- [x] `aiTeamStats` 캐시도 `stats_included` 필터 추가
- [x] `share-card` MVP 표기 투표율 검증 추가 (1표만 있어도 MVP로 찍히던 버그 해소)
- [x] `records` API의 team_members 필터 `ACTIVE` → `ACTIVE+DORMANT`로 SSR과 통일

**70% threshold 정책 재확인** (커밋 0538d8c)
- [x] 중간에 threshold 제거 방향으로 수정했다가 사용자 정정 받고 복구
- [x] 참석자 기준을 `vote=ATTEND` → `attendance_status=PRESENT|LATE`로 통일 (API 기준과 일치)
- [x] `MatchRecordTab` MVP 카드에 threshold 미달 시 안내 문구 추가: "참석자 70% 이상이 투표해야 공식 MVP로 확정됩니다. 미달 시 운영진이 직접 지정할 수 있어요."

**is_staff_decision 백필 누락 치유** (커밋 0e581f7)
- [x] 근본 원인: 2026-04-20 커밋 `2d457b8`에서 컬럼 도입됐는데 과거 운영진 투표가 모두 `false`로 남아 집계 누락
- [x] `mvpThreshold.ts`에 `pickStaffDecision(rows, staffVoterIds)` 헬퍼 추가 — 현재 STAFF+ voter의 투표를 동적으로 확정 취급
- [x] MVP 집계 8곳에 적용: getRecordsData / records API / records/detail / season-awards / player page / player-card / share-card / getDashboardData 최근경기
- [x] `records/detail type=mvp`를 winner 기반으로 교체 — 숫자(1)와 상세(3) 불일치 해소
- [x] DB 시뮬레이션: 박길한 MVP 1→3 정상화 확인

**aiTeamStats MVP 엄격화** (커밋 fdda1bb)
- [x] AI 팀 통계 캐시도 동일 정책으로 통일 (단순 최다득표자 → pickStaffDecision + resolveValidMvp)
- [x] 기존 캐시는 24h TTL로 자동 만료 후 새 로직 적용 (제니스 FC는 캐시 없음 → 즉시 반영)

**세션 통계**
- 커밋 4개(`0991db0`, `0538d8c`, `0e581f7`, `fdda1bb`), 28개 파일 변경, 475+ lines insertions
- 테스트 729개 유지, 빌드 성공
- 박태수 계정(제니스 FC STAFF·CAPTAIN) 실제 데이터로 검증

**삽질 기록**
- 사용자가 "3경기 MVP인데 1로 나온다" 보고 → 내가 threshold 제거로 바로 코드 수정 + 커밋 → 사용자 "threshold는 유지"로 정정 → 다음 커밋으로 되돌림. **정책성 변경 전 사용자 확인 먼저** 원칙 강화 (`feedback_policy_confirm_first.md`)
- 포괄 체크 에이전트가 "경기 삭제 버튼 없음"이라고 오보고 → 실제로는 `MatchInfoTab`에 있었음. **에이전트 부재 보고는 재검증 필수** (`feedback_verify_before_ask.md` 확장)
- `is_staff_decision` 백필 누락 — 코드만 보고는 안 잡힘. DB created_at 타임라인과 마이그레이션 날짜 비교로 발견. `feedback_migration_backfill.md` 신규 추가

## 27차 (2026-04-23) — Supabase Advisor 전건 해소 + v1.0.1 TWA 빌드 + Play Console 재신청 준비

**Supabase Advisor 경고 4건 해소** (커밋 83c86a5)
- [x] `00038_fix_snapshot_function_search_path.sql` — `snapshot_dues_member_name()` 함수 search_path 고정 (Security: Function Search Path Mutable)
- [x] `00039_optimize_push_subscriptions_rls.sql` — RLS `auth.uid()` → `(SELECT auth.uid())` 서브쿼리 패턴 (Performance: Auth RLS Initialization Plan)
- [x] `00040_remove_uploads_bucket_listing.sql` — uploads 버킷 broad SELECT 정책 제거. `getPublicUrl()` 사용으로 기능 영향 0 (Security: Public Bucket Allows Listing)
- [x] `00041_dedupe_push_subscriptions_policies.sql` — 00039에서 생긴 FOR SELECT + FOR ALL 중복 정책 제거 (Performance: Multiple Permissive Policies). 내 실수 복구.
- 프로덕션 DB 반영 완료

**앱 내 피드백 보내기** (커밋 3b0b6cc)
- [x] `src/app/(app)/settings/PersonalSettings.tsx` 피드백 섹션 추가
- [x] `mailto:tjsgnl2002@gmail.com` + 제목 `[PitchMaster 피드백]` + 디버그 정보 자동 첨부 (APP_VERSION, userAgent, profile.name, 날짜)
- [x] `MessageSquare` 아이콘, 알림 섹션과 계정 탈퇴 사이 배치
- [x] `docs/play-console-v1.0.1-release.md` 작성 (TWA 빌드 절차, 테스터 재참여 카톡 공지문, 14일 스케줄)

**TWA v1.0.1 빌드 성공** (git 추적 밖)
- [x] versionCode=5, versionName=1.0.1 AAB 생성 (`C:\dev\pitchmaster-twa\app-release-bundle.aab`)
- [x] 빌드 환경 전체 `C:\dev\` ASCII 경로로 이전 (한글 경로 AAPT2 크래시 해결)
  - JDK: `C:\dev\bw\jdk\jdk-17.0.11+9`
  - Android SDK: `C:\dev\bw\android_sdk`
  - 프로젝트: `C:\dev\pitchmaster-twa\`

**홍보 자료 — 12컷 영상 스토리보드 리뷰**
- [x] Claude Design(claude.ai/design)으로 생성한 12컷 스토리보드 서비스 정책 정합성 검증
- [x] 오류 4건 지적 (AI 공개 범위, 풋살팀 타깃, OCR 프라이버시, "3초 시작" 과장)
- [x] 수정 프롬프트 작성 및 재렌더링 디렉션

**삽질 기록**
- PowerShell `Set-Content` CP949 인코딩 → twa-manifest.json 한글 깨짐 → Write 툴로 복구
- AAPT2 한글 경로 크래시 → `android.overridePathCheck=true` 무효 → 전체 ASCII 경로 이전으로 해결
- `Copy-Item -Recurse` 재시도 시 중첩 폴더 생성 함정

## 26차 (2026-04-19) — 경기 역할 가이드 + 전술 탭 레이아웃 재정비

**포지션 역할 지식 베이스 구축** (`src/lib/positionRoles/`)
- [x] 24 포지션 base 데이터 (`base/defenders.ts` · `midfielders.ts` · `forwards.ts`) — 포메이션 무관 공통 원칙
  - 수비 8: GK · LB · RB · LCB · RCB · CB · LWB · RWB
  - 미드 11: LM · RM · LCM · RCM · CM · CDM · LDM · RDM · LAM · RAM · CAM
  - 공격 5: LW · RW · LS · RS · ST
- [x] 축구 11인제 **10 포메이션** override 작성 (`overrides/*.ts`)
  - 4-4-2 · 4-3-3 · 4-2-3-1 · 3-5-2 · 3-4-3 · 4-1-4-1 · 4-5-1 · 5-3-2 · 3-4-2-1 · 4-3-2-1
  - 각 포메이션마다 모든 슬롯의 `whyItMatters` + `linkage` + 필요 시 extraAttack/Defense 오버라이드
- [x] base + override 병합 (`getPositionRole(formationId, roleCode)`) → `MergedPositionRole` 반환
- [x] 톤/내용 원칙: 감독→아마추어 친근 말투, 전문 용어 풀어쓰기, 지시마다 이유 포함, m 단위 대신 실감 표현

**MatchRoleGuide UI 컴포넌트** (`src/components/MatchRoleGuide.tsx`)
- [x] `/api/squads` fetch → 본인(또는 운영진이 선택한 선수)의 쿼터별 배치 뽑기
- [x] `groupAssignments()` — 같은 (formationId, role) 이면 비연속 쿼터도 한 카드
- [x] `formatQuarterRangeLabel()` — "2쿼터" / "1-2쿼터" / "2·4쿼터" / "1-2·4쿼터"
- [x] 권한별 뷰:
  - MEMBER: 본인만. 불참 시 "이 경기엔 불참하셨습니다", 전술판 미작성이면 섹션 숨김
  - PRESIDENT/STAFF: 드롭다운(용병 제외) + 전술판 미작성 시 포메이션 폴백
- [x] 아코디언 카드 + 왜 중요한가 + 공격/수비/커뮤니케이션/체력/조심할 실수/연계
- [x] 디자인: 흰 테두리 전면 제거, `bg-secondary/30` 기반 용병 카드 톤 통일, 경고 카드는 좌측 accent bar

**match-squads-saved 동기화 이벤트**
- [x] `TacticsBoard.saveToApi` / `AutoFormationBuilder` 저장 후 `window.dispatchEvent(new CustomEvent('match-squads-saved', { detail: { matchId } }))` 발행
- [x] `MatchRoleGuide` / `MatchTacticsTab`가 구독해 refetch — 포메이션 변경·배치 이동·쿼터별 다른 포메이션 모두 실시간 반영

**전술 탭 레이아웃 재정비** (`MatchTacticsTab.tsx`)
- [x] 카드 순서 프리셋 드롭다운(3옵션) 제거 → 고정 `order` 기반
  ```
  -10  INTERNAL 팀 편성
  -5   용병 관리 (편성 미완료)
  10   자동 편성 빌더
  20   전술판
  30   역할 가이드 (회원 우선순위)
  40   AI 코치 분석
  95   용병 관리 (편성 완료)
  ```
- [x] 용병 카드 동적 위치 — `isFormationComplete` computed memo 기반
- [x] `useLocalStorage` / `NativeSelect` import 제거

**편성 완료 판단 엄격화**
- [x] 이전 `hasAnySquad` state는 "저장 이벤트 = 편성됨" 오판 (포메이션만 변경·심판만 지정에도 true)
- [x] 새 기준: **매 쿼터마다** formation template 정규 슬롯이 전부 채워진 squad 존재
- [x] 심판/촬영(`__prefix`)은 template.slots에 없어 자연 제외
- [x] 자체전 A·B 중 하나라도 쿼터 완성되면 인정
- [x] `match.quarterCount` 0/undefined 방어 (`?? 1`은 0 못 잡음)

**AI 코치 분석 DB fallback**
- [x] `dbSquads` state 추가 — AutoFormationBuilder context 없어도 수동 편집/DB 복원 케이스에서 AI 분석 버튼 활성화
- [x] `dbAiCoachContext` memo로 DB squads → quarterPlacements 재구성

**관련 커밋**
- `8a59a4f` — 역할 가이드 시스템 (base 24 + override 1 + UI) 초기 커밋
- `a2a61f6` — 11인제 9 포메이션 오버라이드 일괄 추가 + sample 제거
- `9e3d8dc` — match-squads-saved 이벤트 동기화
- `6f8faa6` — 비연속 쿼터 같은 포지션 합침 ("2·4쿼터")
- `04c83bf` — 역할 가이드 UI 톤 정리 (흰 테두리 제거)
- `1056dba` — 카드 순서 프리셋 제거 + 고정 order
- `942c2cb` — 용병 카드 위치 단순화
- `352f4ad` — 편성 완료 엄격화 (formation template slots 기준)
- `24d2b31` — quarterCount 0/undefined 방어

## 25차 (2026-04-19) — 축구 인원 확장 · AI 시그니처 룰 전환 · 경기 후기 환각 수정

**축구 8:8 / 9:9 / 10:10 경기 지원 (5 Phase 전부 완료)**
- [x] `supabase/migrations/00027_team_default_player_count.sql` — `teams.default_player_count INT DEFAULT 11`
  - DB 수동 적용 완료 (풋살팀 22개 6으로, 축구팀 62개 11 유지)
- [x] `formations.ts` — 기존 축구 11인제 10종에 `fieldCount: 11` 명시 + 신규 9종 추가
  - 8인제: 3-3-1, 2-3-2, 3-2-2 / 9인제: 3-3-2, 3-4-1, 4-3-1 / 10인제: 3-3-3, 4-3-2, 3-4-2
  - `getFormationsForSportAndCount` 축구·풋살 공용 일반화
- [x] API: `teams` PUT 에 `defaultPlayerCount` 수용, `matches` POST 팀 기본값 상속
- [x] UI: `TeamSettings` 기본 참가 인원 Select, `MatchesClient` Input → Select 위젯
- [x] `TacticsBoard` / `AutoFormationBuilder` — `playerCount` prop 추가, fieldCount 기반 포메이션 필터
- [x] 레거시 경기(player_count=7 등) 폴백 — 매칭 포메이션 없으면 해당 스포츠 전체 반환
- [x] `MatchInfoTab` 편집 폼에도 참가 인원 Select 추가 — 경기 등록 후 변경 가능
- [x] `SettingsClient` `defaultTeam` fallback 에 sportType/defaultPlayerCount 매핑 버그 수정
  - 저장한 8:8이 재방문 시 11:11로 돌아가던 문제 해결 (3개 레이어 모두 누락됐음)

**AI 시그니처 → 룰 기반 패턴 풀 전환**
- [x] `playerCardUtils.ts generateSignature` — 9분기 → 약 50개 템플릿 풀
  - `playerKey` (이름 기반 시드) 로 결정론적 선택 — 같은 선수 같은 시즌 = 같은 문구
  - 카테고리별 풀: 수비수 득점왕 특수, 클린시트 많음, MOM 1위, 득점왕, 도움왕 등 13개 분기
- [x] `aiSignatureCache.getOrGenerateSignature` — AI 경로 완전 비활성화, 항상 룰 기반 반환
  - Anthropic SDK 호출 0건, 비용 0, 지연 0ms
- [x] 기존 DB 캐시(`team_members.ai_signature`) 수동 NULL 초기화 — 새 패턴 풀로 즉시 갱신
- **이유**: Sonnet 도 한국어 위트·자랑 톤은 안정적이지 않음. "수비수가 7골, 포지션은 맞게 적었다"
  같은 어색한 한국어 다발. 룰 기반이 품질·비용·지연 모두 우위.

**경기 후기(AI Match Summary) 환각 원인 수정**
- [x] 환각 실례: 4/13 FCMZ vs 올챙이FC 실제 6-2 승리인데 AI가 "8-0 대승" 조작
- [x] 근본 원인: `api/ai/match-summary/[matchId]/route.ts` 의 DB 필드명 전부 틀림
  - `match.our_score/opponent_score` (없음 → 실제는 match_goals 집계)
  - `g.scorer_user_id/assist_user_id` (없음 → 실제 scorer_id/assist_id)
  - `g.quarter` (없음 → quarter_number)
  - `v.candidate_member_id/candidate_user_id` (없음 → candidate_id)
  - `match.date` (없음 → match_date)
- [x] route.ts 전면 리팩토링 — 실제 스키마 기준으로 재작성
  - score 를 match_goals 집계로 계산 (is_own_goal/OPPONENT → opp, 나머지 → us)
  - nameMap 에 **users.id + team_members.id + match_guests.id (용병)** 세 소스 모두 등록
  - UNKNOWN / OPPONENT 는 SPECIAL 상수로 null 반환 → goals 배열에서 필터아웃
- [x] 기록 전무한 경기는 AI 호출 차단 — `score && !mom && attendance===0` 이면 400 insufficient_data
- [x] 프롬프트 환각 금지 섹션 추가:
  - score=null 시 스코어 조작 금지
  - goals=[] 시 득점자 이름 추측 금지
  - mom=null 시 MOM 지어내기 금지
  - `goals 배열 길이 != score.us` 가능 (UNKNOWN 골) 설명
- [x] 기존 환각 캐시 5건 NULL 초기화 + regenerate_count 0 리셋

**경기 후기 프롬프트 튜닝**
- [x] 반복 어휘 금지 리스트 — "공격을 주도/공격력 과시/공격 전개 이끌/공격이 살아있/공격이 어울렸/공격 가담을 아끼지"
- [x] 마무리 클리셰 금지 — "이런 기세 유지/이 자신감을 유지/앞으로도 이 경기력"
- [x] 3단락 남발 차단 — 기본 2단락, 3단락은 대승/역전/대량득점/무득점 조건일 때만
- [x] 입력 데이터 활용 장려 — goals[].quarter/weather/location/attendanceCount
- [x] `isLowQuality` 에 CLICHE_PHRASES 2개 이상 포함 시 재시도 트리거

**관련 커밋**
- `c81748e`, `7fbac58`, `8799f29` — 축구 인원 확장 Phase 전체
- `446edd2` — 경기 수정 UI 참가 인원 Select
- `0d1de64` — 레거시 경기 포메이션 폴백
- `fe92497` — AI 시그니처 → 룰 기반 전환
- `4fbd14f` — 경기 후기 반복·클리셰 억제 프롬프트
- `c922b0d` — 경기 후기 DB 스키마 불일치 수정 (환각 1차)
- `07107ca` — 용병/UNKNOWN/OPPONENT 처리 (환각 2차 정정)

## 24차 (2026-04-18) — AI 코치 분석 고도화 · 축구 전용 제한

**축구 전용 AI 제한**
- [x] `MatchDetailClient.tsx` — `effectiveEnableAi = enableAi && sportType === "SOCCER"` 조건 추가
- AI 관련 기능(코치 분석, Full Plan, 경기 후기 재생성) 풋살팀에 완전 비노출

**AI 코치 분석 데이터 강화**
- [x] `aiTeamStats.ts` — `PlayerCareerStat` 타입 추가 (totalMatches, totalGoals, totalAssists, mvpCount, mostPlayedPosition)
- [x] `aiTeamStats.ts` — MVP 집계 로직: `match_mvp_votes.candidate_id`(users.id) → users.id→team_members.id 브릿지 매핑 → 경기별 최다 득표 winner 방식
- [x] `aiTeamStats.ts` — `memberMatchSet`으로 선수별 총 출전 경기 수 정확 집계
- [x] `aiTacticsAnalysis.ts` — 히스토리 블록에 선수별 커리어 섹션 추가
- [x] `aiTacticsAnalysis.ts` — 시스템 프롬프트에 playerWorkload 해석 규칙 추가 (전 쿼터 출전 선수 체력 언급 필수)
- [x] `aiTacticsAnalysis.ts` — 시스템 프롬프트에 쿼터별 득실 패턴 → 경기 운영 반영 가이드 추가

**선수별 쿼터 부하(playerWorkload) 분석**
- [x] `AiCoachAnalysisCard.tsx` — quarterPlacements에서 선수별 등장 횟수 집계 → `[{playerName, quarters}]` 배열로 API 전달
- [x] `TacticsAnalysisInput` — `playerWorkload?: Array<{playerName, quarters}>` 필드 추가
- [x] `userContent` — playerWorkload 포함 (스트리밍/논스트리밍 양쪽)

**AI 코치 카드 UX 수정**
- [x] `MatchTacticsTab.tsx` — 카드 항상 렌더링, `aiCoachContext` 없을 때 버튼 비활성
- [x] `AiCoachAnalysisCard.tsx` — `hasResults` → `allSlotsFilled` 교체, 미채움 시 회색 버튼 + 안내문구

**문서화**
- [x] `CLAUDE.md` — AI 기능 설계 섹션 추가 (데이터 파이프라인, Feature Flag, TeamStats 구조)

## 23차 (2026-04-18) — 골 기록 UX 개선 · 쿼터 모름 지원

**버그 픽스: LINEOUT FC 실점 기록 실패**
- 원인: `+ 실점` 버튼이 `quarter=0`을 전송했으나 API가 `< 1`로 차단
- 근본 수정: `quarter_number NOT NULL` → nullable (migration 00032)

**쿼터 모름 지원**
- [x] `supabase/migrations/00032_nullable_quarter_number.sql` — quarter_number nullable, 기존 0값 NULL 정리
- [x] `goals/route.ts` — POST/PUT: quarter=0 → null 저장, 유효범위 0~10
- [x] `matchDetailTypes.ts` — `GoalRow.quarter_number`, `GoalEvent.quarter` → `number | null`
- [x] `MatchRecordTab.tsx` — 쿼터 선택 `-` 버튼 라벨 `모름`으로 변경, null 안전 비교 처리

**득점 즉시 등록 (UX 개선)**
- [x] `+ 득점` 버튼: 상세 폼 열기 → 기본값(득점자 모름/쿼터 모름/일반) 즉시 등록으로 변경
- [x] `+ 실점`과 동일한 원클릭 등록 흐름 통일
- [x] 상세 수정은 골 카드의 수정 버튼(아코디언 폼)으로 분리

**문서 업데이트**
- [x] `public/guide.html` — 골 기록 섹션 신규 UX 반영
- [x] `docs/backlog/completed-recent.md` 업데이트

22차(2026-04-17 세션: AI Phase A/B 도입, OCR 품질 개선, 센터백 버그 픽스 등)는 커밋 로그 참조 — 별도 문서화 예정.

## 21차 (2026-04-14 심야) — AI 기능 Phase 0 + Phase 1 도입

**AI 멀티 모델 전략 확정**
- 사용자 접점 한국어 텍스트 = Claude Haiku 4.5 (한국어 톤 섬세함)
- 백엔드 분석·분류·구조화 = Gemini 2.0 Flash (비용 극소)
- 환경변수 기반 모델 스위칭, Prompt Caching 필수
- 문서: `docs/business-costs-pricing.md`, `memory/project_ai_roadmap.md`

**Phase 0 — AI 시그니처 카피 (Claude Haiku)**
- [x] `@anthropic-ai/sdk` v0.89 설치 + ANTHROPIC_API_KEY 환경변수 연동
- [x] `src/lib/server/aiSignature.ts` — Claude Haiku 호출 + prompt caching(`cache_control`) + 룰 기반 fallback (71f71ca)
- [x] 프롬프트 대폭 튜닝: 5가지 유형(장면·대조·인과·단언·헌신), 금지어 블랙리스트, 상투 표현 차단 (b7a16c9, 732a2cb, c30e2d0)
- [x] 품질 가드 (`isLowQuality`): 메타 텍스트, 약어 손상(MO·MV), 숫자 붙여쓰기, 상투어 자동 fallback
- [x] migration 00027: team_members.ai_signature / generated_at / model 3컬럼 추가
- [x] `src/lib/server/aiSignatureCache.ts` — TTL 7일 캐시 (e19067e)
- [x] `/player/[memberId]` 통합: 김선휘 Feature Flag + 모든 사용자에게 캐시 노출
- 결과 예시: "상대가 가장 먼저 쳐다보는 뒷공간을 장악한다" — 룰 기반 불가 표현
- 월 비용 예상: ~1,200원 (활성 선수 300명 주 1회 가정)

**Phase 3 — AI OCR (Claude Haiku Vision) — 회비 영수증 스마트 파싱**
- [x] `src/lib/server/aiOcrParse.ts`: 이미지 → 거래 JSON 배열 파싱
- [x] `POST /api/ocr/smart`: 김선휘 Feature Flag 라우트 (Phase B에서 해제)
- [x] DuesBulkTab에 "✨ AI OCR로 시도하기 (베타)" 버튼 추가 (이후 자동 폴백으로 전환)
- 호출당 ~3~5원 (이미지 ~1,500 + 프롬프트/출력 ~1,000)

**Phase 2 — AI 코치 분석 (Claude Haiku)**
- [x] `src/lib/server/aiTacticsAnalysis.ts`: 편성 결과 + 참석자 스탯 → 코치식 1~2단락 분석 생성
- [x] `POST /api/ai/tactics` 라우트: 김선휘 Feature Flag + 저품질 자동 fallback
- [x] AutoFormationBuilder에 "AI 코치 분석 보기" 버튼 + 결과 카드 UI
- 호출당 ~2.5원 (입력 ~1,500 + 출력 ~250)

**Phase 1 — AI 경기 후기 (Claude Haiku)**
- [x] migration 00028: matches.ai_summary / generated_at / model 3컬럼 추가
- [x] `src/lib/server/aiMatchSummary.ts`: 카톡 공유용 2~3단락(200~350자) 생성
- [x] `src/lib/server/aiMatchSummaryCache.ts`: 경기 1회 생성 후 영구 캐시
- [x] `getMatchDetailData`에 aiSummary 통합 (COMPLETED 경기만, 김선휘 flag)
- [x] MatchDiaryTab 상단 "AI 경기 후기" 카드 + 복사 버튼
- 월 비용 예상: ~300원 (월 100경기 가정)

**워딩 정리 — 영구 무료 약속 제거**
- [x] `public/guide.html` FAQ: "핵심 기능 계속 무료" → "추후 유료 도입 가능"
- [x] `src/app/terms/page.tsx` 제6조: 유료 전환 여지 유지 개정

**운영 비용·가격 정책 문서화**
- [x] `docs/business-costs-pricing.md` 작성 (272줄)
- [x] 메모리 3종 갱신: `reference_infra.md`, `project_ai_roadmap.md`, `project_pricing.md`

## 20차 (2026-04-14 밤) — 커리어 프로필 v0 UI 완성 + 카드 진입점 확장

**커리어 프로필 v0 UI 완성도**
- [x] 뒤로가기 버튼 추가 — PlayerProfilePage + PlayerProfileEmpty 상단 좌측 고정(fixed)
- [x] PlayerCard 이미지 onError fallback — 로드 실패 시 등번호 워터마크로 자동 전환
- [x] PlayerCard photoUrl 있을 때 이름과 간격 mb-4 sm:mb-5 추가
- [x] globals.css v0 카드 CSS 복구 — sparkle/holographic-bg/card-shimmer-slide/glow-*/text-glow-*/noise-overlay/vignette/stadium-pattern/perspective-1000/preserve-3d/scrollbar-hide
- [x] /player/[memberId] `?team=` URL 쿼리 지원 — 다중 팀 소속 시 올바른 팀 데이터 표시
- [x] DORMANT 회원도 프로필 열람 가능 — BANNED만 제외 (휴면 회원 404 버그 수정)

**카드 진입점 확장**
- [x] 사이드바 프로필 영역 Link + ChevronRight
- [x] 대시보드 최상단 "내 프로필 보기 →" 한 줄 링크
- [x] 기록 페이지 이름 점선 언더라인 + 링크

**기록 페이지 "시즌 어워드" 4번째 탭 추가**
- [x] 탭 구조 my/ranking/all → my/ranking/all/**awards**
- [x] 기존 주석 처리된 SeasonAwardsCard 활용
- [x] 시즌 드롭다운 위치 변경: 탭 바 오른쪽 → 아래 독립 줄
- [x] 어워드 행 이모지 영역 고정 폭(h-6 w-6)으로 정렬 통일
- [x] name 비어있는 어워드 행 스킵 (베스트매치 빈 카드 방지)

**Rarity 기준 완화 (80/70/60)**
- [x] ICON 90→**80**, HERO 80→**70**, RARE 70→**60** — 김선휘 OVR 67 → COMMON → RARE(에메랄드)로 승급

## 19차 (2026-04-14 저녁) — 출시 직전 최종 QA·MVP 규칙 변경

**입력 검증·업로드 경계**
- [x] 이미지 업로드 크기·타입 제한 (OCR, 회비 엑셀) — 10MB + MIME/확장자 검증
- [x] 팀 설정(teams PUT) 입력 검증 — 팀명 30자, 로고 URL http(s) 화이트리스트
- [x] 경기 시작·종료 시간 순서 검증 (시작>종료, 같은 날 시간 역전)
- [x] 경기 상태 머신 역행 차단 (COMPLETED → SCHEDULED 금지)

**UX 포맷 통일**
- [x] 회비·대시보드 금액 표기를 `formatAmount()`로 일괄 전환 (6개 파일, 19건 치환)

**MVP 규칙 변경 — 참석자 70% 투표 시에만 실제 MVP로 인정**
- [x] `src/lib/mvpThreshold.ts` 유틸 신규 — `MVP_VOTE_THRESHOLD = 0.7`, `isValidMvpVoteTurnout`, `resolveValidMvp`
- [x] 대시보드 / 시즌 어워드 / 선수 카드 / 레코드 MVP 집계에 임계값 적용
- [x] 효과: 참석 10명 경기에서 MVP 투표 6명이면 MVP 미확정 (7명+ 필요)

**옵티미스틱 에러 처리**
- [x] 회비 삭제 실패 시 토스트 에러 노출

**테스트 조정**
- [x] dues-excel 테스트: File 객체로 교체
- [x] records/dashboard 테스트: MVP 임계값 mock 추가
- [x] 전체 657 테스트 green 유지

## 18차 (2026-04-14) — 앱 출시 직전 안정화·보안 스윕

**크로스 팀 접근 취약점 일괄 수정 (1차: 92fa215)**
- [x] 용병 API 권한 체크 추가 — POST/PUT/DELETE에 MATCH_EDIT(STAFF) 요구
- [x] MVP/다이어리/경기댓글/스쿼드 GET team_id 검증 — 다른 팀 matchId 조회 차단
- [x] 용병 DELETE team_id 검증 — PUT은 있고 DELETE만 누락된 비대칭 해소
- [x] notifications PUT 단일 id 업데이트 user_id 검증
- [x] 벌금 API 권한 교체 — MATCH_CREATE → DUES_SETTING_EDIT / DUES_RECORD_ADD
- [x] admin stats·레코드·회비 쿼리 휴면 필터 보정 — BANNED 제외, 통계 분모에 DORMANT 포함

**크로스 팀 접근 2차 패치 (10b6f1b)**
- [x] attendance-check GET/POST matchId 팀 검증 추가
- [x] internal-teams GET matchId 팀 검증 추가
- [x] seasons PUT 활성화 시 team_id 조건 추가
- [x] rules PUT 규칙 수정 시 team_id 조건 추가

**출시 전 UX 일괄 개선 (079b16f)**
- [x] 원시 에러 메시지 순화 — toKoreanError() 5곳 적용
- [x] 위험 액션 모달 오터치 방지 — destructive variant에 autoFocus, 회장 이임 destructive 적용
- [x] Toast 지속시간 가변 — 에러·긴 메시지(30자+) 5초, 일반 3.5초
- [x] 투표 버튼 로딩 상태 시각화 — Loader2 스피너, 실패 시 animate-shake
- [x] "하시겠습니까" → "할까요" 톤 현대화 (11곳)
- [x] "유저" → "회원" 용어 통일
- [x] formatters.ts 신규 — formatDate/formatDateKo/formatTime/formatTimeKo/formatAmount

**운영 기록**
- [x] Play Console 프로덕션 답변 자료 작성 — `docs/play-console-production-answers.md`
- [x] 이근범 회장(불공FC) 앱 내 알림 발송 — 가입 대기 6명 안내

## 17차 (2026-04-12) — v0 카드 UI 이식 + 프로필 사진

**v0 카드 UI 이식 — Phase 1, 2**
- [x] v0 컴포넌트 4종 src/components/pitchmaster/ 이식 — PlayerCard/PlayerProfilePage/SeasonAwardsPage/ShareCard (2,475줄)
- [x] globals.css에 v0 프리미엄 애니메이션 CSS 이식 — holographic/sparkle/card-shimmer/glow-pulse/float + 15개 유틸 클래스
- [x] 커리어 프로필 /player/[memberId] v0 UI 연결
- [x] calculateOVR playerCardUtils.ts 공유 유틸화
- [x] dev 전용 /demo-cards 페이지 + 더보기 메뉴 항목
- [x] PlayerCard 옵션B 9종 개선 — OVR text-7xl~8xl, rarity별 text-shadow, sparkle 18+개 4크기 랜덤
- [x] MVP 슈퍼카드 overflow-hidden 제거
- [x] 베스트 모먼트 가로형 카드 — min-h-[120px], 좌측 이모지 박스, sparkle dots 6개
- [x] 시즌 어워드 1순위 featured 모드 — col-span-2, 좌측 큰 트로피
- [x] ShareCard 미리보기 확대 + 가로 스크롤 — Story 320x568, Square 360x360, OG 480x252

**프로필 사진 기능**
- [x] 설정 > 개인 설정 프로필 사진 업로드 — POST /api/profile/image (Supabase Storage)
- [x] 카카오 프로필 이미지 자동 반영
- [x] auth() 세션 동기화에 profile_image_url 포함
- [x] 카카오 OAuth redirect 쿼리 파라미터 지원
- [x] next.config kakaocdn.net 도메인 허용
- [x] 프로필 이미지 3곳 적용 — 헤더→사이드바, 회원 목록, 게시판 아바타

**더보기/헤더 개편**
- [x] 더보기 페이지 상단 프로필 영역 + 하단 로그아웃
- [x] 헤더 프로필 아이콘 제거 → 사이드바 상단으로 이동

**보안 / 권한**
- [x] 쿠키 secure 플래그 추가 — production일 때만
- [x] 투표 API 팀 소속 검증 추가 — 데모 계정이 FCMZ 경기에 투표 가능했던 버그 차단
- [x] 감독 지정 포지션 권한 수정 — PRESIDENT → STAFF 이상

**전술판 / 자동 편성**
- [x] 전술판 하이라이트 — 감독 지정 포지션 우선 적용
- [x] 자동 편성에서 휴면 회원 제외

**투표 / 경기**
- [x] 투표 재개 버튼 — 경기 전날 17시로 복원

**기타**
- [x] PC 공유 클립보드 분기 — Windows 공유 모달 대신 clipboard.writeText

## 16차 (2026-04-11) — 전술판 매칭 하이라이트 + 킬러 기능 백엔드 보강

- [x] 세션 쿠키 HMAC 서명 도입 — pm_session 조작 위장 방지, `SESSION_SECRET` 환경변수 (8d32f4e)
- [x] 경기 등록 직후 1인 팀 초대 CTA 모달 (61464ce)
- [x] 전술판 선호 포지션 매칭 하이라이트 — 필드 타일에 선호 포지션 일치 선수 success ring + 글로우
- [x] 전술판 선수 선택 패널 매칭 하이라이트 — 활성 슬롯과 카테고리 일치 선수만 success variant
- [x] 전술판 매칭 표시 라벨 명시화 — ✓ → "추천"/"적합", 필드 상단 레전드
- [x] 모바일 전술판 — 적합 인라인 라벨 데스크탑(sm+) 전용
- [x] 전술판 공유 캡처 시 적합 표시 숨김
- [x] 축구 11인 포메이션 5종 추가 — 4-1-4-1 / 4-5-1 / 5-3-2 / 3-4-2-1 / 4-3-2-1
- [x] 경기 기록 입력 운영진 전용 토글 — teams.stats_recording_staff_only + migration 00024
- [x] 킬러 기능 백엔드 보강 — 선수 카드 JSON variant, 시즌 어워드 MVP/요약, 커리어 프로필 베스트 모먼트 (a37b57e)
- [x] playerCardUtils 공유 헬퍼 + 단위 테스트 42개
- [x] 경기 기록 탭 실점 수정 — 쿼터 UI 노출 + 취소 시 폼 닫기 (bd35300)
- [x] 자동 경기 완료 — 당일 match_end_time 이 지난 경기 포함 (b453727)
- [x] 골 기록 기본 정렬 등록순 + 드래그 정렬 (display_order 컬럼, migration 00025)
- [x] 앱 복귀 자동 갱신 쿨타임 30초 → 10초

---

15차 이하는 [completed-archive.md](completed-archive.md) 참조.
