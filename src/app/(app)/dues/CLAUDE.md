# 회비 모듈 컨텍스트

## 탭 구조

| 파일 | 탭명 | 접근 권한 |
|------|------|-----------|
| `DuesStatusTab.tsx` | 납부현황 | **staffOnly** (STAFF/PRESIDENT만) |
| `DuesRecordsTab.tsx` | 납부기록 | 전체 (본인 기록) |
| `DuesPenaltyTab.tsx` | 벌금 | 전체 |
| `DuesSettingsTab.tsx` | 설정 | STAFF/PRESIDENT만 |
| `DuesBulkTab.tsx` | 일괄처리 | STAFF/PRESIDENT만 |

**주의**: `DuesClient.tsx`에서 `staffOnly: true` 탭 필터링 처리됨.
일반 회원은 자기 납부 기록을 `DuesRecordsTab`에서만 볼 수 있음.

## 주요 컴포넌트

- `DuesPenaltyTab` — 벌금 기록 조회 + 납부처리 UI (완전 구현)
- `DuesSettingsTab` — penalty_rules CRUD (생성/삭제/활성화 토글) (완전 구현)
- `DuesStatusTab` — 월별 수지결산(`MonthlySettlement`) 포함

## 미구현 항목

- **회비 선납** (6개월/1년) — UI도 로직도 없음. 추후 추가 필요.

## API 엔드포인트

- `POST /api/dues/penalties` — 벌금 기록 생성 (권한: DUES_RECORD_ADD)
- `POST /api/dues/penalty-rules` — 벌금 규칙 생성 (권한: DUES_SETTING_EDIT)
