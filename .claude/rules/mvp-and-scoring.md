---
paths:
  - "src/lib/mvpThreshold.ts"
  - "src/lib/server/matchScore.ts"
  - "src/lib/server/getRecordsData.ts"
  - "src/lib/server/getDashboardData.ts"
  - "src/lib/server/getMatchesData.ts"
  - "src/lib/server/computeSeasonOvr.ts"
  - "src/app/api/records/**"
  - "src/app/api/matches/**"
  - "src/app/api/season-awards/**"
  - "src/app/(app)/matches/[matchId]/MatchRecordTab.tsx"
  - "src/app/(app)/matches/[matchId]/MatchInfoTab.tsx"
---

## 골 기록 설계 (2026-04-18 기준)

- `match_goals.quarter_number` — **nullable** (migration 00032). `null` = 쿼터 모름
- `+ 득점` / `+ 실점` 버튼: 원클릭 즉시 등록 (기본값: 득점자 UNKNOWN, 쿼터 null, 골유형 NORMAL)
- 상세 수정은 골 카드 수정 버튼 → 아코디언 폼에서 처리
- API: `quarter=0` → `null` 변환 저장, 유효범위 0~10 (`goals/route.ts`)

---

## MVP 집계 정책 (2026-04-23 기준)

**확정 조건** (둘 중 하나):
1. 운영진(STAFF+) 1명 이상이 해당 경기에 투표 → 즉시 확정 (투표율 무관, **1명만**)
2. 일반 팀원 투표가 실제 참석자(`attendance_status=PRESENT|LATE`) 70% 이상 → 최다득표자 확정. **공동 1등이면 전원 공동 MVP로 인정 (92차+ 정책)**

**구현 헬퍼** (`src/lib/mvpThreshold.ts`):
- `resolveValidMvps(votes, attendedCount, staffDecision)` — **정책 판정, 공동 1등 전원을 candidate_id 사전순 배열로 반환** (투표 동률 = 공동 MVP. 운영진 직접 지정은 1명만). 집계·기록 경로는 이걸 써서 동률 전원 +1.
- `resolveValidMvp(...)` — 단수 래퍼 (`resolveValidMvps(...)[0] ?? null`). 단수 winner가 필요한 레거시용. 동률은 사전순 첫 번째 (결정론적).
- `pickStaffDecision(rows, staffVoterIds)` — `is_staff_decision=true` OR 현재 STAFF+ voter 투표를 확정 후보로 리턴. 2026-04-20(커밋 `2d457b8`) 이전에 저장된 staff 투표가 `false`로 남아있는 백필 누락을 동적 치유.
- `resolveMvpWinnersByMatch(...)` — **경기별 확정 winner 배열 맵**(`Map<matchId, candidateId[]>`). "어느 경기에 누가 당선됐는지"가 필요한 경로(선수 프로필·OVR·선수카드 랭킹)용. 아래 `aggregateMvpsByMatch`가 이걸 공유.
- `aggregateMvpsByMatch(rows, attendedPerMatch, matchDateById, staffVoterIds, mvpVoteStaffOnly)` — **경기별 MVP 집계 단일 오케스트레이션**(→ resolveMvpWinnersByMatch → candidate_id별 횟수 맵). getRecordsData·records route·season-awards 가 복붙하던 ~25줄을 묶음. 여러 경기 횟수 집계 경로는 이걸, winner 배열이 필요하면 resolveMvpWinnersByMatch 를 쓸 것.

**집계 경로 12곳** — 하나 수정 시 전부 같이 건드려야 일관성 유지 (전부 정책 헬퍼 경유):
- SSR: `src/lib/server/getRecordsData.ts`, `src/lib/server/getDashboardData.ts`(동률 시 이름 병기) — getRecordsData·records route 는 `aggregateMvpsByMatch` 공유
- 선수 프로필 SSR: `src/app/player/[memberId]/page.tsx` (totalMvp + 팀 랭킹)
- API: `src/app/api/records/route.ts`(`aggregateMvpsByMatch`), `src/app/api/records/detail/route.ts` (`type=mvp`), `src/app/api/season-awards/route.ts`, `src/app/api/player-card/route.ts`, `src/app/api/share-card/route.ts`(동률 시 이름 병기)
- AI 캐시: `src/lib/server/aiTeamStats.ts` (24h TTL)
- AI 후기: `src/app/api/ai/match-summary/[matchId]/route.ts` — MOM 표시. **이전엔 단순 최다득표로 정책을 우회했으나(70% 게이트·운영진·공동 1등 무시) `resolveValidMvps`로 통일 (전수조사 수정)**
- 크론 OVR: `src/lib/server/computeSeasonOvr.ts` (경기 후 OVR 변동 감지)
- 실시간 UI: `MatchDiaryTab.tsx`(후기 탭)의 "현재 1위" 표시는 확정 정책과 별개 — 단수 leader만 표시 (건드리지 말 것)

**설정 토글**: 팀 설정 `mvp_vote_staff_only` — 일반 팀원 투표를 막는 게이트.

**운영진 즉시 확정은 (a) 토글 ON 이거나 (b) 경기일이 `STAFF_DECISION_POLICY_CUTOFF`(2026-05-04) 이전일 때만** 작동. 2026-05-04 이후 + 토글 OFF 팀에선 **운영진 투표도 일반 표로 처리(70% 룰 적용)** — `mvp/route.ts`의 `isStaffDecision = mvpVoteStaffOnly && isStaff`, 집계는 `shouldApplyNewMvpPolicy(matchDate, mvpVoteStaffOnly)` + `applyBackfillHealing: !newPolicy`로 분기. (CUTOFF는 과거 경기 MVP 결과 보존용.)

**UI 안내**: MVP 투표 카드에 threshold 미달 시 "참석자 70% 이상이 투표해야 공식 MVP로 확정됩니다. 미달 시 운영진이 직접 지정할 수 있어요." 문구 자동 노출.
