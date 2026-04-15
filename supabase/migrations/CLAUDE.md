# Supabase 마이그레이션 컨텍스트

## 실행 순서 (00001 → 최신)

| 파일 | 내용 |
|------|------|
| 00001 | 초기 스키마 (teams, users, matches, team_members) |
| 00002 | penalties, guests, match_diary 테이블 추가 |
| 00003 | cascade FK + upsert 정책 |
| 00004 | rules, file_url 컬럼 |
| 00005 | board, polls, pin 기능 |
| 00006 | notification_settings 수정 |
| 00007 | team_join_requests 테이블 |
| 00008 | match_uniform_type 컬럼 |
| 00009 | 누락된 테이블 RLS 활성화 |
| 00010 | INTERNAL 경기 타입 + `stats_included BOOLEAN DEFAULT TRUE` |
| 00011 | match_comments 테이블 |
| 00012 | composite 인덱스 추가 |
| 00013 | jersey_number, team_role 컬럼 |
| 00014 | goal_type 구분 |
| 00015 | default_formation 설정 |

## 핵심 테이블 관계

```
teams
  └── team_members (user_id, team_id, role: PRESIDENT/STAFF/MEMBER)
  └── matches
        └── match_attendances
        └── match_stats
        └── match_diary
  └── dues_records
  └── penalty_records
  └── penalty_rules
  └── board_posts
        └── post_comments
        └── post_likes
```

## RLS 정책 원칙

- 모든 테이블 RLS 활성화 (00009에서 누락분 보완)
- `team_members` 소속 여부로 팀 데이터 접근 제어
- PRESIDENT/STAFF 역할로 쓰기 권한 분리

## 새 마이그레이션 작성 시

- 파일명: `000XX_설명.sql` (순번 유지)
- 기존 RLS 정책 영향 여부 반드시 확인
- `supabase db push`로 로컬 적용 후 커밋
