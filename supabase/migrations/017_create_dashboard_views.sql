-- ============================================================================
-- Migration: 017_create_dashboard_views.sql
-- Description: Create optimized views for enhanced dashboard features
-- Phase: Phase 4 - Enhanced Dashboard (Week 1)
-- Date: 2025-10-18
-- ============================================================================
-- These views are used by dashboard aggregation functions for:
-- 1. Comparison dashboard (multi-child view)
-- 2. Trend analysis (time-series data)
-- 3. Self-awareness dashboard (pattern analysis)
-- 4. Monthly detail dashboard (historical data)
-- ============================================================================

-- ============================================================================
-- VIEW 1: Daily Completion Rate
-- Purpose: Daily aggregated habit completion for each child
-- ============================================================================

DROP VIEW IF EXISTS v_daily_completion CASCADE;

CREATE VIEW v_daily_completion AS
SELECT
  c.id as child_id,
  c.user_id,
  c.name as child_name,
  CAST(hr.record_date AS DATE) as record_date,
  COUNT(DISTINCT h.id) as total_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'green' THEN h.id END) as completed_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'yellow' THEN h.id END) as partial_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'red' THEN h.id END) as failed_habits,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as completion_rate
FROM children c
LEFT JOIN weeks w ON c.id = w.child_id
LEFT JOIN habits h ON w.id = h.week_id
LEFT JOIN habit_records hr ON h.id = hr.habit_id
WHERE hr.record_date IS NOT NULL
GROUP BY c.id, c.user_id, c.name, CAST(hr.record_date AS DATE)
ORDER BY c.id, record_date DESC;

COMMENT ON VIEW v_daily_completion IS 'Daily habit completion rates per child';

-- ============================================================================
-- VIEW 2: Weekly Completion Rate
-- Purpose: Weekly aggregated habit completion for trend analysis
-- ============================================================================

DROP VIEW IF EXISTS v_weekly_completion CASCADE;

CREATE VIEW v_weekly_completion AS
SELECT
  c.id as child_id,
  c.user_id,
  c.name as child_name,
  w.id as week_id,
  w.week_start_date,
  w.week_end_date,
  EXTRACT(WEEK FROM w.week_start_date) as week_number,
  EXTRACT(YEAR FROM w.week_start_date) as year,
  COUNT(DISTINCT h.id) as total_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'green' THEN h.id END) as completed_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'yellow' THEN h.id END) as partial_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'red' THEN h.id END) as failed_habits,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as completion_rate,
  COUNT(DISTINCT hr.record_date) as days_tracked
FROM children c
LEFT JOIN weeks w ON c.id = w.child_id
LEFT JOIN habits h ON w.id = h.week_id
LEFT JOIN habit_records hr ON h.id = hr.habit_id
GROUP BY c.id, c.user_id, c.name, w.id, w.week_start_date, w.week_end_date
ORDER BY c.id, w.week_start_date DESC;

COMMENT ON VIEW v_weekly_completion IS 'Weekly habit completion rates for trend analysis';

-- ============================================================================
-- VIEW 3: Habit Failure Patterns
-- Purpose: Identify patterns in habit failures (day of week, trends)
-- ============================================================================

DROP VIEW IF EXISTS v_habit_failure_patterns CASCADE;

CREATE VIEW v_habit_failure_patterns AS
SELECT
  c.id as child_id,
  c.user_id,
  h.id as habit_id,
  h.name as habit_name,
  EXTRACT(DOW FROM hr.record_date) as day_of_week,
  (ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    [EXTRACT(DOW FROM hr.record_date)::int + 1] as day_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as success_count,
  COUNT(CASE WHEN hr.status != 'green' THEN 1 END) as failure_count,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status != 'green' THEN 1 END) / COUNT(*),
    2
  ) as failure_rate,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) / COUNT(*),
    2
  ) as success_rate
FROM children c
JOIN weeks w ON c.id = w.child_id
JOIN habits h ON w.id = h.week_id
JOIN habit_records hr ON h.id = hr.habit_id
GROUP BY c.id, c.user_id, h.id, h.name, EXTRACT(DOW FROM hr.record_date)
ORDER BY c.id, h.id, day_of_week;

COMMENT ON VIEW v_habit_failure_patterns IS 'Habit failure patterns by day of week for self-awareness dashboard';

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Index for daily completion queries
CREATE INDEX IF NOT EXISTS idx_habit_records_child_date
ON habit_records USING btree(
  (SELECT child_id FROM habits h
   JOIN weeks w ON h.week_id = w.id
   WHERE h.id = habit_records.habit_id),
  record_date
);

-- Index for weekly aggregation
CREATE INDEX IF NOT EXISTS idx_weeks_child_start_date
ON weeks(child_id, week_start_date DESC);

-- Index for habit queries
CREATE INDEX IF NOT EXISTS idx_habits_week_id
ON habits(week_id);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check views created
-- SELECT schemaname, viewname FROM pg_views
-- WHERE viewname IN ('v_daily_completion', 'v_weekly_completion', 'v_habit_failure_patterns');

-- Check indexes created
-- SELECT indexname FROM pg_indexes
-- WHERE indexname LIKE 'idx_%' AND tablename IN ('habit_records', 'weeks', 'habits');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. These views are used by Edge Functions for data aggregation
-- 2. Views are read-only and automatically updated with new data
-- 3. Performance is optimized with proper indexing
-- 4. RLS policies inherited from base tables
-- 5. For large datasets, consider materializing views in future
