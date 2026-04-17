-- AI 코치 분석용 팀 통계 캐시
-- Phase D — 팀 히스토리(포메이션별 승률, 선수 포지션 스탯) + Phase E 상대팀 이력 캐시
--
-- Why:
--   AI 코치 분석 호출마다 매번 matches × match_squads × match_goals × match_attendance
--   집계는 비용 큼. 일 1회 cron 또는 lazy 갱신으로 캐시.
--
-- 구조:
--   - team_id PK (팀당 1 row)
--   - data JSONB: { formationStats, playerPositionStats, opponentHistory, ... }
--   - updated_at: 24h 이상 stale → 재계산
--
-- 갱신 정책:
--   1) 경기 완료 시 (handleMatchComplete) 백그라운드 무효화
--   2) 코치 분석 호출 시 stale 감지하면 lazy 재계산
--   3) 운영 cron (선택)

CREATE TABLE IF NOT EXISTS ai_team_stats_cache (
  team_id     UUID        PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stale 정리용 보조 인덱스
CREATE INDEX IF NOT EXISTS ai_team_stats_cache_updated_idx
  ON ai_team_stats_cache (updated_at);

COMMENT ON TABLE ai_team_stats_cache IS 'AI 코치 분석용 팀 통계 캐시 (포메이션별 승률, 선수 포지션 스탯, 상대팀 이력). 24h TTL.';
COMMENT ON COLUMN ai_team_stats_cache.data IS 'JSON: { formationStats:[{name,played,won,drawn,lost,goalsFor,goalsAgainst}], playerPositionStats:[{playerName,position,matches,goals,assists,cleanSheets}], opponentHistory:[{opponentName,played,won,drawn,lost,recentScores:[]}] }';
