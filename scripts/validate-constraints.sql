-- Phase 0 Day 6: Validate NOT VALID Constraints
-- Generated: 2025-10-12T03:16:01.960Z
-- Pre-validation: 0 violations found
-- Safe to execute

BEGIN;

-- 1/9: FK constraint on children.fk_children_user_id
ALTER TABLE children VALIDATE CONSTRAINT fk_children_user_id;

-- 2/9: FK constraint on weeks.fk_weeks_user_id
ALTER TABLE weeks VALIDATE CONSTRAINT fk_weeks_user_id;

-- 3/9: FK constraint on weeks.fk_weeks_child_id
ALTER TABLE weeks VALIDATE CONSTRAINT fk_weeks_child_id;

-- 4/9: FK constraint on habits.fk_habits_week_id
ALTER TABLE habits VALIDATE CONSTRAINT fk_habits_week_id;

-- 5/9: FK constraint on habit_records.fk_habit_records_habit_id
ALTER TABLE habit_records VALIDATE CONSTRAINT fk_habit_records_habit_id;

-- 6/9: CHECK constraint on children.ck_children_name_length
ALTER TABLE children VALIDATE CONSTRAINT ck_children_name_length;

-- 7/9: CHECK constraint on weeks.ck_weeks_date_range
ALTER TABLE weeks VALIDATE CONSTRAINT ck_weeks_date_range;

-- 8/9: CHECK constraint on weeks.ck_weeks_start_monday
ALTER TABLE weeks VALIDATE CONSTRAINT ck_weeks_start_monday;

-- 9/9: CHECK constraint on habit_records.ck_habit_records_status
ALTER TABLE habit_records VALIDATE CONSTRAINT ck_habit_records_status;

COMMIT;

-- Verification query (run after COMMIT)
-- Check constraint validation status
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  CASE
    WHEN convalidated THEN 'VALIDATED ✅'
    ELSE 'NOT VALID ⚠️'
  END AS status
FROM pg_constraint
WHERE conname IN ('fk_children_user_id', 'fk_weeks_user_id', 'fk_weeks_child_id', 'fk_habits_week_id', 'fk_habit_records_habit_id', 'ck_children_name_length', 'ck_weeks_date_range', 'ck_weeks_start_monday', 'ck_habit_records_status')
ORDER BY conrelid::regclass, conname;

-- Expected result: All constraints should show 'VALIDATED ✅'
