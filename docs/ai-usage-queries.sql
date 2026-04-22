-- ============================================================
-- AI 사용량 모니터링 쿼리 모음 (ai_usage_log)
-- ============================================================
-- 용도: Supabase SQL Editor 에 붙여넣어 즉시 실행.
--       월말 결산 / 비정상 사용 감지 / 비용 추산.
-- 기준 테이블: ai_usage_log (feature, source, model, tokens, latency, team_id, user_id, match_id, created_at)
-- ============================================================


-- ─────────────────────────────────────────────
-- 1. 이번 달 feature 별 집계 (source='ai' 만)
-- ─────────────────────────────────────────────
SELECT
  feature,
  COUNT(*)                                                AS calls,
  COUNT(DISTINCT team_id)                                 AS unique_teams,
  COUNT(DISTINCT user_id)                                 AS unique_users,
  SUM(input_tokens)                                       AS input_tokens,
  SUM(output_tokens)                                      AS output_tokens,
  SUM(COALESCE(cache_read_tokens, 0))                     AS cache_read_tokens,
  ROUND(AVG(latency_ms))                                  AS avg_latency_ms,
  ROUND(AVG(latency_ms) FILTER (WHERE latency_ms > 0))    AS avg_latency_nonzero
FROM ai_usage_log
WHERE source = 'ai'
  AND created_at >= DATE_TRUNC('month', NOW())
GROUP BY feature
ORDER BY calls DESC;


-- ─────────────────────────────────────────────
-- 2. 이번 달 팀별 사용량 (월 한도 30·20 대비 80% 이상 팀 알림용)
-- ─────────────────────────────────────────────
WITH caps AS (
  SELECT 'tactics-coach'::text AS feature, 30 AS cap
  UNION ALL SELECT 'tactics-plan', 20
)
SELECT
  t.name                            AS team_name,
  u.feature,
  u.calls,
  c.cap,
  ROUND(100.0 * u.calls / c.cap, 1) AS usage_pct
FROM (
  SELECT team_id, feature, COUNT(*) AS calls
  FROM ai_usage_log
  WHERE source = 'ai'
    AND created_at >= DATE_TRUNC('month', NOW())
    AND feature IN ('tactics-coach', 'tactics-plan')
  GROUP BY team_id, feature
) u
JOIN caps c      ON c.feature = u.feature
JOIN teams t     ON t.id = u.team_id
WHERE 100.0 * u.calls / c.cap >= 80
ORDER BY usage_pct DESC;


-- ─────────────────────────────────────────────
-- 3. 일일 사용 추이 (최근 30일) — 트래픽 급증 감지
-- ─────────────────────────────────────────────
SELECT
  DATE(created_at)  AS day,
  feature,
  COUNT(*)          AS calls,
  SUM(input_tokens + COALESCE(output_tokens, 0)) AS total_tokens
FROM ai_usage_log
WHERE source = 'ai'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY day, feature
ORDER BY day DESC, feature;


-- ─────────────────────────────────────────────
-- 4. 실패·룰 폴백 비율 — 품질 모니터링
-- ─────────────────────────────────────────────
SELECT
  feature,
  source,
  COUNT(*)                                AS count,
  ROUND(100.0 * COUNT(*) OVER (PARTITION BY feature) / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY feature), 0), 1) AS pct_of_feature
FROM ai_usage_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY feature, source
ORDER BY feature, source;


-- ─────────────────────────────────────────────
-- 5. 비정상 다발 — 한 user 가 1시간에 10회 이상 호출 (악용 의심)
-- ─────────────────────────────────────────────
SELECT
  u.email           AS user_email,
  u.name            AS user_name,
  l.team_id,
  l.feature,
  COUNT(*)          AS calls,
  MAX(l.created_at) AS last_call
FROM ai_usage_log l
JOIN users u ON u.id = l.user_id
WHERE l.source = 'ai'
  AND l.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY u.email, u.name, l.team_id, l.feature
HAVING COUNT(*) >= 10
ORDER BY calls DESC;


-- ─────────────────────────────────────────────
-- 6. 이번 달 예상 Anthropic 비용 (Haiku 4.5 기준, 참고용)
-- ─────────────────────────────────────────────
-- Haiku 4.5 가격 (2026-04 기준, per 1M tokens):
--   input:  $0.80
--   output: $4.00
--   cache read: $0.08 (90% 할인)
-- ============================================================
SELECT
  feature,
  SUM(input_tokens)                                AS input_tokens,
  SUM(output_tokens)                               AS output_tokens,
  SUM(COALESCE(cache_read_tokens, 0))              AS cache_read_tokens,
  ROUND(
    (SUM(input_tokens) * 0.80 / 1000000.0)
    + (SUM(output_tokens) * 4.00 / 1000000.0)
    + (SUM(COALESCE(cache_read_tokens, 0)) * 0.08 / 1000000.0),
    4
  ) AS estimated_usd,
  ROUND(
    ((SUM(input_tokens) * 0.80 / 1000000.0)
    + (SUM(output_tokens) * 4.00 / 1000000.0)
    + (SUM(COALESCE(cache_read_tokens, 0)) * 0.08 / 1000000.0)) * 1400,
    0
  ) AS estimated_krw
FROM ai_usage_log
WHERE source = 'ai'
  AND model LIKE 'claude-haiku%'
  AND created_at >= DATE_TRUNC('month', NOW())
GROUP BY feature
ORDER BY estimated_usd DESC;


-- ─────────────────────────────────────────────
-- 7. 레이트 제한에 걸린 호출 (source='rule' + error_reason)
-- ─────────────────────────────────────────────
SELECT
  DATE(created_at)         AS day,
  feature,
  error_reason,
  COUNT(*)                 AS count
FROM ai_usage_log
WHERE source IN ('rule', 'error')
  AND error_reason IS NOT NULL
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY day, feature, error_reason
ORDER BY day DESC, count DESC;
