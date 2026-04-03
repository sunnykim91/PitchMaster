# 팀별 알림 시간 설정 구현 플랜

## 배경

현재 모든 크론이 고정 시간에 전체 팀을 일괄 처리함.
- 경기 결과 푸시가 22시에 도는데, 23시에 끝나는 팀은 못 받음
- 회비 알림이 1일/15일 고정인데, 팀마다 납부일이 다름


## DB 마이그레이션

teams 테이블에 JSONB 컬럼 하나 추가:

```sql
ALTER TABLE teams ADD COLUMN IF NOT EXISTS notification_settings jsonb
  NOT NULL DEFAULT '{
    "match_result_hour": 22,
    "vote_reminder_hour": 9,
    "dues_reminder_days": [1, 15]
  }'::jsonb;
```

기존 팀은 DEFAULT로 현재와 동일하게 동작.
JSONB라 나중에 필드 추가해도 마이그레이션 불필요.


## vercel.json 변경

경기 결과, 투표 알림, 회비 알림 3개를 **매시간 실행**으로 변경:

```json
{ "path": "/api/cron/match-result",  "schedule": "0 * * * *" }
{ "path": "/api/cron/vote-reminder", "schedule": "0 * * * *" }
{ "path": "/api/cron/dues-reminder", "schedule": "0 * * * *" }
```

넛지류(match-nudge, invite-nudge)는 기존 스케줄 유지.


## 크론 라우트 변경

### 공통: cronUtils.ts (신규)

현재 UTC 시각을 KST로 변환해서, 팀의 설정 시간과 비교하는 유틸.
`Intl.DateTimeFormat`의 `timeZone` 옵션 사용 (외부 라이브러리 불필요).

```typescript
// 의사코드
function getKSTHour(): number  // 현재 KST 시각(hour)
function getKSTDay(): number   // 현재 KST 일자(day of month)
function getKSTDate(): string  // 현재 KST 날짜 "YYYY-MM-DD"
```

### match-result 크론

현재: 모든 COMPLETED 경기 조회 → 전체 발송
변경:
1. 현재 KST hour 확인
2. `notification_settings->>'match_result_hour'` == 현재 hour인 팀만 조회
3. 해당 팀의 COMPLETED 경기만 발송

기존 `result_pushed` 플래그로 중복 방지 → 안전.

### vote-reminder 크론

현재: 내일 마감인 경기의 미투표자 전체 발송
변경:
1. `notification_settings->>'vote_reminder_hour'` == 현재 hour인 팀만
2. 나머지 동일

중복 방지 로직 추가 필요 (당일 동일 match_id 알림 체크).

### dues-reminder 크론

현재: 1일/15일에만 실행, 모든 팀
변경:
1. 현재 KST day 확인
2. `notification_settings->'dues_reminder_days'`에 오늘 날짜가 포함된 팀만
3. 현재 hour도 체크 (오전 9시 등, 추가 설정 가능)

기존 7일 이내 중복 체크 → 안전.


## Teams API 변경

GET: select에 `notification_settings` 추가
PUT: `notificationSettings` 필드 수신 시 업데이트 + 유효성 검증
- hour: 0~23 정수
- days: 1~31 정수 배열, 최대 4개
- 잘못된 값 거부


## UI — 팀 설정 페이지

기존 설정 카드 아래에 "알림 설정" 섹션 추가:

```
[알림 설정]
├── 경기 결과 알림: [22시 ▼]  (0시~23시 셀렉트)
├── 투표 마감 알림: [9시 ▼]   (0시~23시 셀렉트)
├── 회비 알림 발송일: [1일] [15일] (다중 선택)
└── 안내: "한국 시간(KST) 기준입니다"
```

timezone은 MVP에서 Asia/Seoul 고정. 해외 팀 생기면 추후 추가.


## 구현 순서

| 순서 | 작업 | 주의사항 |
|:---:|:---|:---|
| 1 | DB 마이그레이션 | Supabase에서 직접 실행 |
| 2 | cronUtils.ts 공통 유틸 | 외부 라이브러리 없이 Intl API 사용 |
| 3 | Teams API 수정 (GET/PUT) | 유효성 검증 필수 |
| 4 | match-result 크론 수정 | result_pushed로 중복 안전 |
| 5 | vote-reminder 크론 수정 | 중복 방지 로직 추가 필요 |
| 6 | dues-reminder 크론 수정 | 기존 7일 체크로 안전 |
| 7 | UI — 팀 설정 알림 섹션 | 운영진만 수정 가능 |
| 8 | vercel.json 스케줄 변경 | **반드시 마지막에 배포** |

⚠️ 단계 8은 크론 코드가 먼저 매시간 실행에 대응한 후에 변경해야 함.
안 그러면 필터링 없이 매시간 전체 팀에 알림이 24번 발송됨.


## 위험 요소

- vote-reminder에 중복 방지 로직 없음 → 추가 필요
- Vercel Hobby 플랜 크론 제한 확인 필요 (매시간 3개 = 하루 72회)
- 분 단위 실행 오차 있을 수 있으나, hour 비교라 문제없음
