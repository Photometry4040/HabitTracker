-- Migration: Drop OLD SCHEMA table
-- Date: 2025-10-26
-- Phase: Post-Phase 3 Cleanup
--
-- Purpose: Safely remove habit_tracker_old table after monitoring period
-- Monitoring period: 2025-10-18 ~ 2025-10-25 (1 week)
-- Status: Monitoring completed, no issues detected
-- Backup: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json (70.62 KB, 34 records)
--
-- Safe to rollback: Yes (restore from backup if needed)
-- Impact: None (table is READ-ONLY, NEW SCHEMA is primary)

BEGIN;

-- Step 1: Verify monitoring period completion
DO $$
BEGIN
  -- Check if current date is after monitoring period end (2025-10-25)
  IF CURRENT_DATE < '2025-10-25'::date THEN
    RAISE EXCEPTION 'Monitoring period not yet complete. Wait until 2025-10-25.';
  END IF;
END $$;

-- Step 2: Final verification - ensure NEW SCHEMA is operational
DO $$
DECLARE
  children_count INTEGER;
  weeks_count INTEGER;
  habits_count INTEGER;
  records_count INTEGER;
BEGIN
  -- Count records in NEW SCHEMA tables
  SELECT COUNT(*) INTO children_count FROM children;
  SELECT COUNT(*) INTO weeks_count FROM weeks;
  SELECT COUNT(*) INTO habits_count FROM habits;
  SELECT COUNT(*) INTO records_count FROM habit_records;

  -- Ensure NEW SCHEMA has data
  IF children_count = 0 OR weeks_count = 0 THEN
    RAISE EXCEPTION 'NEW SCHEMA appears empty. Aborting for safety.';
  END IF;

  -- Log counts for verification
  RAISE NOTICE 'NEW SCHEMA verification:';
  RAISE NOTICE '  - children: % rows', children_count;
  RAISE NOTICE '  - weeks: % rows', weeks_count;
  RAISE NOTICE '  - habits: % rows', habits_count;
  RAISE NOTICE '  - habit_records: % rows', records_count;
END $$;

-- Step 3: Log OLD SCHEMA final state
DO $$
DECLARE
  old_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM habit_tracker_old;
  RAISE NOTICE 'OLD SCHEMA (habit_tracker_old) final count: % rows', old_count;
  RAISE NOTICE 'Backup file: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json';
END $$;

-- Step 4: Drop monitoring view first (depends on table)
DROP VIEW IF EXISTS v_old_schema_status;

-- Step 5: Drop OLD SCHEMA table
DROP TABLE IF EXISTS habit_tracker_old CASCADE;

-- Step 6: Verify deletion
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habit_tracker_old') THEN
    RAISE EXCEPTION 'Failed to drop habit_tracker_old table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_old_schema_status') THEN
    RAISE EXCEPTION 'Failed to drop v_old_schema_status view';
  END IF;

  RAISE NOTICE '✅ OLD SCHEMA cleanup complete!';
  RAISE NOTICE '✅ habit_tracker_old table dropped';
  RAISE NOTICE '✅ v_old_schema_status view dropped';
END $$;

COMMIT;

-- ============================================================================
-- Migration complete!
--
-- What was removed:
--   1. habit_tracker_old table (34 records)
--   2. v_old_schema_status view
--
-- Recovery procedure (if needed):
--   1. Restore from backup: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json
--   2. Import data using scripts/restore-old-schema.js (create if needed)
--
-- Next steps:
--   1. Update CLAUDE.md to reflect OLD SCHEMA removal
--   2. Remove OLD SCHEMA references from documentation
--   3. Archive migration 014_rename_old_schema.sql for history
-- ============================================================================
