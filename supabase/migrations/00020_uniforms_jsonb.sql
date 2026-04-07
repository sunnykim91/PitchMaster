-- 유니폼 홈/원정/써드 각각 별도 설정
ALTER TABLE teams ADD COLUMN IF NOT EXISTS uniforms jsonb DEFAULT NULL;

-- 기존 데이터 마이그레이션 (uniform_primary/secondary/pattern → uniforms JSONB)
UPDATE teams SET uniforms = jsonb_build_object(
  'home', jsonb_build_object(
    'primary', COALESCE(uniform_primary, '#2563eb'),
    'secondary', COALESCE(uniform_secondary, '#f97316'),
    'pattern', COALESCE(uniform_pattern, 'SOLID')
  ),
  'away', jsonb_build_object(
    'primary', COALESCE(uniform_secondary, '#f97316'),
    'secondary', COALESCE(uniform_primary, '#2563eb'),
    'pattern', COALESCE(uniform_pattern, 'SOLID')
  )
) WHERE uniforms IS NULL AND uniform_primary IS NOT NULL;

-- uniform_type에 THIRD 허용 (matches 테이블)
-- 기존 CHECK 제약이 있으면 제거 후 재생성
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_uniform_type_check;
