---
paths:
  - "src/app/api/ai/**"
  - "src/lib/server/aiTeamStats.ts"
  - "src/lib/server/aiTacticsAnalysis.ts"
  - "src/lib/server/aiMatchSummary.ts"
  - "src/components/Ai*.tsx"
  - "src/app/(app)/matches/[matchId]/MatchTacticsTab.tsx"
  - "src/app/(app)/matches/[matchId]/AutoFormationBuilder.tsx"
  - "src/app/(app)/matches/[matchId]/AiCoachAnalysisCard.tsx"
  - "src/app/(app)/matches/[matchId]/MatchRoleGuide.tsx"
---

## AI 기능 설계 (2026-05-13 정정 — 전체 공개 상태)

### Feature Flag (현행)
```typescript
// page.tsx — 모두 true (전체 STAFF+ 공개)
const enableAi = true;                              // matches/[matchId]/page.tsx:19
const enableAi = true;                              // dues/page.tsx:10 (OCR)
const enableAi = true;                              // player/[memberId]/page.tsx:447
const enableAiSummary = true;                       // MatchDetailClient.tsx:152

// 클라이언트 — 풋살 분기 제거됨 (47차에 풋살 4 포메이션 등록 후)
const effectiveEnableAi = enableAi;
// 주석: "AI 코치 분석 + AI Full Plan: 축구·풋살 모두 활성"
```

> 과거 `session.user.name === "김선휘"` 게이트와 sportType=SOCCER 게이트는 **둘 다 풀림**. 비용 안전망은 rate limit + 이미지 해시 캐시.

### AI 기능 목록 (5개)
| 기능 | 위치 | 공개 범위 | 모델 |
|------|------|-----------|------|
| 선수 시그니처 | /player/[id] | **전체 공개 (축구·풋살)** | Haiku 4.5 |
| 경기 후기 | 경기 일지 탭 | **전체 공개 (축구·풋살). 단 LLM 아닌 결정론적 템플릿 (25차 이후)** | — |
| AI 코치 분석 | 전술 탭 | **전체 공개 (STAFF+, 축구·풋살)** | Haiku 4.5 |
| AI Full Plan | 자동편성 빌더 | **전체 공개 (STAFF+, 축구·풋살)** | Haiku 4.5 |
| OCR 거래 파싱 | 회비 일괄등록 | **전체 공개 (rate limit: 팀 월 100회 + 이미지 해시 캐시. per-user/일 캡 없음)** | Haiku 4.5 Vision |

> 풋살 차단 코드는 모두 제거됨(41차·71차). match-summary route 에 sport_type/futsal 검사 없음 — 전 종목 동일.

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
- 캡 (단일 source = `aiUsageLog.ts` MATCH_CAPS·MONTHLY_TEAM_CAPS — 수치 변경 시 코드만 보면 됨):
  tactics-coach 경기당 4·월 30 / tactics-plan 경기당 3·월 20 / ocr 월 100 (Clova 폴백 `/api/ocr`도 동일 캡 합산, 2026-06-10 추가)
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

### SSR 블로킹 이슈 — 해결됨 (102차 확인)
- 과거 `getMatchDetailData` SSR이 후기 생성을 await 블로킹하던 이슈는 **이미 해결**. 현재 `getMatchDetailData`는 `match.ai_summary`를 DB에서 바로 읽고(68줄), 첫 후기 생성은 클라이언트 `MatchDiaryTab`에서 트리거. `getOrComputeTeamStats` 블로킹 코드 없음.
