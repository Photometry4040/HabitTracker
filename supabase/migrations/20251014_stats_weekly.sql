-- ============================================================================
-- Migration: 20251014_stats_weekly
-- Description: Create materialized view for weekly habit statistics
-- Agent: Agent 2 - Statistics Engineer
-- Related: STATISTICS_ROADMAP.md
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_weekly AS
SELECT
  c.name AS child_name,
  w.week_start_date,
  w.week_end_date,
  COUNT(DISTINCT h.id) AS total_habits,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) AS green_count,
  COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) AS yellow_count,
  COUNT(CASE WHEN hr.status = 'red' THEN 1 END) AS red_count,
  COUNT(CASE WHEN hr.status = 'none' THEN 1 END) AS none_count,
  COUNT(hr.id) AS total_records,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN hr.status != 'none' THEN 1 END), 0),
    2
  ) AS success_rate,
  ROUND(
    100.0 * (COUNT(CASE WHEN hr.status = 'green' THEN 1 END) +
             COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END)) /
    NULLIF(COUNT(CASE WHEN hr.status != 'none' THEN 1 END), 0),
    2
  ) AS completion_rate,
  w.id AS week_id,
  w.theme,
  w.reward,
  MAX(w.updated_at) AS last_updated
FROM children c
JOIN weeks w ON w.child_id = c.id
JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
GROUP BY c.name, w.week_start_date, w.week_end_date, w.id, w.theme, w.reward;

COMMENT ON MATERIALIZED VIEW stats_weekly IS
'Pre-aggregated weekly statistics for dashboard performance (Agent 2)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_weekly_child_week
ON stats_weekly(child_name, week_start_date);

CREATE INDEX IF NOT EXISTS idx_stats_weekly_date_range
ON stats_weekly(week_start_date, week_end_date);

CREATE INDEX IF NOT EXISTS idx_stats_weekly_child
ON stats_weekly(child_name);

CREATE OR REPLACE FUNCTION refresh_stats_weekly()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stats_weekly;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_stats_weekly() IS
'Refreshes stats_weekly materialized view with concurrent mode (non-blocking)';

-- ============================================================================
-- REFRESH STRATEGY NOTES (Agent 2)
-- ============================================================================
--
-- This materialized view should be refreshed:
--
-- 1. AUTOMATICALLY (Recommended for Production):
--    Create a scheduled job using pg_cron extension:
--
--    SELECT cron.schedule(
--      'refresh-stats-weekly',
--      '*/15 * * * *',  -- Every 15 minutes
--      'SELECT refresh_stats_weekly();'
--    );
--
-- 2. MANUALLY (For Development):
--    Call the function directly:
--    SELECT refresh_stats_weekly();
--
-- 3. TRIGGER-BASED (Optional, for real-time updates):
--    Create triggers on habit_records table to refresh after insert/update.
--    Note: This can impact write performance on high-traffic tables.
--
-- PERFORMANCE CONSIDERATIONS:
-- - Initial query on materialized view: ~1-5ms (fast, pre-computed)
-- - Without materialized view: ~50-200ms (slower, joins multiple tables)
-- - Refresh time: ~10-50ms depending on data volume
-- - Use CONCURRENTLY to avoid locking the view during refresh
--
-- CURRENT STATE:
-- - Manual refresh required after habit data changes
-- - Production deployment should add automated scheduling
-- ============================================================================
