# 경기 모듈 컨텍스트

## 경기 상세 탭 (`[matchId]/MatchDetailClient.tsx`)

```
정보 | 투표 | 전술 | 출석 | 기록 | 일지
```

- 6개 탭 전부 텍스트 전용, `flex-1` 균등 분할
- 좁은 화면(320px 이하)에서 터치 타겟 작아짐 — 개선 시 아이콘 추가 고려
- 전술 탭: `TacticsBoard` 컴포넌트 (Canvas 기반 드래그)

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

## 주요 파일

- `MatchesClient.tsx` — 경기 목록 (캘린더/리스트 뷰)
- `[matchId]/MatchDetailClient.tsx` — 경기 상세 6탭
- `[matchId]/TacticsBoard.tsx` — 전술판 Canvas 컴포넌트
