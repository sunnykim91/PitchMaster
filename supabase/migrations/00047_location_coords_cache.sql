-- 00047_location_coords_cache.sql
-- 카카오 로컬 API 결과 캐시 — 같은 구장명 재검색 방지
-- get_coords(name) 흐름:
--   1. SELECT * FROM location_coords WHERE location_name = $1
--      → HIT: 캐시 좌표 반환
--   2. MISS: 카카오 로컬 API 호출 → INSERT → 좌표 반환
--
-- RLS: 서버 전용(service role). 일반 사용자가 직접 접근하지 않음.

CREATE TABLE IF NOT EXISTS public.location_coords (
  location_name TEXT PRIMARY KEY,             -- 사용자 입력값 (정규화 전)
  lat NUMERIC(10, 7) NOT NULL,                -- 위도
  lon NUMERIC(10, 7) NOT NULL,                -- 경도
  place_name TEXT,                            -- 카카오 정규화 명 (예: "잠실종합운동장")
  address TEXT,                               -- 도로명·지번 주소
  geocoded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 검색 효율 (대소문자 무관 비교는 입력값 그대로 비교 — 사용자가 같은 표기로 입력 가정)
CREATE INDEX IF NOT EXISTS idx_location_coords_geocoded_at ON public.location_coords (geocoded_at);

-- RLS — 서비스 롤만 접근 (Supabase admin client에서만 사용)
ALTER TABLE public.location_coords ENABLE ROW LEVEL SECURITY;

-- 서비스 롤은 RLS 우회되므로 별도 정책 추가 불필요. 일반 anon/authenticated은 접근 X.

COMMENT ON TABLE public.location_coords IS '카카오 로컬 API geocoding 결과 영속 캐시. 구장명 → 좌표 변환';
COMMENT ON COLUMN public.location_coords.location_name IS '사용자 입력 그대로 (matches.location 값)';
COMMENT ON COLUMN public.location_coords.place_name IS '카카오가 반환한 정식 장소명';
