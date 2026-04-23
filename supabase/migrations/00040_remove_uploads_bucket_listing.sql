-- ============================================================
-- 00040: storage.uploads 버킷 리스트 정책 제거
-- ============================================================
--
-- 문제:
--   Supabase Security Advisor "Public Bucket Allows Listing" 경고.
--   uploads 버킷은 public 이지만 storage.objects 에 SELECT 허용 정책
--   ("Public read access 1va6avm_0") 이 붙어 있어 익명 클라이언트가
--   버킷 내부 파일 전체를 list 가능.
--
--   영향: 다른 팀 업로드 경로(팀ID/nanoid.ext) 를 열거해서 어떤 파일이
--   존재하는지 알아낼 수 있음. 파일 내용은 어차피 공개지만 다른 팀의
--   업로드 패턴/빈도가 노출됨.
--
-- 해결:
--   해당 SELECT 정책을 DROP. public 버킷은 getPublicUrl() 로 개별 파일
--   직접 접근이 가능하므로 리스트 정책 없어도 앱 기능 정상.
--
-- 검증: 앱은 storage.from("uploads").getPublicUrl() 만 사용, .list() 호출 없음
--   (src/app/api/upload/route.ts, upload/file/route.ts, profile/image/route.ts)
--
-- 복구 필요 시 (파일 리스트 기능 추가하게 될 때):
--   CREATE POLICY "uploads_list_own_team" ON storage.objects
--     FOR SELECT TO authenticated
--     USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = <team_id>::text);
-- ============================================================

-- 정확한 정책 이름이 Advisor 에 노출된 값 그대로라면 이 라인이 적용됨.
DROP POLICY IF EXISTS "Public read access 1va6avm_0" ON storage.objects;

-- 만약 이름이 달라졌거나 여러 SELECT 정책이 uploads 에 걸려 있다면
-- 아래 동적 DROP 이 전부 쓸어냄 (anon 역할에 적용된 SELECT 정책만).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage'
       AND c.relname = 'objects'
       AND p.polcmd = 'r'  -- SELECT
       AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%uploads%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END
$$;

-- 검증 (수동):
-- SELECT polname, pg_get_expr(polqual, polrelid) AS qual
--   FROM pg_policy p
--   JOIN pg_class c ON c.oid = p.polrelid
--  WHERE c.relname = 'objects'
--    AND pg_get_expr(polqual, polrelid) ILIKE '%uploads%';
-- 결과가 비어 있으면 성공.
