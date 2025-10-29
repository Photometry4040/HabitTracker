# Phase 4 Setup Instructions

## Step 1: Create Database Views in Supabase

The dashboard Edge Function requires three views. Please create them manually in your Supabase SQL Editor:

### View 1: v_weekly_completion
```sql
CREATE OR REPLACE VIEW v_weekly_completion AS
SELECT
  w.id AS week_id,
  w.child_id,
  c.name AS child_name,
  c.user_id,
  w.week_start_date,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
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
```

### View 2: v_daily_completion
```sql
CREATE OR REPLACE VIEW v_daily_completion AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  hr.record_date,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
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
```

### View 3: v_habit_failure_patterns
```sql
CREATE OR REPLACE VIEW v_habit_failure_patterns AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  h.name AS habit_name,
  TO_CHAR(hr.record_date, 'Day') AS day_name,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status != 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
      1
    )
  END AS failure_rate,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
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
```

### Create Performance Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_weeks_child_date ON weeks(child_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_date ON habit_records(habit_id, record_date);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_week_id ON habits(week_id);
```

## Step 2: Deploy Edge Function

Run:
```bash
supabase functions deploy dashboard-aggregation
```

## Step 3: Verify Setup

Check that:
1. ✅ All three views exist in Supabase (Check in SQL Editor)
2. ✅ Edge Function is deployed (Check in Supabase Console)
3. ✅ Views return data correctly (Run test query in SQL Editor)

## Step 4: Update Code to Use Real Data

After views are created and Edge Function is deployed, the mock data will automatically transition to real data through the `import.meta.env.DEV` checks in `src/hooks/useDashboardData.ts`.

## Troubleshooting

If views fail:
- Ensure tables exist: `children`, `weeks`, `habits`, `habit_records`
- Check data integrity: No NULL foreign keys
- Verify indexes are created for performance

If Edge Function fails:
- Check CORS configuration
- Verify request/response format
- Check Supabase logs: `supabase functions logs dashboard-aggregation`
