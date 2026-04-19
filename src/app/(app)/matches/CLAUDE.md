# 경기 모듈 컨텍스트

## 경기 상세 탭 (`[matchId]/MatchDetailClient.tsx`)

```
정보 | 투표 | 전술 | 출석 | 기록 | 일지
```

- 6개 탭 전부 텍스트 전용, `flex-1` 균등 분할
- 좁은 화면(320px 이하)에서 터치 타겟 작아짐 — 개선 시 아이콘 추가 고려
- 전술 탭: `TacticsBoard` 컴포넌트 (Canvas 기반 드래그)

## 전술 탭 구조 (2026-04-19 재정비)

카드 순서 프리셋 드롭다운은 제거되고 **flex `order` 기준 고정 순서**.

| order | 카드 | 노출 조건 |
|-------|------|----------|
| -10 | INTERNAL 팀 편성 | `match.matchType === "INTERNAL"` |
| -5 | 용병 관리 | `!isFormationComplete` (편성 미완료) |
| 10 | 자동 편성 빌더 | `canManage` |
| 20 | 전술판 | 항상 |
| 30 | **역할 가이드** | 축구 11인제만 |
| 40 | AI 코치 분석 | `canManage` |
| 95 | 용병 관리 | `isFormationComplete` (편성 완료) |

### 용병 카드 동적 위치

`guestOrder = isFormationComplete ? 95 : -5`

**편성 완료 엄격 정의** (`MatchTacticsTab` memo):
- 매 쿼터마다 해당 formation template의 정규 슬롯이 전부 채워진 squad가 DB에 존재
- 심판/촬영(`__` prefix)은 formation template slots에 없어 자연 제외
- 자체전은 A·B 중 하나라도 해당 쿼터 완성되면 인정
- `match.quarterCount` 0·undefined일 땐 무조건 미완료 간주

### match-squads-saved 이벤트 (2026-04-19 추가)

전술판 상태 동기화용 window CustomEvent.
- **발행**: `TacticsBoard.saveToApi` / `AutoFormationBuilder` 저장 성공 후 `window.dispatchEvent(new CustomEvent('match-squads-saved', { detail: { matchId } }))`
- **구독**: `MatchTacticsTab` (refetch `dbSquads`), `MatchRoleGuide` (reloadToken 증가)
- 포메이션 변경·배치 이동·쿼터별 다른 포메이션 모두 실시간 반영

## 역할 가이드 (`MatchRoleGuide` 컴포넌트, 2026-04-19 신규)

쿼터별 본인 포지션의 역할·주의점 표시.

- **지원 범위**: 축구 11인제만 (풋살·8/9/10인제는 조용히 숨김)
- **권한별 차등**:
  - MEMBER: 본인만 표시. 불참 시 안내, 전술판 미작성이면 섹션 숨김
  - PRESIDENT/STAFF: 드롭다운(용병 제외)으로 다른 선수 전환 + 전술판 미작성 시 포메이션 전체 포지션 폴백
- **쿼터 그룹화**: 같은 (formationId, role) 조합이면 비연속 쿼터도 하나로 합침 (예: "2·4쿼터 RCB" 한 카드). 포메이션 다르면 별도 카드 (whyItMatters·linkage가 달라짐)
- **데이터**: `src/lib/positionRoles/` — base 24 포지션 + override 10 포메이션 (base+override 병합 구조)

## match_type 종류

| 값 | 의미 |
|----|------|
| `REGULAR` | 정기 경기 |
| `FRIENDLY` | 친선 경기 |
| `TOURNAMENT` | 대회 |
| `INTERNAL` | 자체전 (`stats_included` 컬럼으로 스탯 분리 제어) |
| `EVENT` | 팀 행사/일정 |

## stats_included 컬럼 (migration 00010)

`INTERNAL` 경기에서 스탯을 전체 기록에 포함할지 제어.
랜딩에서 광고하는 "회식·MT 일정 등록"은 `EVENT` 타입으로 처리됨.

## match_squads 테이블 (전술판 영속 저장)

- `quarter_number` + `formation` + `positions` JSONB + 선택적 `side` (자체전 A/B)
- `positions` 구조: `{ [slotId]: { playerId, x, y, secondPlayerId? } | null }`
- `playerId`는 users.id / team_members.id / match_guests.id 중 하나 (용병 직접 ID 저장)
- `secondPlayerId`: 하프쿼터 교체 (반 쿼터 번갈아)
- GET `/api/squads?matchId=X[&side=A|B]` / POST 는 delete+insert upsert

## 주요 파일

- `MatchesClient.tsx` — 경기 목록 (캘린더/리스트 뷰)
- `[matchId]/MatchDetailClient.tsx` — 경기 상세 6탭
- `[matchId]/MatchTacticsTab.tsx` — 전술 탭 (카드 오케스트레이션)
- `[matchId]/TacticsBoard.tsx` — 전술판 Canvas 컴포넌트
- `components/MatchRoleGuide.tsx` — 역할 가이드 UI
- `lib/positionRoles/` — 포지션 역할 데이터 (base + override + 병합 유틸)
