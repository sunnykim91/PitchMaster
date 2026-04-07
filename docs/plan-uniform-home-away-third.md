# 유니폼 홈/원정/써드 각각 별도 설정 플랜

## 배경

현재 팀 유니폼은 `uniform_primary`, `uniform_secondary`, `uniform_pattern` 3개 컬럼으로
홈/원정이 색상만 반전되고 패턴은 공유됨.

실제로는:
- 홈: 빨강 단색
- 원정: 파랑+흰 세로 스트라이프
- 써드: 검정 단색

이렇게 각각 다를 수 있음. 사용자 피드백으로 써드 유니폼 + 다양한 컬러 요청도 있음.


## DB 마이그레이션

teams 테이블에 JSONB 컬럼 하나를 추가하는 방식 권장.
기존 컬럼(uniform_primary, uniform_secondary, uniform_pattern)은 하위 호환으로 유지.

```sql
ALTER TABLE teams ADD COLUMN IF NOT EXISTS uniforms jsonb DEFAULT NULL;
```

uniforms JSONB 구조:
```json
{
  "home": {
    "primary": "#e8613a",
    "secondary": "#ffffff",
    "pattern": "SOLID"
  },
  "away": {
    "primary": "#2563eb",
    "secondary": "#ffffff",
    "pattern": "STRIPES_VERTICAL"
  },
  "third": {
    "primary": "#000000",
    "secondary": "#ffffff",
    "pattern": "SOLID"
  }
}
```

기존 데이터 마이그레이션:
```sql
UPDATE teams SET uniforms = jsonb_build_object(
  'home', jsonb_build_object('primary', uniform_primary, 'secondary', uniform_secondary, 'pattern', uniform_pattern),
  'away', jsonb_build_object('primary', uniform_secondary, 'secondary', uniform_primary, 'pattern', uniform_pattern)
) WHERE uniforms IS NULL AND uniform_primary IS NOT NULL;
```


## 팀 설정 UI 변경

현재: 홈/원정 색상 2개 + 패턴 1개 (공유)

변경:
```
[유니폼 설정]
├── 탭: 홈 | 원정 | 써드 (3개 탭)
├── 각 탭마다:
│   ├── 메인 색상: 컬러 피커
│   ├── 서브 색상: 컬러 피커
│   ├── 패턴: SOLID / 세로 / 가로 / 대각선
│   └── 미리보기: 져지 아이콘
└── 프리셋 색상: 검정, 흰색, 빨강, 파랑, 초록, 주황, 노랑, 보라 (빠른 선택)
```

### 프리셋 색상
사용자가 "검/흰, 레드" 같은 빠른 선택을 원함.
주요 축구 유니폼 색상 프리셋:
- 검정 (#000000)
- 흰색 (#FFFFFF)
- 빨강 (#DC2626)
- 파랑 (#2563EB)
- 초록 (#16A34A)
- 주황 (#EA580C)
- 노랑 (#EAB308)
- 보라 (#7C3AED)
- 하늘 (#38BDF8)
- 분홍 (#EC4899)


## 경기 생성/수정 시 유니폼 선택

현재: 홈/원정 2개 버튼
변경: 홈/원정/써드 3개 버튼 (써드가 설정된 팀만 써드 표시)

matches 테이블의 `uniform_type` 컬럼:
- 현재: "HOME" | "AWAY"
- 변경: "HOME" | "AWAY" | "THIRD"


## 전술판 유니폼 표시

현재: uniformMode 상태 (HOME/AWAY)로 색상 전환
변경: uniformMode에 THIRD 추가, 팀 설정의 uniforms에서 해당 타입의 색상/패턴 조회


## API 변경

### GET/PUT /api/teams
- uniforms JSONB 필드 추가
- 기존 uniform_primary/secondary/pattern은 유지 (하위 호환)
- uniforms가 있으면 우선 사용, 없으면 기존 필드에서 추론

### GET /api/matches
- uniform_type에 "THIRD" 추가


## 구현 순서

| 순서 | 작업 | 파일 |
|:---:|:---|:---|
| 1 | DB 마이그레이션 (uniforms JSONB) | supabase/migrations/00020_uniforms.sql |
| 2 | Teams API 수정 (GET/PUT) | src/app/api/teams/route.ts |
| 3 | 팀 설정 UI — 3탭 + 프리셋 컬러 | src/app/(app)/settings/TeamSettings.tsx |
| 4 | MatchInfoTab — 써드 유니폼 버튼 추가 | src/app/(app)/matches/[matchId]/MatchInfoTab.tsx |
| 5 | TacticsBoard — THIRD 유니폼 지원 | src/components/TacticsBoard.tsx |
| 6 | 경기 목록 카드 — 써드 유니폼 표시 | src/app/(app)/matches/MatchesClient.tsx |


## 주의사항
- 기존 팀은 uniforms가 NULL → 기존 uniform_primary/secondary/pattern에서 자동 생성
- 써드 유니폼은 선택사항 (설정 안 하면 버튼 안 보임)
- uniform_type "THIRD"는 써드가 설정된 팀에만 노출
- 프리셋 색상은 UI 편의 기능 (직접 입력도 가능)
