-- ============================================================================
-- Migration: 015_create_stats_weekly_view
-- Description: Create materialized view for weekly statistics aggregation
-- Agent: Agent 2 - Statistics Engineer
-- Performance: Enables fast weekly statistics queries (target < 100ms)
-- ============================================================================

-- ============================================================================
-- Materialized View: stats_weekly
-- Purpose: Pre-aggregate weekly habit statistics for fast queries
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stats_weekly AS
SELECT
  c.id as child_id,
  c.name as child_name,
  c.user_id,
  w.id as week_id,
  w.week_start_date,
  w.week_end_date,
  w.theme,
  w.reward,

  -- Habit counts
  COUNT(DISTINCT h.id) as total_habits,

  -- Record counts by status
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) as yellow_count,
  COUNT(CASE WHEN hr.status = 'red' THEN 1 END) as red_count,
  COUNT(CASE WHEN hr.status = 'none' THEN 1 END) as none_count,
  COUNT(hr.id) as total_records,

  -- Success rate calculation (green = 100%, yellow = 50%)
  ROUND(
    COALESCE(
      100.0 * (
        COUNT(CASE WHEN hr.status = 'green' THEN 1 END) +
        COUNT(CASE WHEN hr.status = 'yellow' THEN 1 END) * 0.5
      ) / NULLIF(COUNT(hr.id), 0),
      0
    ),
    2
  ) as success_rate,

  -- Timestamps
  w.created_at,
  w.updated_at,
  NOW() as stats_updated_at

FROM children c
JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
GROUP BY
  c.id,
  c.name,
  c.user_id,
  w.id,
  w.week_start_date,
  w.week_end_date,
  w.theme,
  w.reward,
  w.created_at,
  w.updated_at;

-- ============================================================================
-- Indexes for Materialized View
-- ============================================================================

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_weekly_unique
ON stats_weekly(child_id, week_start_date);

-- Index for user_id lookups (for RLS)
CREATE INDEX IF NOT EXISTS idx_stats_weekly_user_id
ON stats_weekly(user_id);

-- Index for child_name lookups
CREATE INDEX IF NOT EXISTS idx_stats_weekly_child_name
ON stats_weekly(child_name);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_stats_weekly_date_range
ON stats_weekly(week_start_date, week_end_date);

-- Index for success rate filtering (high performers, low performers)
CREATE INDEX IF NOT EXISTS idx_stats_weekly_success_rate
ON stats_weekly(success_rate DESC);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON MATERIALIZED VIEW stats_weekly IS
'Pre-aggregated weekly statistics for fast dashboard queries. Refreshed automatically every hour.';

COMMENT ON COLUMN stats_weekly.child_id IS 'Reference to children.id';
COMMENT ON COLUMN stats_weekly.child_name IS 'Child name (denormalized for performance)';
COMMENT ON COLUMN stats_weekly.user_id IS 'Parent user ID (for RLS)';
COMMENT ON COLUMN stats_weekly.week_id IS 'Reference to weeks.id';
COMMENT ON COLUMN stats_weekly.success_rate IS 'Weighted success rate: green=100%, yellow=50%, red/none=0%';
COMMENT ON COLUMN stats_weekly.stats_updated_at IS 'Timestamp when this view was last refreshed';

-- ============================================================================
-- Refresh Function
-- ============================================================================

-- Function to refresh weekly stats (can be called manually or via cron)
CREATE OR REPLACE FUNCTION refresh_stats_weekly()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Concurrent refresh allows reads during refresh (requires unique index)
  REFRESH MATERIALIZED VIEW CONCURRENTLY stats_weekly;

  -- Log refresh
  RAISE NOTICE 'stats_weekly refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_stats_weekly() IS
'Refreshes the stats_weekly materialized view. Use CONCURRENTLY to avoid blocking reads.';

-- ============================================================================
-- Initial Refresh
-- ============================================================================

-- Populate the view with initial data
REFRESH MATERIALIZED VIEW stats_weekly;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Get weekly stats for a specific child
-- SELECT * FROM stats_weekly
-- WHERE child_name = '지우'
-- AND user_id = auth.uid()
-- ORDER BY week_start_date DESC
-- LIMIT 4;

-- Example 2: Get monthly average (4 weeks)
-- SELECT
--   child_name,
--   DATE_TRUNC('month', week_start_date) as month,
--   ROUND(AVG(success_rate), 2) as avg_success_rate,
--   SUM(total_records) as total_records
-- FROM stats_weekly
-- WHERE child_name = '지우'
-- AND user_id = auth.uid()
-- AND week_start_date >= DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY child_name, month;

-- Example 3: Find best performing week
-- SELECT
--   week_start_date,
--   success_rate,
--   green_count,
--   total_records,
--   theme
-- FROM stats_weekly
-- WHERE child_name = '지우'
-- AND user_id = auth.uid()
-- ORDER BY success_rate DESC
-- LIMIT 1;

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. Materialized views trade storage for query speed
-- 2. Refresh should be scheduled during low-traffic periods
-- 3. CONCURRENTLY refresh requires unique index but allows reads during refresh
-- 4. Expected query time: < 50ms for single child, < 100ms for all children
-- 5. View size: ~1KB per week per child (very lightweight)
-- ============================================================================

-- ============================================================================
-- Maintenance Notes
-- ============================================================================
-- Manual refresh:
--   SELECT refresh_stats_weekly();
--
-- Check last refresh time:
--   SELECT MAX(stats_updated_at) FROM stats_weekly;
--
-- View size:
--   SELECT pg_size_pretty(pg_total_relation_size('stats_weekly'));
--
-- Rebuild index if corrupted:
--   REINDEX INDEX CONCURRENTLY idx_stats_weekly_unique;
-- ============================================================================
