-- 회비 중복 입금 차단 — 옵션 B
--
-- 정책: 같은 (team_id, type, amount, description, 분단위 시각) 조합 중복 금지.
--       description NULL 인 경우는 사용자 직접 입력이라 dedup 제외 (정상 케이스 보호).
--
-- 사고: 두 운영진이 OCR/단톡방으로 같은 입금을 거의 동시에 등록 → 회비 장부 중복 row.
--       코드 측 검사(dues/route.ts) 만으로는 SELECT 후 INSERT 사이 race 불가피.
--       DB level UNIQUE 가 최후 보루.
--
-- ⚠️ 적용 전 cleanup 필요:
--   기존 중복 데이터가 있으면 인덱스 생성 실패. 아래 쿼리로 확인 후 정리:
--
--   SELECT team_id, type, amount, description,
--          date_trunc('minute', recorded_at) AS minute_bucket,
--          count(*) AS dup_count,
--          array_agg(id ORDER BY recorded_at) AS row_ids
--   FROM dues_records
--   WHERE description IS NOT NULL
--   GROUP BY team_id, type, amount, description, date_trunc('minute', recorded_at)
--   HAVING count(*) > 1;
--
--   → dup_count > 1 인 row 그룹에서 가장 오래된 것만 남기고 나머지 삭제:
--
--   WITH dups AS (
--     SELECT id,
--            ROW_NUMBER() OVER (
--              PARTITION BY team_id, type, amount, description, date_trunc('minute', recorded_at)
--              ORDER BY recorded_at, id
--            ) AS rn
--     FROM dues_records
--     WHERE description IS NOT NULL
--   )
--   DELETE FROM dues_records
--   WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- date_trunc('minute', timestamptz) 는 STABLE 함수라 인덱스 표현식으로 못 씀(42P17).
-- timezone 을 명시한 IMMUTABLE wrapper 를 만들어 우회.
CREATE OR REPLACE FUNCTION public.dues_minute_bucket(ts timestamptz)
RETURNS timestamp
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT date_trunc('minute', (ts AT TIME ZONE 'UTC')::timestamp);
$$;

CREATE UNIQUE INDEX IF NOT EXISTS dues_records_dedup
  ON public.dues_records (
    team_id,
    type,
    amount,
    description,
    public.dues_minute_bucket(recorded_at)
  )
  WHERE description IS NOT NULL;

COMMENT ON INDEX public.dues_records_dedup IS
  '회비 중복 입금 차단 (옵션 B): 분 단위 시각까지 같으면 중복으로 간주. description NULL 제외.';
