---
title: 개선 백로그 — 최근 완료 (16~24차)
summary: 2026-04-11~18 진행된 AI 도입 Phase 0/1/2/3, 출시 직전 보안·UX 스윕, v0 카드 UI 이식, 커리어 프로필 v0 완성, 골 기록 UX 개선, AI 코치 고도화
sections: [24차 AI 코치 고도화, 23차 골 기록 UX, 21차 AI Phase 0+1+2+3, 20차 커리어 프로필 v0, 19차 출시 직전 QA, 18차 보안 스윕, 17차 v0 카드 이식, 16차 전술판 매칭·킬러 백엔드]
last_updated: 2026-04-18
related: [completed-archive.md, pending.md]
---

# 최근 완료 (16~24차)

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
