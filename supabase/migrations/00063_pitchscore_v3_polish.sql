-- ============================================================
-- 00063_pitchscore_v3_polish.sql
-- PitchScore v3 — 능력치 정리 + 라벨 톤 개선
-- ============================================================
-- 사용자 결정 (44차):
--   1) FREE_KICK / TACKLING 능력치 비활성화 — 코너킥·프리킥 차는 사람은
--      정해져 있어 평가 의미 작음. 태클은 DEFENSE 다른 항목과 의미 중복.
--      legacy 평가 row 는 보존 (applicable_sports 빈 배열로 UI 노출만 차단).
--
--   2) "슛팅력" → "슈팅력" 오타 fix.
--
--   3) 라벨 톤 개선 — 추상 형용사("평균이에요") 제거, 구체적 관찰 표현으로.
--      사용자 톤 가이드 (명시):
--        - 패스: "흔들려요" 대신 "부정확", "입맛에 안 맞게"
--        - 크로스: "택배 크로스" 같은 동호회 표현
--        - 시야: 좁다/뒤통수에 눈/노력 중 등 구체적 묘사
--        - 위치선정: "주변에서 잡아주면 따라와요"
--        - 클리어: "어색해요" 대신 "잘 못해요"
--        - 인터셉트: "손맛 짜릿해요" 제거, "가끔 보여요" → "가끔 해요"
--        - 헤딩: "받아주는 정도" 의미 모호 → 구체적 표현
-- ============================================================

-- 1) name_ko 오타 fix
UPDATE player_attribute_codes
SET name_ko = '슈팅력'
WHERE code = 'SHOT_POWER';

-- 2) 능력치 비활성화 (legacy 평가 보존, 새 평가/UI 차단)
UPDATE player_attribute_codes
SET applicable_sports = ARRAY[]::text[]
WHERE code IN ('FREE_KICK', 'TACKLING');

-- 3) 라벨 톤 개선

-- SPEED (평균 → 평범)
UPDATE player_attribute_labels
SET label_ko = '평범한 속도지만 답답하진 않아요'
WHERE attribute_code = 'SPEED' AND level = 3;

-- SHOT_POWER (평균 → 보통)
UPDATE player_attribute_labels
SET label_ko = '슛이 보통이지만 한 번씩 매섭게 들어가요'
WHERE attribute_code = 'SHOT_POWER' AND level = 3;

-- SHORT_PASS (흔들려요 → 부정확)
UPDATE player_attribute_labels
SET label_ko = '짧은 패스가 부정확하게 갈 때가 있어요'
WHERE attribute_code = 'SHORT_PASS' AND level = 2;

-- CROSS (택배 크로스 표현)
UPDATE player_attribute_labels
SET label_ko = '택배 크로스 자주 올려요, 헤더로 받기 좋게'
WHERE attribute_code = 'CROSS' AND level = 4;

UPDATE player_attribute_labels
SET label_ko = '택배 크로스 마스터, 받아만 넣으면 골이에요'
WHERE attribute_code = 'CROSS' AND level = 5;

-- VISION (전수 재작성 — 사용자 "전반적 다 수정 필요")
UPDATE player_attribute_labels
SET label_ko = '시야가 좁아서 자기밖에 못 봐요'
WHERE attribute_code = 'VISION' AND level = 1;

UPDATE player_attribute_labels
SET label_ko = '시야가 좁은 편이지만 노력하는 중이에요'
WHERE attribute_code = 'VISION' AND level = 2;

UPDATE player_attribute_labels
SET label_ko = '주변을 잘 보고 적절히 패스해요'
WHERE attribute_code = 'VISION' AND level = 3;

UPDATE player_attribute_labels
SET label_ko = '결정적 패스를 자주 만들어줘요'
WHERE attribute_code = 'VISION' AND level = 4;

UPDATE player_attribute_labels
SET label_ko = '뒤통수에도 눈이 달린 것 같아요'
WHERE attribute_code = 'VISION' AND level = 5;

-- POSITIONING (어색해요 → 주변에서 잡아주면)
UPDATE player_attribute_labels
SET label_ko = '주변에서 잡아주면 잘 따라와요'
WHERE attribute_code = 'POSITIONING' AND level = 1;

-- CLEARING (어색해요 → 잘 못해요)
UPDATE player_attribute_labels
SET label_ko = '클리어를 잘 못해요'
WHERE attribute_code = 'CLEARING' AND level = 1;

-- INTERCEPT (잘 안 보여요/가끔 보여요/손맛 짜릿해요 정리)
UPDATE player_attribute_labels
SET label_ko = '볼 뺏는 시도가 거의 없어요'
WHERE attribute_code = 'INTERCEPT' AND level = 1;

UPDATE player_attribute_labels
SET label_ko = '인터셉트 가끔 해요'
WHERE attribute_code = 'INTERCEPT' AND level = 2;

UPDATE player_attribute_labels
SET label_ko = '볼 뺏는 데 진짜 능숙해요, 자주 끊어내요'
WHERE attribute_code = 'INTERCEPT' AND level = 5;

-- STRENGTH (평균 → 평범)
UPDATE player_attribute_labels
SET label_ko = '피지컬 평범한 편이에요'
WHERE attribute_code = 'STRENGTH' AND level = 2;

-- HEADING (받아주는 정도 → 가끔 따내요)
UPDATE player_attribute_labels
SET label_ko = '헤딩 가끔 따내요'
WHERE attribute_code = 'HEADING' AND level = 3;
