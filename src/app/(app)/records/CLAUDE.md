# 기록/통계 모듈 컨텍스트

## RecordsClient.tsx 탭 구조 (1007줄)

```typescript
type RecordsTab = "my" | "ranking" | "all" | "awards"
```

| 탭 | 내용 |
|----|------|
| `my` | 내 스탯 (레이더 차트) |
| `ranking` | 팀원 랭킹 (바 차트) |
| `all` | 전체 기록 테이블 |
| `awards` | 시즌 수상 내역 |

탭 상태는 URL `?tab=` 쿼리로 동기화됨 (`window.history.replaceState`).

## 차트 컴포넌트 (dynamic import)

- `PlayerRadarChart` — 개인 스탯 레이더 (`src/components/charts/PlayerRadarChart.tsx`)
- `BarRankingChart` — 팀 랭킹 바 차트 (`src/components/charts/BarRankingChart.tsx`)
- 둘 다 `dynamic()` lazy import (초기 번들 최적화)

## 시즌 데이터 구조

```typescript
Season { id, name, startDate, endDate, isActive }
RecordStat { memberId, name, goals, assists, rating, ... }
```

## 권한

- 전체 기록 조회: MEMBER 이상 (공개)
- `effectiveRole` — ViewAsRole 컨텍스트로 역할 오버라이드 가능 (개발/테스트용)

## 다운로드/공유

- `Download` 아이콘 → 기록 다운로드 (구현 여부 확인 필요)
- `Share2` 아이콘 → 공유 기능 (구현 여부 확인 필요)

## API

- `GET /api/records?seasonId=...` — 시즌별 스탯
- `GET /api/records/seasons` — 시즌 목록
