-- ============================================================================
-- Migration: 016_create_stats_monthly_view
-- Description: Create materialized view for monthly statistics aggregation
-- Agent: Agent 2 - Statistics Engineer
-- Performance: Enables fast monthly statistics queries (target < 300ms)
-- ============================================================================

-- ============================================================================
-- Materialized View: stats_monthly
-- Purpose: Pre-aggregate monthly habit statistics (4-5 weeks) for trend analysis
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_monthly AS
SELECT
  c.id as child_id,
  c.name as child_name,
  c.user_id,

  -- Month grouping (YYYY-MM format)
  TO_CHAR(w.week_start_date, 'YYYY-MM') as month,
  DATE_TRUNC('month', w.week_start_date)::DATE as month_start_date,

  -- Week counts
  COUNT(DISTINCT w.id) as total_weeks,

  -- Habit counts (total across all weeks in month)
  COUNT(DISTINCT h.id) as total_habits,

  -- Record counts by status
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) as yellow_count,
  COUNT(CASE WHEN hr.status = 'red' THEN 1 END) as red_count,
  COUNT(CASE WHEN hr.status = 'none' THEN 1 END) as none_count,
  COUNT(hr.id) as total_records,

  -- Average success rate across weeks
  ROUND(
    COALESCE(
      AVG(
        100.0 * (
          SUM(CASE WHEN hr.status = 'green' THEN 1 END) +
          SUM(CASE WHEN hr.status = 'yellow' THEN 1 END) * 0.5
        ) / NULLIF(COUNT(hr.id), 0)
      ),
      0
    ),
    2
  ) as avg_success_rate,

  -- Overall success rate (aggregate of all records)
  ROUND(
    COALESCE(
      100.0 * (
        COUNT(CASE WHEN hr.status = 'green' THEN 1 END) +
        COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) * 0.5
      ) / NULLIF(COUNT(hr.id), 0),
      0
    ),
    2
  ) as overall_success_rate,

  -- Timestamps
  MIN(w.created_at) as first_week_created,
  MAX(w.updated_at) as last_week_updated,
  NOW() as stats_updated_at

FROM children c
JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
GROUP BY
  c.id,
  c.name,
  c.user_id,
  TO_CHAR(w.week_start_date, 'YYYY-MM'),
  DATE_TRUNC('month', w.week_start_date);

-- ============================================================================
-- Indexes for Materialized View
-- ============================================================================

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_monthly_unique
ON stats_monthly(child_id, month);

-- Index for user_id lookups (for RLS)
CREATE INDEX IF NOT EXISTS idx_stats_monthly_user_id
ON stats_monthly(user_id);

-- Index for child_name lookups
CREATE INDEX IF NOT EXISTS idx_stats_monthly_child_name
ON stats_monthly(child_name);

-- Index for month range queries
CREATE INDEX IF NOT EXISTS idx_stats_monthly_month_range
ON stats_monthly(month_start_date DESC);

-- Index for success rate filtering
CREATE INDEX IF NOT EXISTS idx_stats_monthly_success_rate
ON stats_monthly(overall_success_rate DESC);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON MATERIALIZED VIEW stats_monthly IS
'Pre-aggregated monthly statistics (4-5 weeks) for trend analysis and dashboards. Refreshed automatically every day.';

COMMENT ON COLUMN stats_monthly.child_id IS 'Reference to children.id';
COMMENT ON COLUMN stats_monthly.month IS 'Month in YYYY-MM format (e.g., "2025-10")';
COMMENT ON COLUMN stats_monthly.month_start_date IS 'First day of the month (DATE type for range queries)';
COMMENT ON COLUMN stats_monthly.total_weeks IS 'Number of weeks tracked in this month';
COMMENT ON COLUMN stats_monthly.avg_success_rate IS 'Average success rate across all weeks in month';
COMMENT ON COLUMN stats_monthly.overall_success_rate IS 'Overall success rate (aggregate of all records)';
COMMENT ON COLUMN stats_monthly.stats_updated_at IS 'Timestamp when this view was last refreshed';

-- ============================================================================
-- Refresh Function
-- ============================================================================

-- Function to refresh monthly stats
CREATE OR REPLACE FUNCTION refresh_stats_monthly()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Concurrent refresh allows reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY stats_monthly;

  -- Log refresh
  RAISE NOTICE 'stats_monthly refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_stats_monthly() IS
'Refreshes the stats_monthly materialized view. Use CONCURRENTLY to avoid blocking reads.';

-- ============================================================================
-- Initial Refresh
-- ============================================================================

-- Populate the view with initial data
REFRESH MATERIALIZED VIEW stats_monthly;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Get monthly stats for current year
-- SELECT
--   month,
--   total_weeks,
--   overall_success_rate,
--   green_count,
--   total_records
-- FROM stats_monthly
-- WHERE child_name = '지우'
-- AND user_id = auth.uid()
-- AND month LIKE '2025-%'
-- ORDER BY month DESC;

-- Example 2: Compare this month vs last month
-- WITH current_month AS (
--   SELECT * FROM stats_monthly
--   WHERE child_name = '지우'
--   AND month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
-- ),
-- last_month AS (
--   SELECT * FROM stats_monthly
--   WHERE child_name = '지우'
--   AND month = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')
-- )
-- SELECT
--   c.overall_success_rate as current_rate,
--   l.overall_success_rate as last_rate,
--   c.overall_success_rate - l.overall_success_rate as improvement
-- FROM current_month c, last_month l;

-- Example 3: Find trend (improving/declining)
-- SELECT
--   child_name,
--   month,
--   overall_success_rate,
--   LAG(overall_success_rate) OVER (PARTITION BY child_name ORDER BY month) as prev_month_rate,
--   overall_success_rate - LAG(overall_success_rate) OVER (PARTITION BY child_name ORDER BY month) as change
-- FROM stats_monthly
-- WHERE child_name = '지우'
-- AND user_id = auth.uid()
-- ORDER BY month DESC
-- LIMIT 6;

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. Monthly aggregation reduces data volume significantly
-- 2. Typical month has 4-5 weeks, so data is pre-aggregated
-- 3. Expected query time: < 100ms for single child/year
-- 4. View size: ~500 bytes per child per month
-- 5. Refresh time: < 5 seconds for typical dataset
-- ============================================================================

-- ============================================================================
-- Maintenance Notes
-- ============================================================================
-- Manual refresh:
--   SELECT refresh_stats_monthly();
--
-- Check last refresh time:
--   SELECT MAX(stats_updated_at) FROM stats_monthly;
--
-- View size:
--   SELECT pg_size_pretty(pg_total_relation_size('stats_monthly'));
--
-- Data coverage check:
--   SELECT
--     child_name,
--     COUNT(*) as month_count,
--     MIN(month) as first_month,
--     MAX(month) as last_month
--   FROM stats_monthly
--   GROUP BY child_name;
-- ============================================================================
