-- ============================================
-- Dashboard Aggregation Views
-- Phase 4: Create views for Edge Function queries
-- ============================================

-- 1. v_weekly_completion: Weekly aggregation of habit completion rates
-- Returns completion rates grouped by week and child
-- Security Invoker: RLS 적용 (사용자별 데이터 격리)
DROP VIEW IF EXISTS v_weekly_completion;

CREATE VIEW v_weekly_completion
WITH (security_invoker = true)
AS
SELECT
  w.id AS week_id,
  w.child_id,
  c.name AS child_name,
  c.user_id,
  w.week_start_date,
  -- Calculate completion rate as percentage
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
      1
    )
  END AS completion_rate,
  COUNT(DISTINCT h.id) AS total_habits,
  SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END) AS completed_habits,
  COUNT(DISTINCT hr.record_date) AS days_tracked
FROM weeks w
LEFT JOIN children c ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
GROUP BY w.id, w.child_id, c.name, c.user_id, w.week_start_date
ORDER BY w.week_start_date DESC;

-- 2. v_daily_completion: Daily aggregation of habit completion rates
-- Returns daily completion rates for trend analysis
-- Security Invoker: RLS 적용 (사용자별 데이터 격리)
DROP VIEW IF EXISTS v_daily_completion;

CREATE VIEW v_daily_completion
WITH (security_invoker = true)
AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  hr.record_date,
  -- Calculate daily completion rate
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
      1
    )
  END AS completion_rate,
  COUNT(DISTINCT h.id) AS total_habits,
  SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END) AS completed_habits
FROM children c
LEFT JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
WHERE hr.record_date IS NOT NULL
GROUP BY c.id, c.name, c.user_id, hr.record_date
ORDER BY hr.record_date DESC;

-- 3. v_habit_failure_patterns: Analyze habit patterns by day of week
-- Helps identify which habits are weak on which days
-- Security Invoker: RLS 적용 (사용자별 데이터 격리)
DROP VIEW IF EXISTS v_habit_failure_patterns;

CREATE VIEW v_habit_failure_patterns
WITH (security_invoker = true)
AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  h.name AS habit_name,
  -- Day of week (1=Monday, 7=Sunday)
  TO_CHAR(hr.record_date, 'Day') AS day_name,
  -- Calculate failure rate for this habit on this day
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status != 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
      1
    )
  END AS failure_rate,
  -- Calculate success rate for this habit on this day
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
      1
    )
  END AS success_rate,
  COUNT(DISTINCT hr.id) AS total_records
FROM children c
LEFT JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
WHERE hr.record_date IS NOT NULL
GROUP BY c.id, c.name, c.user_id, h.name, TO_CHAR(hr.record_date, 'Day')
ORDER BY c.id, h.name, day_name;

-- ============================================
-- Indexes for Performance Optimization
-- ============================================

-- Index for weekly completion queries (commonly filtered by child_id and week_start_date)
CREATE INDEX IF NOT EXISTS idx_weeks_child_date ON weeks(child_id, week_start_date DESC);

-- Index for habit records queries (commonly filtered by habit_id and record_date)
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_date ON habit_records(habit_id, record_date);

-- Index for user-based queries (all views filter by user_id)
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- Index for week-to-child relationship
CREATE INDEX IF NOT EXISTS idx_habits_week_id ON habits(week_id);

-- ============================================
-- Verify Views Created
-- ============================================
-- Run this query to verify all views were created successfully:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'VIEW'
-- AND table_name LIKE 'v_%';
