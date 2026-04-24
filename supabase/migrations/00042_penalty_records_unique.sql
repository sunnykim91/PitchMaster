-- ============================================================
-- 00042: penalty_records 중복 삽입 방지 UNIQUE 인덱스
-- ============================================================
--
-- 문제:
--   penalty_records 에 (match_id, rule_id, member_id) 중복 방지 제약이 없어,
--   아래 두 경로에서 같은 (경기·규칙·회원) 조합 벌금이 두 번 생성될 여지:
--     1. attendance-check generatePenalty (출석 체크 시 자동)
--     2. dues/penalties POST (운영진 일괄 생성)
--   현재는 코드 수준에서 existing 체크하지만 레이스 컨디션 시 중복 가능.
--
-- 현재 데이터 상태 (2026-04-24 조사):
--   - 전체 5건, 모두 고유 (match_id, rule_id, member_id) 조합
--   - member_id 는 모두 users.id 저장 (관례 확정)
--
-- 해결:
--   PARTIAL UNIQUE INDEX (match_id, rule_id, member_id)
--   WHERE match_id IS NOT NULL AND rule_id IS NOT NULL
--
--   - 경기·규칙 연결된 자동 벌금은 중복 방지
--   - 수동 벌금 (match_id 또는 rule_id NULL) 은 여러 건 허용
--     (운영진이 직접 추가하는 메모 성격 벌금 — 금액 다양 가능)
-- ============================================================

-- 1. 혹시 모를 과거 중복 정리 (현재 0건이므로 실질 no-op)
--    DELETE: 더 오래된 중복 제거 (최신 한 건만 유지)
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY match_id, rule_id, member_id
           ORDER BY created_at DESC
         ) AS rn
    FROM public.penalty_records
   WHERE match_id IS NOT NULL
     AND rule_id  IS NOT NULL
)
DELETE FROM public.penalty_records
 WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 2. PARTIAL UNIQUE INDEX 생성
CREATE UNIQUE INDEX IF NOT EXISTS penalty_records_match_rule_member_uniq
  ON public.penalty_records (match_id, rule_id, member_id)
  WHERE match_id IS NOT NULL AND rule_id IS NOT NULL;

-- 3. 컬럼 의미 명시 (향후 개발자 혼동 방지)
COMMENT ON COLUMN public.penalty_records.member_id IS
  'users.id (auth 사용자 ID). team_members.id 아님 — 스키마 정규화 유예 상태.
   attendance-check / dues/penalties 모두 users.id 기준으로 저장.';

-- 4. 검증
--   SELECT indexname FROM pg_indexes WHERE tablename = 'penalty_records';
--   → penalty_records_match_rule_member_uniq 존재해야 성공.
