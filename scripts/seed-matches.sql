-- PitchMaster 경기 기록 시드 데이터 (2026년 1월~3월)
-- seed-members.sql 먼저 실행 후 이 스크립트를 실행하세요.

-- 헬퍼 함수: 이름으로 멤버 ID 조회 (연동/미연동 모두 지원)
CREATE OR REPLACE FUNCTION pm_find(p_team uuid, p_name text) RETURNS text AS $$
DECLARE v text;
BEGIN
  SELECT u.id::text INTO v FROM users u JOIN team_members tm ON tm.user_id=u.id AND tm.team_id=p_team WHERE u.name=p_name LIMIT 1;
  IF v IS NOT NULL THEN RETURN v; END IF;
  SELECT tm.id::text INTO v FROM team_members tm WHERE tm.team_id=p_team AND tm.pre_name=p_name AND tm.user_id IS NULL LIMIT 1;
  RETURN v;
END; $$ LANGUAGE plpgsql;

-- 헬퍼 함수: 참석 등록 (연동/미연동 모두 지원)
CREATE OR REPLACE FUNCTION pm_attend(p_match uuid, p_team uuid, p_name text, p_date text) RETURNS void AS $$
DECLARE
  v_uid uuid; v_mid uuid;
BEGIN
  SELECT u.id INTO v_uid FROM users u JOIN team_members tm ON tm.user_id=u.id AND tm.team_id=p_team WHERE u.name=p_name LIMIT 1;
  IF v_uid IS NOT NULL THEN
    SELECT tm.id INTO v_mid FROM team_members tm WHERE tm.team_id=p_team AND tm.user_id=v_uid LIMIT 1;
    INSERT INTO match_attendance (match_id, user_id, member_id, vote, voted_at) VALUES (p_match, v_uid, v_mid, 'ATTEND', p_date::timestamptz) ON CONFLICT DO NOTHING;
  ELSE
    SELECT tm.id INTO v_mid FROM team_members tm WHERE tm.team_id=p_team AND tm.pre_name=p_name AND tm.user_id IS NULL LIMIT 1;
    IF v_mid IS NOT NULL THEN
      INSERT INTO match_attendance (match_id, user_id, member_id, vote, voted_at) VALUES (p_match, NULL, v_mid, 'ATTEND', p_date::timestamptz) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END; $$ LANGUAGE plpgsql;

DO $$
DECLARE
  t uuid; -- team_id
  cb text; -- created_by (김선휘)
  m uuid; -- match_id
  g uuid; -- guest_id
BEGIN
  SELECT id INTO t FROM teams WHERE name ILIKE '%FCMZ%' LIMIT 1;
  IF t IS NULL THEN RAISE EXCEPTION '팀을 찾을 수 없습니다'; END IF;
  cb := pm_find(t, '김선휘');

  -- ============================================================
  -- 1/6 vs 메짤라FC (10:1 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-01-06', '20:00', '어린이대공원 축구장', '메짤라FC', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  -- 용병 (1월: 김도훈, 정원민은 용병)
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '김도훈', 'LW') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '정원민', 'DM');

  -- 참석
  PERFORM pm_attend(m, t, n, '2026-01-06T18:00:00Z') FROM unnest(ARRAY['김선휘','최일훈','김민수','백선하','이동현','임호원','고지훈','김민욱','양문주','김진우','정상훈','최준영','김태오','박성현']) AS n;

  -- Q1: 선휘골(호원어시), 호원골(민수어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 1, pm_find(t,'김선휘'), pm_find(t,'임호원'), false, cb::uuid),
    (m, 1, pm_find(t,'임호원'), pm_find(t,'김민수'), false, cb::uuid);
  -- Q3: 호원골(지훈어시), 선휘골(용병어시), 선휘골(호원어시), 호원골(준영어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'임호원'), pm_find(t,'고지훈'), false, cb::uuid),
    (m, 3, pm_find(t,'김선휘'), g::text, false, cb::uuid),
    (m, 3, pm_find(t,'김선휘'), pm_find(t,'임호원'), false, cb::uuid),
    (m, 3, pm_find(t,'임호원'), pm_find(t,'최준영'), false, cb::uuid);
  -- Q4: 호원골(동현어시), 호원골(선하어시), 민수골(상훈어시), 자책골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 4, pm_find(t,'임호원'), pm_find(t,'이동현'), false, cb::uuid),
    (m, 4, pm_find(t,'임호원'), pm_find(t,'백선하'), false, cb::uuid),
    (m, 4, pm_find(t,'김민수'), pm_find(t,'정상훈'), false, cb::uuid),
    (m, 4, 'UNKNOWN', NULL, true, cb::uuid);

  -- ============================================================
  -- 1/12 vs 명전FC (7:3 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-01-12', '20:00', '살곶이체육공원 축구장', '명전FC', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '정원민', 'DM') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '김도훈', 'LW');

  PERFORM pm_attend(m, t, n, '2026-01-12T18:00:00Z') FROM unnest(ARRAY['김선휘','장석민','김민수','유민','이동현','임호원','고지훈','양문주','김진우','정상훈','최준영','김태오']) AS n;

  -- 유민1골3도움, 석민1골, 호원2골, 동현1골1도움, 용병2골 (쿼터 미상 → Q1)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 1, pm_find(t,'유민'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'장석민'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'임호원'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'임호원'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'이동현'), NULL, false, cb::uuid),
    (m, 1, g::text, NULL, false, cb::uuid),
    (m, 1, g::text, NULL, false, cb::uuid);

  -- ============================================================
  -- 1/19 vs just dgz (5:2 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-01-19', '20:00', '어린이대공원 축구장', 'just dgz', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '김도훈', 'LW') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '이승재', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '권관호', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '이동현', 'MF');

  PERFORM pm_attend(m, t, n, '2026-01-19T18:00:00Z') FROM unnest(ARRAY['김선휘','장석민','김민수','임호원','김민욱','양문주','정상훈','김민준']) AS n;

  -- Q1: 도훈골(석민어시), 민수골, 호원골, 선휘골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 1, g::text, pm_find(t,'장석민'), false, cb::uuid),
    (m, 1, pm_find(t,'김민수'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'임호원'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'김선휘'), NULL, false, cb::uuid);
  -- Q3: 호원골(용병어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'임호원'), g::text, false, cb::uuid);

  -- ============================================================
  -- 1/28 vs 스머프 (7:3 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-01-28', '21:00', '용마폭포공원 축구장', '스머프', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '동주', 'MF') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '용병1', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '용병2', 'MF');

  PERFORM pm_attend(m, t, n, '2026-01-28T18:00:00Z') FROM unnest(ARRAY['정상훈','문성우','임호원','장석민','고지훈','양문주','최준영','김민수','김민욱']) AS n;

  -- Q1: 용병골, 석민골, 민수골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 1, (SELECT id::text FROM match_guests WHERE match_id=m AND name='용병1' LIMIT 1), false, cb::uuid),
    (m, 1, pm_find(t,'장석민'), false, cb::uuid),
    (m, 1, pm_find(t,'김민수'), false, cb::uuid);
  -- Q2: 호원골(민욱어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 2, pm_find(t,'임호원'), pm_find(t,'김민욱'), false, cb::uuid);
  -- Q3: 동주골(민수어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, g::text, pm_find(t,'김민수'), false, cb::uuid);
  -- Q4: 지훈골, 용병골(지훈어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 4, pm_find(t,'고지훈'), NULL, false, cb::uuid),
    (m, 4, (SELECT id::text FROM match_guests WHERE match_id=m AND name='용병2' LIMIT 1), pm_find(t,'고지훈'), false, cb::uuid);

  -- ============================================================
  -- 2/4 vs 신내시티FC (6:2 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-02-04', '20:00', '어린이대공원 축구장', '신내시티FC', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '지두찬', 'MF');

  PERFORM pm_attend(m, t, n, '2026-02-04T18:00:00Z') FROM unnest(ARRAY['김선휘','최일훈','장석민','김민수','변우범','김도훈','이동현','임호원','임우진','정원민','김민준','정상훈']) AS n;

  -- Q1: 도훈 2골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 1, pm_find(t,'김도훈'), false, cb::uuid),
    (m, 1, pm_find(t,'김도훈'), false, cb::uuid);
  -- Q3: 호원골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'임호원'), false, cb::uuid);
  -- Q4: 우범골, 도훈골, 우진골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 4, pm_find(t,'변우범'), false, cb::uuid),
    (m, 4, pm_find(t,'김도훈'), false, cb::uuid),
    (m, 4, pm_find(t,'임우진'), false, cb::uuid);

  -- ============================================================
  -- 2/10 vs 메짤라 (4:3 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-02-10', '20:00', '어린이대공원 축구장', '메짤라', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '지두찬', 'MF') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '최은호', 'MF');

  PERFORM pm_attend(m, t, n, '2026-02-10T18:00:00Z') FROM unnest(ARRAY['김선휘','최일훈','김민수','변우범','임호원','문성우','박성현']) AS n;

  -- Q2: 용병골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 2, g::text, false, cb::uuid);
  -- Q3: 우범골, 우범골(호원어시), 민수골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'변우범'), NULL, false, cb::uuid),
    (m, 3, pm_find(t,'변우범'), pm_find(t,'임호원'), false, cb::uuid),
    (m, 3, pm_find(t,'김민수'), NULL, false, cb::uuid);

  -- ============================================================
  -- 2/18 vs 살살FC (12:5 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-02-18', '21:00', '용마폭포공원축구장', '살살FC', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '지석용', 'MF') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '임관', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '박재형', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '최규석', 'MF');

  PERFORM pm_attend(m, t, n, '2026-02-18T18:00:00Z') FROM unnest(ARRAY['김선휘','김민수','백선하','변우범','김민욱','김도훈','임호원','문성우','정원민']) AS n;

  -- Q1 (7골): 민수골, 선하골(선휘어시), 도훈골(민수어시), 민수골, 민수골(민욱어시), 선휘골(민수어시), 선휘골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 1, pm_find(t,'김민수'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'백선하'), pm_find(t,'김선휘'), false, cb::uuid),
    (m, 1, pm_find(t,'김도훈'), pm_find(t,'김민수'), false, cb::uuid),
    (m, 1, pm_find(t,'김민수'), NULL, false, cb::uuid),
    (m, 1, pm_find(t,'김민수'), pm_find(t,'김민욱'), false, cb::uuid),
    (m, 1, pm_find(t,'김선휘'), pm_find(t,'김민수'), false, cb::uuid),
    (m, 1, pm_find(t,'김선휘'), NULL, false, cb::uuid);
  -- Q2 (2골): 도훈골(우범어시), 도훈골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 2, pm_find(t,'김도훈'), pm_find(t,'변우범'), false, cb::uuid),
    (m, 2, pm_find(t,'김도훈'), NULL, false, cb::uuid);
  -- Q4 (3골): 용병골(민수어시), 도훈골(호원어시), 용병골(선하어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 4, g::text, pm_find(t,'김민수'), false, cb::uuid),
    (m, 4, pm_find(t,'김도훈'), pm_find(t,'임호원'), false, cb::uuid),
    (m, 4, g::text, pm_find(t,'백선하'), false, cb::uuid);

  -- ============================================================
  -- 2/23 vs 영안FC (8:6 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-02-23', '21:00', '중랑구립운동장', '영안FC', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '권관호', 'MF') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '김지성', 'MF');

  PERFORM pm_attend(m, t, n, '2026-02-23T18:00:00Z') FROM unnest(ARRAY['김선휘','최일훈','김도훈','이동현','임호원','김민욱','임우진','정원민','백승관','정상훈','김민준']) AS n;

  -- Q1 (5골): 용병2골, 도훈3골(용병어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 1, g::text, NULL, false, cb::uuid),
    (m, 1, g::text, NULL, false, cb::uuid),
    (m, 1, pm_find(t,'김도훈'), g::text, false, cb::uuid),
    (m, 1, pm_find(t,'김도훈'), g::text, false, cb::uuid),
    (m, 1, pm_find(t,'김도훈'), g::text, false, cb::uuid);
  -- Q2 (3골): 도훈골(용병어시), 원민골(도훈어시), 관호골(도훈어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 2, pm_find(t,'김도훈'), g::text, false, cb::uuid),
    (m, 2, pm_find(t,'정원민'), pm_find(t,'김도훈'), false, cb::uuid),
    (m, 2, g::text, pm_find(t,'김도훈'), false, cb::uuid);

  -- ============================================================
  -- 3/4 vs 메짤라 (2:3 패배)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-03-04', '20:00', '어린이대공원 축구장', '메짤라', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '신석민', 'MF') RETURNING id INTO g;
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '지두찬', 'MF');

  PERFORM pm_attend(m, t, n, '2026-03-04T18:00:00Z') FROM unnest(ARRAY['백선하','고건우','김도훈','이동현','최동욱','최일훈','김선휘','문성우','김진우','정원민','김민준','고영종']) AS n;

  -- Q3: 도훈골(용병어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'김도훈'), g::text, false, cb::uuid);
  -- Q4: 용병골
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, is_own_goal, recorded_by) VALUES
    (m, 4, g::text, false, cb::uuid);

  -- ============================================================
  -- 3/10 vs 메짤라 (2:0 승리)
  -- ============================================================
  INSERT INTO matches (team_id, match_date, match_time, location, opponent_name, quarter_count, quarter_duration, break_duration, status, created_by)
  VALUES (t, '2026-03-10', '20:00', '어린이대공원 축구장', '메짤라', 4, 25, 5, 'COMPLETED', cb::uuid) RETURNING id INTO m;

  INSERT INTO match_guests (match_id, name, position) VALUES (m, '유바울', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '지두찬', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '권관호', 'MF');
  INSERT INTO match_guests (match_id, name, position) VALUES (m, '정택현', 'MF');

  PERFORM pm_attend(m, t, n, '2026-03-10T18:00:00Z') FROM unnest(ARRAY['김선휘','백선하','김도훈','최동욱','임호원','최일훈','문성우','정원민','최준영','고건우','박성현']) AS n;

  -- Q3: 도훈골(성현어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 3, pm_find(t,'김도훈'), pm_find(t,'박성현'), false, cb::uuid);
  -- Q4: 선휘골(선하어시)
  INSERT INTO match_goals (match_id, quarter_number, scorer_id, assist_id, is_own_goal, recorded_by) VALUES
    (m, 4, pm_find(t,'김선휘'), pm_find(t,'백선하'), false, cb::uuid);

  RAISE NOTICE '10경기 데이터 입력 완료!';
END $$;

-- 헬퍼 함수 정리
DROP FUNCTION IF EXISTS pm_find(uuid, text);
DROP FUNCTION IF EXISTS pm_attend(uuid, uuid, text, text);
