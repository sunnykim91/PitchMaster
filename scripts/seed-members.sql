-- 미등록 팀원 사전등록 (미연동 멤버로 추가)
-- Supabase SQL Editor에서 실행하세요.

DO $$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT id INTO v_team_id FROM teams WHERE name ILIKE '%FCMZ%' LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '팀을 찾을 수 없습니다'; END IF;

  -- 미등록 17명 사전등록 (user_id = NULL, pre_name으로 등록)
  INSERT INTO team_members (team_id, user_id, role, status, pre_name)
  VALUES
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김도훈'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '이동현'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김태균'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '곽배길'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김민욱'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '지문구'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '한유수'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '임우진'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '조강희'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김진우'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김정윤'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '박성현'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '박찬우'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김민준'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '고영종'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '김태오'),
    (v_team_id, NULL, 'MEMBER', 'ACTIVE', '변우범')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '17명 사전등록 완료!';
END $$;
