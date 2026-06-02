# PitchMaster src 전체 리뷰 종합 리포트 (2026-06-01)

> 멀티 에이전트 워크플로(16개 영역 병렬 Sonnet 리뷰 → Opus 종합)로 src 436파일/91k줄 전수 점검.
> 17 에이전트 · 1.86M 토큰 · 약 10분.

## 요약 (스크립트 집계 기준)

**Severity별 건수 — 총 116건**
- 🔴 Critical: 1건
- 🟠 High: 19건
- 🟡 Medium: 44건
- 🟢 Low: 52건

> ⚠️ 종합 에이전트가 본문 프로즈에 "총 80건"으로 적었으나 이는 병합 블록 오집계. 스크립트 실제 집계는 116건이 정확.
> 🔍 spot check: Critical(payment-status PUT)·High(comments POST 크로스팀) 2건은 실제 코드로 직접 확인 — 모두 진짜.

**영역별 건강 상태**

| 영역 | 상태 |
|------|------|
| 경기 상세 UI / 전술 탭 | 양호 — 단 스코어 계산 불일치 등 correctness 버그 3건 |
| 대시보드·기록·더보기 UI | 양호 — match_type 필터 불일치가 데이터 정합성 핵심 이슈 |
| 회비·회원·게시판·회칙 UI | 양호 — await 누락·삼켜진 에러·isGlobal 이름 게이트 |
| 설정·어드민·레이아웃·로그인·온보딩 | 양호 — push-test 인증 부재(High)·알림 필드명 불일치 |
| API: AI·OCR·시너지·팀통계 | 주의 — STAFF+ API 게이트 누락 다수(High)·rate-limit race |
| API: 경기·편성·골·출석·MVP·일지 | 양호 — 댓글 크로스팀 삽입·면제 ID 타입 버그(High) |
| API: 회비·회원·용병·시즌 | 주의 — payment-status PUT 권한 부재(Critical)·staffOnly GET 노출 다수 |
| API: cron | 양호 — 0-0 결과 푸시 누락·7일 가드 미적용 |
| API: 인증·프로필·계정·팀 | 주의 — OAuth 오픈 리다이렉트(High)·MVP 후보 미삭제 |
| API: 기록·카드·알림·푸시·업로드 | 주의 — invite-nudge user_id 누락·cron 인증 부재(High) |
| lib/server (SSR) | 양호 — 미구독자 인앱 알림 과다 삽입(High)·KST 불일치 |
| lib 도메인 코어 | 양호 — 강퇴 세션 역할 미청소(High)가 최대 이슈 |
| lib 훅·유틸·모션 | 양호 — push 서버 등록 실패 은폐(High) |
| components 루트 (전술판·편성) | 주의 — saveToApi try/catch 부재 2건(High)·스피너 고착 |
| components (ui·board·평점 등) | 양호 — PollBlock res.ok 미검사 crash(High) |
| 테스트 정합성 | 양호 — 죽은 feature-gate 픽스처·MVP staff_only 분기 미검증 |

---

## 🔴 Critical / 🟠 High 이슈 (전체 20건)

### 권한·인증 게이트 누락

**[Critical][API 회비] dues/payment-status PUT 권한 체크 전무** — `src/app/api/dues/payment-status/route.ts:135` — 일괄 자동 매칭 PUT 핸들러에 `requireRole` 호출이 없어 MEMBER 포함 모든 팀 회원이 팀 전체 납부 상태를 임의로 PAID 처리 가능. POST/DELETE는 `DUES_RECORD_ADD`(STAFF+) 가드가 있는데 PUT만 누락. — body 파싱 직전에 `const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD); if (roleCheck) return roleCheck;` 추가. **(코드 확인 완료)**

**[High][API 회비] staffOnly GET 3종이 MEMBER에게 회비 전체 노출** — `dues/summary/route.ts:6` (입출금·잔고·penalty_rules), `dues/payment-stats/route.ts:6` (납부율 추이·장기 미납자 이름), `dues/member-status/route.ts:12` (면제·선납·휴회·입금 거래) — 세 GET 모두 `requireRole` 없음. CLAUDE.md는 납부현황을 staffOnly로 명시. — 각 핸들러(및 member-status의 `getCandidates`/`getMemberRecentIncomes` 내부 함수)에 `requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD)` 추가.

**[High][API AI] STAFF+ 전용 AI 라우트 2종에 API 레벨 역할 체크 누락** — `ai/tactics/route.ts:61`, `ai/full-plan/route.ts:17` — 주석은 "STAFF+ 이상만 접근"이라 하지만 코드엔 `isStaffOrAbove` 검사가 없어 MEMBER가 직접 POST로 AI 코치 분석·Full Plan 실행 및 경기당/팀월 한도 소진 가능. — `pair-synergy/route.ts` 패턴대로 auth 직후 `if (!isStaffOrAbove(session.user.teamRole)) return ...` 추가.

**[High][API 푸시] invite-nudge·match-nudge cron에 CRON_SECRET 인증 부재** — `src/app/api/push/invite-nudge/route.ts:8` — vercel.json에 cron 등록됐으나 auth 검사 전무. CSRF 가드는 Origin 조작으로 우회 가능. `/api/cron/*`는 모두 Bearer 보호하는데 이 둘만 예외. 외부 반복 호출 시 실 회장에게 스팸 푸시. — `Bearer ${process.env.CRON_SECRET}` 검사 추가.

**[High][설정] push-test 페이지 서버측 인증·권한 게이트 없음** — `src/app/(app)/push-test/page.tsx:1` — `"use client"`만 선언, auth/역할 체크 없음. 평회원도 URL 직접 접근으로 `/push-test` 진입 후 `/api/push/send`로 팀 전체 push 발송 가능. — 서버 컴포넌트 wrapper에서 `auth()` 후 `isStaffOrAbove` 검사, 미통과 시 redirect.

### 크로스팀 데이터 접근 / 격리 누락

**[High][API 경기] 게시글 댓글 POST 팀 소속 검증 없음 (크로스팀 삽입)** — `src/app/api/comments/route.ts:42` — GET/DELETE는 `posts.team_id=ctx.teamId` 조인 검증하지만 POST는 `body.postId`를 그대로 삽입. service_role로 RLS 우회되므로 타 팀 게시글 UUID를 아는 인증 사용자가 댓글 작성 가능. — INSERT 전 `posts` 소속 검증(match-comments POST 패턴) 추가. **(코드 확인 완료)**

**[High][API 카드] share-card·persistCoachAnalysis가 team_id 스코프 없이 matchId만 사용** — `src/app/api/share-card/route.ts:25-35` (타팀 스코어·선수·MVP 노출), `src/lib/server/aiTacticsAnalysis.ts:22` (`persistCoachAnalysis`가 `.eq('id', matchId)`만으로 UPDATE → 타팀 경기 `ai_coach_analysis` 덮어쓰기). — 두 곳 모두 `.eq('team_id', ...)` 추가. persistCoachAnalysis는 `(matchId, teamId, ...)` 시그니처로 변경.

### 인증·세션 보안

**[High][lib 코어] 강퇴/BANNED 회원 세션에서 teamId·teamRole 미청소 — 권한 우회** — `src/lib/auth.ts:118-154` — membership=null(BANNED/삭제)이면 role·teamId를 갱신 않고 옛 `teamRole='STAFF'/'PRESIDENT'`가 남은 세션을 반환·재캐싱. API 전체가 service_role(RLS 우회). — line 129 이전에 `if (!membership) { session.user.teamId = undefined; session.user.teamRole = undefined; needSync = true; }` 추가.

**[High][API 인증] OAuth state 파라미터를 통한 오픈 리다이렉트** — `src/app/api/auth/kakao/callback/route.ts:88-95` — `__redirect__` 추출값을 검증 없이 `new URL(redirectUrl, request.url)`에 전달. `https://evil.com`·`//` URL이 외부 리다이렉트. 카카오 로그인 후 피싱 유도. — `redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')`로 경로만 허용 후 `/` 폴백.

### 데이터 정합성 버그

**[High][기록 UI] 기록 탭 스코어보드 자책골 계산이 MatchDetailClient와 불일치** — `src/app/(app)/matches/[matchId]/MatchRecordTab.tsx:297-299` — MatchDetailClient는 '상대팀 자책골(OPPONENT+isOwnGoal)을 우리 득점'으로 카운트하나, MatchRecordTab은 `isOwnGoal`이면 무조건 상대 득점 처리. 같은 경기를 두 화면이 다른 스코어로 표시. — 필터를 동일하게 맞추고 score 계산을 공유 헬퍼로 추출.

**[High][API 출석] 면제 조회 ID 타입 불일치로 면제자에게 벌금 생성** — `src/app/api/attendance-check/route.ts:131-135` — `generatePenalty`가 `member_dues_exemptions.member_id`(=team_members.id)를 `users.id`(targetUserId)로 조회. 두 UUID가 달라 exemption이 항상 null → 면제/휴회/부상 회원에게도 지각·불참 벌금 자동 생성. — 먼저 `team_members.id`를 얻어 그 값으로 면제 조회.

### 푸시·알림 정합성

**[High][API 푸시] invite-nudge 중복 방지 쿼리 user_id 누락 — 전체 팀 넛지 일괄 차단** — `src/app/api/push/invite-nudge/route.ts:37-43` — 중복 체크가 title+created_at만 보고 `.eq('user_id', president.user_id)` 누락. 어느 회장이든 24h 내 같은 제목 알림을 받은 사람이 한 명이라도 있으면 나머지 모든 팀 넛지가 스킵. match-nudge는 user_id 필터를 올바르게 포함(불일치). — user_id 조건 추가.

**[High][API cron] 0-0 경기는 result_pushed가 영영 안 세팅 — 결과 푸시 누락** — `src/app/api/cron/match-result/route.ts:62` — goals 빈 배열이면 claim UPDATE 없이 skip → `result_pushed=false` 유지로 7일간 매일 재쿼리·항상 skip, 7일 후 영영 미발송. — skip 블록 제거 후 0:0으로 계속 진행하거나 skip 전 `result_pushed=true` claim.

**[High][lib/server] 인앱 알림이 push 구독 여부와 무관하게 무조건 삽입** — `src/lib/server/sendPush.ts:45` — notifications insert를 먼저 하고 `subs.length===0`이면 early return. 미구독 유저에게도 알림 row 누적. 모든 push 경로가 거치므로 영향 광범위. — notifications insert를 구독 조회 이후로 이동하거나 구독 유저 집합과 교차한 targetUserIds만 대상으로.

### 클라이언트 silent-failure / 크래시

**[High][lib 유틸] 서버 push 구독 등록 실패 시 non-null 반환 — 켜짐 오인** — `src/lib/pushSubscription.ts:44-49` — `/api/push/subscribe` non-OK여도 `console.error`만 하고 `return subscription`. 호출자 `if (!sub)`가 성공 판정 → `setPushEnabled(true)`. UI는 '푸시 켜짐'이나 서버 미등록으로 알림 영원히 안 옴. — 실패 시 `null` 반환 또는 throw.

**[High][components 전술판] saveToApi / saveToTacticsBoard try/catch 부재 — 스피너 고착 + 상태 불일치** — `src/components/TacticsBoard.tsx:166`, `src/components/AutoFormationBuilder.tsx:1045` — apiMutate reject 시 `setSaving(false)`·로컬 상태 갱신·`match-squads-saved` dispatch·`onGenerated` 콜백이 모두 미실행. '저장 중...' 무한 고착, DB 불일치, 구독자 미갱신. — try/finally로 감싸 finally에서 `setSaving(false)` 보장, catch에서 토스트.

**[High][components UI] PollBlock 투표 현황 API res.ok 미검사 → runtime crash** — `src/components/board/PollBlock.tsx:38-40` — 403/500 응답 바디가 `{error}`인데 그대로 `setDetail` → `detail.options.map()`에서 TypeError. Sheet가 하얗게 뻗음. — `if (!res.ok) { setDetail(null); return; }`를 json 파싱 전에 추가.

---

## 🟡 Medium (44건)

| 영역 | file:line | 이슈 |
|------|-----------|------|
| 전술 탭 | `MatchTacticsTab.tsx:259-262` | `allSlotsFilled` 기대 슬롯을 1쿼터 포메이션 고정 계산 → 쿼터별 슬롯 수 다르면 AI 버튼 오작동 |
| 전술 탭 | `MatchDiaryTab.tsx:297-300` | `handleShare` clipboard 실패 시 try/catch 없어 조용히 실패 |
| 대시보드 | `getDashboardData.ts:311` | 대시보드 전적은 REGULAR만, 기록 탭은 전체 match_type → 수치 불일치 |
| 기록 UI | `RecordsClient.tsx:268-275` | `openDetail` fetch `!res.ok` 미체크 → 4xx/5xx를 빈 목록으로 처리 |
| 회비 UI | `DuesRecordsTab.tsx:577` | 단건 삭제 `handleDeleteRecord` await 누락 → uncaught rejection |
| 게시판 | `BoardClient.tsx:138` | isGlobal 작성 권한을 `userName === '김선휘'` 하드코딩 이름 비교로만 게이트 |
| 회비 UI | `DuesStatusTab.tsx:387` | PaymentStats fetch 에러 빈 catch로 삼킴 |
| 설정 | `ClientLayout.tsx:150` | markAllRead가 `is_read`(snake) 전송, API는 `body.isRead`만 읽음 → 읽음 처리 안 됨 |
| 설정 | `SettingsClient.tsx:273` | `handleDeleteTeam` DELETE 실패해도 에러 무시·무조건 /login redirect |
| 설정 | `PersonalSettings.tsx:163` | 등번호 조회 이름 기반 매칭 → 동명이인에 타인 memberId 덮어씀 |
| API AI | `match-summary/[matchId]/route.ts:22` | 재생성 POST 역할 체크 없음 → MEMBER가 재생성 카운터 소진 |
| API AI | `aiUsageLog.ts:98` | `checkRateLimit` read-then-write race → 동시 요청 시 한도 초과 |
| API AI | `aiUsageLog.ts:42` | OCR per-user 일 20회 캡 미구현(팀 월 100만 체크) |
| API 경기 | `goals/route.ts:146-147` | 골 PUT quarter 범위 검증 없음(POST 대비) → 999/음수 저장 가능 |
| API 경기 | `goals/route.ts:154` | 골 PUT scorerId 필수 검증 없음 → 득점자 null 골 생성 가능 |
| API 회비 | `payment-status/route.ts:44` | GET 핸들러 내부 DB 쓰기(UPSERT) → StrictMode 이중 호출 시 race |
| API 회비 | `payment-status/route.ts:93` | selfReport/POST memberId 팀 소속 검증 없음 |
| API 회비 | `guests/route.ts:130` | DELETE/PUT 소유권 확인 후 `.eq('id', id)`만으로 삭제 → TOCTOU |
| API 회비 | `guests/route.ts:57` | guests POST/PUT name 미검증 → 빈/null 이름 용병 생성 |
| API 회비 | `seasons/route.ts:88` | 시즌 활성화 PUT 전체 비활성화 쿼리 오류 무시 → is_active=true 2개 가능 |
| API 인증 | `teams/check-name/route.ts:1-22` | 팀명 중복 확인 인증 없음 → 미인증 팀명 열거 |
| API 인증 | `account/withdraw/route.ts:117-119` | 탈퇴 시 MVP `candidate_id` 레코드 미삭제 → 14일간 익명 후보가 MVP 집계 포함 |
| API 인증 | `account/withdraw/route.ts:114-119` | 탈퇴 개인정보 삭제 실패가 조용히 무시 |
| API 인증 | `internal-teams/route.ts:59-71` | 자체전 편성 저장 비원자적 delete+insert → insert 실패 시 편성 유실 |
| API 인증 | `teams/search/route.ts:30-38` | 팀 검색 N+1(팀당 멤버 count 개별 쿼리) |
| API 카드 | `weather/route.ts:71` | 날씨 API 인증 없음 → OPENWEATHERMAP 키 외부 소진 |
| API 카드 | `posts/vote/close/route.ts:32-39` | 투표 마감 권한을 ctx.teamRole 대신 별도 SELECT로 검사(DB 왕복 낭비) |
| cron | `autoCompleteMatches.ts:94` | `autoCompleteTeamMatches`에 7일 하한 가드 없음 → MVP/OVR 푸시 폭탄 |
| cron | `no-vote-penalty/route.ts:49` | SCHEDULED만 대상 → 당일 마감·어제 경기 벌금 누락 |
| lib/server | `getDashboardData.ts:481` | `!myUpcomingVoteRes.data` 빈 객체 통과 우려 → `.data?.id` 명시 검사 |
| lib/server | `getDashboardData.ts:687` | mySeasonStats null 시 '시즌 없음'처럼 보임 |
| lib/server | `processRoleGuidePush.ts:77` | 역할 가이드 푸시 경기당 유저 수만큼 N+1(참석 20명 = 40 round-trip) |
| lib 코어 | `mvpThreshold.ts:49-59` | `pickStaffDecision`가 다수 운영진 상이 후보 투표 시 삽입 순서로 비결정론 |
| lib 코어 | `sessionSign.ts:57-58` | 서명 길이 검사가 바이트 수 비교 |
| lib 훅 | `useAsyncAction.ts:51-59` | `useItemAction` state 기반 중복 방지가 race 취약·불필요 리렌더 |
| components | `AutoFormationBuilder.tsx:969` | attendingPlayers 동기화 useEffect에 deps 누락 → stale closure |
| components | `MemberEditModal.tsx:911` | 모달 저장 핸들러 전부 void 처리 → 실패 시 피드백 없음 |
| components | `PlayerRatingDialog.tsx:55` | `window.confirm` 사용(useConfirm 패턴 불일치)·PWA 차단 가능 |
| components | `SeasonAwardsPage.tsx:307-309` | SeasonSelector `onChange={() => {}}` dead control + 시즌 하드코딩 |
| 테스트 | `ai-tactics.test.ts:108` / `ai-full-plan.test.ts:31` | 죽은 `kimSession`(name=김선휘) feature-gate 픽스처 → false confidence |
| 테스트 | `mvp.test.ts:147` | `mvp_vote_staff_only=true` 시 MEMBER 차단·STAFF 자동확정 경로 미검증 |

---

## 🟢 Low / 정리거리 (52건)

**삼켜진 에러 / 미처리 응답**
- `MatchTacticsTab.tsx:322-345` 자체전 저장 apiMutate 에러 미처리(랜덤편성 실패해도 성공 토스트)
- `RecordsClient.tsx:1050-1058` 프로필 공유 clipboard await·catch 누락
- `MoreClient.tsx:90-94` / `SettingsClient.tsx:264` handleLogout fetch 실패해도 이동·상태 미복원
- `ClientLayout.tsx:194` fetchTeams `res.ok` 미체크
- `DuesSettingsTab.tsx:519` / `DuesBulkTab.tsx:527` / `DuesRecordsTab.tsx:192` apiMutate error 미확인
- `match-summary/[matchId]/route.ts:61` Promise.all 4쿼리 오류 묵살 → 빈 후기 저장
- `sseStream.ts:40-48` HTTP 오류 시 onError + throw 이중 호출

**side-effect / 다이얼로그 불일치**
- `MatchDiaryTab.tsx:411-413` 사진 삭제 `window.confirm`(패턴 불일치)
- `auth/[...nextauth]/route.ts:1-39` 미사용 NextAuth 라우트 잔존
- `profile/image/route.ts:34-48` 이미지 교체/삭제 시 이전 Storage 파일 미정리(고아 파일)
- `PlayerProfilePage.tsx:408-419` shareToast setTimeout clearTimeout 누락
- `DashboardClient.tsx:23-24` `DESIGN_PREVIEW_USER_ID` 하드코딩 미완성 UI 노출

**단순화 / dead code**
- `MatchDiaryTab.tsx:281` `scorers` 계산만 하고 공유 텍스트 미포함·변수명 오류
- `DuesClient.tsx:195,303` `paymentStatusRaw ?? []` — useApi 초기값 []이라 dead code
- `aiTeamStats.ts:385` mvpThreshold dynamic import 매 호출(정적 import로)

**보안(이름/문자열 기반 판정)**
- `admin/page.tsx:13` 관리자 인증을 `name !== '김선휘'`로만 판단(이름 변경 시 접근). is_admin/userId 기반으로
- `team-stats/opponent/route.ts:20` 역할 체크 없음(전체 공개) — 의도면 주석 명시

**엣지케이스 / perf**
- `mvp/route.ts:52` candidateId 팀 소속 미검증 / `attendance/route.ts:14-38` matchId 없는 IN절 무제한
- `RecordsClient.tsx:293-297`·`records/route.ts:113` mode=all 출석률 분모 오류
- `RecordsClient.tsx:571-614` teamRecord SSR 고정 → 시즌 변경 시 미갱신
- `DuesClient.tsx:439` 내 납부 상태 카드 로딩 중 조용히 숨김
- cron N+1: `match-result:53`·`no-vote-penalty:75`·`hard-delete-withdrawn:44`·`penalties/sync:60`·`teams/search:27`(LIKE 와일드카드 미이스케이프)
- `auth.ts:26-36` AUTH_SYNC_CACHE 상한 +1 / `formationAI.ts:83-93` fieldPlayerCount=0 silently null
- `aiMatchSummaryCache.ts:41` userId 없을 때 rate limit 통과 / `getDashboardData.ts:150-152` todayDateOnly UTC vs KST 불일치 / `getRecordsData.ts:207-208` Math.max 출전수 중복 카운트
- `kakaoShare.ts:17-27` SDK 로드 실패 시 sdkLoading 미초기화 / `useLocalStorage.ts:32-35` key 변경 시 write-effect 오염 / `gifExport.ts:324-327` revokeObjectURL 1초 부족
- `MemberBulkUploadModal.tsx:194` submit 중복 방지 guard 없음

**타입 / 도메인 정합**
- `validators/safeText.ts:5` DANGEROUS_PATTERN에 backtick(`) 누락 → AI 프롬프트 경로 식별자 인젝션 여지
- `PlayerProfilePage.tsx:576-581` signature 빈 문자열 시 빈 인용부호 노출
- `PlayerRadarChart.tsx:44` 공헌도 축 정규화 스케일 불일치

**테스트 커버리지 갭**
- `helpers/db.ts:27` createMockDb `.count()` 미지원 → count 쿼리 항상 null
- `goals.test.ts:123` quarter=0 → null 변환 미검증 / `posts.test.ts:128` is_global·is_pinned 권한 분기 미검증

---

## 교차 테마 (구조적 수정 대상)

1. **STAFF+ API 게이트가 UI에만 있고 서버엔 없음** — `ai/tactics`, `ai/full-plan`, `ai/match-summary`, `dues/summary`, `dues/payment-stats`, `dues/member-status`, `dues/payment-status PUT`, `push-test`, `team-stats/opponent`. UI 게이트는 직접 호출 방어가 안 됨.
2. **이름 문자열(`'김선휘'`) 기반 권한/플래그 판정** — `BoardClient.tsx:138`, `admin/page.tsx:13`, 테스트 `kimSession` 2곳. userId/`is_admin` 컬럼 기반으로 통일 필요.
3. **삼켜진 에러 / `!res.ok` 미검사** — UI·API 전반. fetch는 res.ok 미검사로 빈 상태/crash, apiMutate는 `{error}` 미구조분해로 실패해도 성공 처리.
4. **try/catch·finally 부재로 로딩 state 고착** — `TacticsBoard.saveToApi`, `AutoFormationBuilder.saveToTacticsBoard`, `TeamSettings.handleTeamSubmit`, `MemberBulkUploadModal.submit`.
5. **`window.confirm` 직접 사용(useConfirm 패턴 이탈)** — `MatchDiaryTab.tsx:411`, `PlayerRatingDialog.tsx:55`. PWA/인앱브라우저에서 무음 false.
6. **team_id 스코프 없이 matchId/postId만으로 접근** — `comments POST`, `share-card`, `persistCoachAnalysis`, `mvp candidateId`. service_role 환경에서 크로스팀 노출.
7. **ID 타입 혼용(users.id ↔ team_members.id)** — `attendance-check` 면제 조회(벌금 오생성), `PersonalSettings` 등번호(동명이인 덮어씀), MVP 집계 브릿지.
8. **cron/SSR push 경로의 N+1 및 가드 누락** — `match-result`, `no-vote-penalty`, `invite-nudge`, `processRoleGuidePush`, `teams/search`. 7일 가드/user_id 필터 누락으로 푸시 폭탄/일괄 차단.
9. **read-then-write race** — `aiUsageLog.checkRateLimit`, `alpha-testers` cap, `payment-status` GET 내부 upsert, `internal-teams` delete+insert. 트랜잭션 부재로 원자성 미보장.

> ✅ Realtime filter-없는 전체 구독(과거 WAL 폭주 사고 패턴)은 16개 영역 어디에서도 발견되지 않음 — 기존 안전 패턴 유지 중.

---

## 권장 수정 Top 10

1. **`dues/payment-status` PUT에 `requireRole(DUES_RECORD_ADD)` 추가** — 유일한 Critical (`route.ts:135`).
2. **회비 staffOnly GET 3종 + AI STAFF+ 2종 + push-test에 서버 역할 게이트 추가** — 교차 테마 1. UI 게이트만 있는 직접 호출 노출 일괄 차단.
3. **`auth.ts` membership=null 시 teamId·teamRole 초기화** — 강퇴/탈퇴자 권한 우회 세션 결함.
4. **OAuth state redirect 경로 화이트리스트 검증** — 카카오 로그인 후 외부 피싱 차단 (`kakao/callback:88-95`).
5. **comments POST·share-card·persistCoachAnalysis에 team_id 스코프 추가** — 크로스팀 삽입·노출·덮어쓰기 차단.
6. **`attendance-check` 면제 조회를 team_members.id 기준으로 수정** — 면제/휴회/부상 회원 벌금 오생성 버그.
7. **`sendPush.ts` 인앱 알림을 구독 유저로 한정** — 미구독 다수 유저 알림 누적 광범위 영향.
8. **`TacticsBoard.saveToApi`·`AutoFormationBuilder.saveToTacticsBoard`에 try/finally** — 저장 실패 시 무한 스피너 + DB 불일치.
9. **invite-nudge user_id 필터 + cron CRON_SECRET 인증 + match-result 0-0 처리** — 푸시 cron 3대 정합성/보안 결함.
10. **MatchRecordTab 자책골 스코어 계산을 공유 헬퍼로 통일** — 같은 경기 두 화면 스코어 불일치 근본 제거.
