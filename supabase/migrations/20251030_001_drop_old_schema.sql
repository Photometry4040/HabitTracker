-- ============================================================================
-- Migration: Drop OLD SCHEMA (habit_tracker_old)
-- Date: 2025-10-30
-- Purpose: Remove archived habit_tracker_old table after monitoring period
-- ============================================================================

-- Context:
-- - OLD SCHEMA was renamed to habit_tracker_old on 2025-10-18 (Phase 3)
-- - Monitoring period completed on 2025-10-25
-- - Backup exists: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json (71KB, 34 records)
-- - No unexpected changes detected via v_old_schema_status view
-- - NEW SCHEMA (children, weeks, habits, habit_records) is fully operational

-- ============================================================================
-- Step 1: Drop monitoring view
-- ============================================================================

DROP VIEW IF EXISTS v_old_schema_status CASCADE;

COMMENT ON SCHEMA public IS 'Monitoring view v_old_schema_status dropped (2025-10-30)';

-- ============================================================================
-- Step 2: Drop habit_tracker_old table
-- ============================================================================

DROP TABLE IF EXISTS habit_tracker_old CASCADE;

COMMENT ON SCHEMA public IS 'Table habit_tracker_old dropped safely (2025-10-30). Backup: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json';

-- ============================================================================
-- Verification
-- ============================================================================

-- After migration, verify table no longer exists:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'habit_tracker_old';
-- Expected: 0 rows

-- ============================================================================
-- Rollback Plan (if needed)
-- ============================================================================

-- If rollback is required:
-- 1. Restore from backup file: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json
-- 2. Run: node scripts/restore-from-backup.js
-- 3. Recreate monitoring view if needed

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- ✅ habit_tracker_old table dropped
-- ✅ v_old_schema_status view dropped
-- ✅ NEW SCHEMA remains fully functional
-- ✅ Backup preserved for safety
