-- ============================================================================
-- Migration: 20251014_stats_weekly
-- Description: Create materialized view for weekly habit statistics
-- Agent: Agent 2 - Statistics Engineer
-- Related: STATISTICS_ROADMAP.md
-- ============================================================================

-- ============================================================================
-- Materialized View: stats_weekly
-- Purpose: Pre-aggregated weekly statistics for fast dashboard queries
-- Performance Target: < 100ms query time
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_weekly AS
SELECT
  c.name AS child_name,
  w.week_start_date,
  w.week_end_date,

  -- Habit counts
  COUNT(DISTINCT h.id) AS total_habits,

  -- Status distribution across all habit records for the week
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) AS green_count,
  COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) AS yellow_count,
  COUNT(CASE WHEN hr.status = 'red' THEN 1 END) AS red_count,
  COUNT(CASE WHEN hr.status = 'none' THEN 1 END) AS none_count,

  -- Total records (should be total_habits * 7 days)
  COUNT(hr.id) AS total_records,

  -- Success rate calculation
  -- Success = green records / (total_records - none_count) * 100
  -- We exclude 'none' from the denominator as they represent untracked days
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN hr.status != 'none' THEN 1 END), 0),
    2
  ) AS success_rate,

  -- Completion rate (green + yellow as "attempted")
  ROUND(
    100.0 * (COUNT(CASE WHEN hr.status = 'green' THEN 1 END) +
             COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END)) /
    NULLIF(COUNT(CASE WHEN hr.status != 'none' THEN 1 END), 0),
    2
  ) AS completion_rate,

  -- Metadata
  w.id AS week_id,
  w.theme,
  w.reward,
  MAX(w.updated_at) AS last_updated

FROM children c
JOIN weeks w ON w.child_id = c.id
JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id

GROUP BY
  c.name,
  w.week_start_date,
  w.week_end_date,
  w.id,
  w.theme,
  w.reward;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON MATERIALIZED VIEW stats_weekly IS
'Pre-aggregated weekly statistics for dashboard performance (Agent 2)';

-- ============================================================================
-- Indexes for Fast Lookups
-- ============================================================================

-- Primary lookup index: child + week
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_weekly_child_week
ON stats_weekly(child_name, week_start_date);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_stats_weekly_date_range
ON stats_weekly(week_start_date, week_end_date);

-- Index for child-specific queries
CREATE INDEX IF NOT EXISTS idx_stats_weekly_child
ON stats_weekly(child_name);

-- ============================================================================
-- Refresh Function
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_stats_weekly()
RETURNS void AS $$
BEGIN
  -- Concurrent refresh allows queries while refreshing
  -- Requires unique index (created above)
  REFRESH MATERIALIZED VIEW CONCURRENTLY stats_weekly;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_stats_weekly() IS
'Refreshes stats_weekly materialized view with concurrent mode (non-blocking)';

-- ============================================================================
-- Automatic Refresh Trigger (Optional - Day 6)
-- ============================================================================
-- TODO (Day 6): Set up pg_cron or similar for automatic refresh
-- Example: SELECT cron.schedule('refresh-stats', '0 0 * * *', 'SELECT refresh_stats_weekly()');
-- This will refresh daily at midnight

-- ============================================================================
-- Manual Refresh Instructions
-- ============================================================================
-- To manually refresh the view:
-- SELECT refresh_stats_weekly();
--
-- To force a full rebuild (drops all data):
-- REFRESH MATERIALIZED VIEW stats_weekly;

-- ============================================================================
-- Query Performance Verification
-- ============================================================================
-- Test query performance (should be < 100ms):
--
-- EXPLAIN ANALYZE
-- SELECT * FROM stats_weekly
-- WHERE child_name = 'test_child'
-- AND week_start_date >= '2025-01-01'
-- ORDER BY week_start_date DESC;

-- ============================================================================
-- Sample Queries
-- ============================================================================
-- Get latest week stats for a child:
-- SELECT * FROM stats_weekly
-- WHERE child_name = 'child_name'
-- ORDER BY week_start_date DESC
-- LIMIT 1;
--
-- Get monthly trend (all weeks in a month):
-- SELECT * FROM stats_weekly
-- WHERE child_name = 'child_name'
-- AND week_start_date >= '2025-01-01'
-- AND week_start_date < '2025-02-01'
-- ORDER BY week_start_date;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This materialized view improves dashboard query performance
-- 2. Requires manual or scheduled refresh to stay current
-- 3. CONCURRENTLY option prevents blocking reads during refresh
-- 4. Unique index required for CONCURRENTLY option
-- 5. Initial population happens automatically on creation
-- 6. Day 2-4: Will add monthly/yearly views following same pattern
-- ============================================================================
