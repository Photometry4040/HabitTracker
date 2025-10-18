-- Migration 014: Rename OLD SCHEMA table
-- Phase 3 Day 5-6: habit_tracker → habit_tracker_old
--
-- Purpose: Archive the old schema table before complete removal
-- Safe to rollback: Yes (just rename back)
-- Impact: None (table is already READ-ONLY)

BEGIN;

-- Step 1: Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habit_tracker') THEN
    RAISE EXCEPTION 'Table habit_tracker does not exist';
  END IF;
END $$;

-- Step 2: Check if habit_tracker_old already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habit_tracker_old') THEN
    RAISE EXCEPTION 'Table habit_tracker_old already exists - cannot proceed';
  END IF;
END $$;

-- Step 3: Rename table
ALTER TABLE habit_tracker RENAME TO habit_tracker_old;

-- Step 4: Add archive metadata
COMMENT ON TABLE habit_tracker_old IS 'Archived OLD SCHEMA table (Phase 3 Day 5-6). This table is READ-ONLY and scheduled for deletion after 1 week monitoring period. Backup created: 2025-10-18';

-- Step 5: Create monitoring view (optional - for easy verification)
CREATE OR REPLACE VIEW v_old_schema_status AS
SELECT
  'habit_tracker_old' as table_name,
  COUNT(*) as record_count,
  MIN(week_start_date) as earliest_week,
  MAX(week_start_date) as latest_week,
  COUNT(DISTINCT child_name) as unique_children,
  SUM(jsonb_array_length(habits)) as total_habits,
  NOW() as checked_at
FROM habit_tracker_old;

COMMENT ON VIEW v_old_schema_status IS 'Monitoring view for archived habit_tracker_old table';

-- Step 6: Log migration
-- (Supabase automatically logs migrations in supabase_migrations.schema_migrations)

COMMIT;

-- ============================================================================
-- Migration complete!
--
-- Post-migration verification:
--   SELECT * FROM v_old_schema_status;
--
-- Expected result:
--   - table_name: habit_tracker_old
--   - record_count: 34
--   - unique_children: 6
--
-- Rollback (if needed within 1 week):
--   ALTER TABLE habit_tracker_old RENAME TO habit_tracker;
--   DROP VIEW v_old_schema_status;
--
-- Complete deletion (after 1 week monitoring):
--   DROP TABLE habit_tracker_old CASCADE;
--   DROP VIEW v_old_schema_status;
-- ============================================================================
