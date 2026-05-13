# Supabase 마이그레이션 컨텍스트

## 🔴 번호 충돌 주의 (2026-04-22 기준)

**00027 번호가 두 파일에 중복됨**:
- `00027_ai_signature_cache.sql` (2026-04-15 16:02)
- `00027_team_default_player_count.sql` (2026-04-15 20:34)

**프로덕션 DB에는 둘 다 이미 적용된 상태**. `supabase_migrations.schema_migrations` 테이블에 "00027" 버전이 첫 파일 기준으로만 기록돼 있을 가능성이 있음.

**절대 금지**:
- 두 파일 중 하나를 00028 로 리네임 → schema_migrations 와 drift → CI/배포 환경에서 두 번째 파일 재실행 → 유니크 제약 충돌로 전체 마이그레이션 실패

**대응**:
- 현재 파일명 그대로 유지
- 새 마이그레이션은 반드시 **`ls supabase/migrations/` 로 최신 번호 직접 확인** 후 **마지막 번호 + 1**
- CLAUDE.md 문서는 항상 최신 상태가 아닐 수 있음 — 파일 시스템이 단일 진실원
- 번호 충돌 여부는 `ls supabase/migrations/ | awk -F_ '{print $1}' | sort | uniq -c | awk '$1>1'` 로 체크 필수

**현재 최신 (2026-04-24 기준)**: `00045_mvp_push_and_ovr_tracking.sql` — 다음은 `00046`

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

## 🚨 새 테이블 추가 시 GRANT 의무 (2026-05-30~)

Supabase 정책 변경:
- **2026-05-30**: 신규 프로젝트는 `public` 스키마 테이블이 Data API(supabase-js·PostgREST·GraphQL)에 기본 미노출
- **2026-10-30**: 기존 프로젝트(= PitchMaster)도 강제 적용
- 기존 테이블 grant는 유지 — 영향 없음. **새로 만드는 테이블만** 명시 grant 필요
- GRANT 누락 시 PostgREST가 `42501` 에러 + 필요한 GRANT 문 그대로 응답

### `CREATE TABLE` 뒤에 항상 붙일 템플릿

```sql
create table if not exists public.your_table (
  id uuid primary key default uuid_generate_v4(),
  -- ...
);

-- ❶ Data API 노출 GRANT (anon은 보통 select 만, 필요 없으면 생략)
grant select on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;

-- ❷ RLS 활성화 (이 프로젝트는 모든 테이블 RLS 필수)
alter table public.your_table enable row level security;

-- ❸ 정책 (PitchMaster 표준: team_members 소속 기반)
create policy "members can read team rows"
  on public.your_table
  for select to authenticated
  using (
    exists (
      select 1 from public.team_members m
      where m.team_id = public.your_table.team_id
        and m.user_id = (select auth.uid())
    )
  );
```

### 빠진 GRANT 진단

```sql
-- 현재 테이블에 어떤 role이 어떤 권한을 가졌는지
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'your_table';
```

### 점검 1회 (10/30 전)

Supabase Studio → Security Advisor에서 grant 누락 테이블 확인. 기존 테이블은 자동 유지지만, 마이그레이션 재실행 시점이나 새 환경 복제 시 누락 발생 가능.
