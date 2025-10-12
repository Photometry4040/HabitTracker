-- ============================================================================
-- Migration: 013_create_dual_write_triggers
-- Description: Database triggers for dual-write (Phase 1 backup mechanism)
-- Strategy: Created in Phase 0, activated in Phase 1
-- Created: 2025-10-12
-- Status: Phase 0 Skeleton (logs only, no sync yet)
-- ============================================================================

-- ============================================================================
-- PART 1: Idempotency Log Table
-- Purpose: Track Edge Function requests for idempotent operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Indexes for idempotency_log
CREATE INDEX IF NOT EXISTS idx_idempotency_key
  ON idempotency_log(key);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON idempotency_log(expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_status
  ON idempotency_log(status);

CREATE INDEX IF NOT EXISTS idx_idempotency_created
  ON idempotency_log(created_at DESC);

-- Table comments
COMMENT ON TABLE idempotency_log IS
  'Idempotency tracking for dual-write Edge Function. Logs are auto-expired after 24 hours.';

COMMENT ON COLUMN idempotency_log.key IS
  'Unique idempotency key from X-Idempotency-Key header';

COMMENT ON COLUMN idempotency_log.operation IS
  'Operation type: create_week, update_habit_record, delete_week';

COMMENT ON COLUMN idempotency_log.request_data IS
  'Original request payload (JSONB)';

COMMENT ON COLUMN idempotency_log.response_data IS
  'Cached response data (JSONB)';

COMMENT ON COLUMN idempotency_log.status IS
  'Status: success, failed, not_implemented';

COMMENT ON COLUMN idempotency_log.expires_at IS
  'Auto-expire after 24 hours (cleanup job removes expired logs)';

-- ============================================================================
-- PART 2: Cleanup Function for Idempotency Log
-- Purpose: Remove expired idempotency logs (runs daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_idempotency_log()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_log WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % expired idempotency logs', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_idempotency_log IS
  'Deletes expired idempotency logs. Should be run daily via pg_cron (Phase 1).';

-- TODO: Phase 1 - Create pg_cron job to run cleanup daily
-- Example: SELECT cron.schedule('cleanup-idempotency', '0 2 * * *', 'SELECT cleanup_idempotency_log()');

-- ============================================================================
-- PART 3: Trigger Function for Dual-Write Sync
-- Purpose: Backup mechanism when Edge Function fails
-- Status: Phase 0 - Logs only, no actual sync
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_old_to_new()
RETURNS TRIGGER AS $$
DECLARE
  week_record RECORD;
  child_record RECORD;
  habit JSONB;
  habit_day INTEGER;
BEGIN
  -- ============================================================================
  -- Phase 0: Just log, don't sync yet
  -- This allows us to monitor trigger firing without affecting production data
  -- ============================================================================

  RAISE NOTICE 'Dual-write trigger fired: table=%, operation=%, id=%',
    TG_TABLE_NAME, TG_OP, COALESCE(NEW.id::text, OLD.id::text);

  -- Log operation details
  RAISE NOTICE 'Trigger details: child_name=%, week_start_date=%',
    COALESCE(NEW.child_name, OLD.child_name),
    COALESCE(NEW.week_start_date::text, OLD.week_start_date::text);

  -- ============================================================================
  -- Phase 1 TODO: Implement actual sync logic
  -- ============================================================================

  -- IF TG_OP = 'INSERT' THEN
  --   -- Step 1: Get or create child
  --   SELECT id INTO child_record.id
  --   FROM children
  --   WHERE name = NEW.child_name AND user_id = NEW.user_id
  --   LIMIT 1;
  --
  --   IF child_record.id IS NULL THEN
  --     INSERT INTO children (user_id, name, source_version)
  --     VALUES (NEW.user_id, NEW.child_name, 'dual_write')
  --     RETURNING id INTO child_record.id;
  --   END IF;
  --
  --   -- Step 2: Create week
  --   INSERT INTO weeks (
  --     user_id, child_id, week_start_date, week_end_date,
  --     theme, reflection, reward, source_version
  --   )
  --   VALUES (
  --     NEW.user_id, child_record.id, NEW.week_start_date,
  --     NEW.week_start_date + INTERVAL '6 days',
  --     NEW.theme, NEW.reflection, NEW.reward, 'dual_write'
  --   )
  --   RETURNING id INTO week_record.id;
  --
  --   -- Step 3: Parse JSONB habits array and create habits + habit_records
  --   FOR habit IN SELECT * FROM jsonb_array_elements(NEW.habits)
  --   LOOP
  --     -- Create habit
  --     INSERT INTO habits (week_id, name, display_order, source_version)
  --     VALUES (
  --       week_record.id,
  --       habit->>'name',
  --       (habit->>'id')::integer,
  --       'dual_write'
  --     )
  --     RETURNING id INTO habit_record.id;
  --
  --     -- Create habit_records from times array
  --     FOR habit_day IN 0..6
  --     LOOP
  --       IF habit->'times'->habit_day IS NOT NULL
  --          AND habit->'times'->>habit_day != '' THEN
  --         INSERT INTO habit_records (
  --           habit_id, record_date, status, source_version
  --         )
  --         VALUES (
  --           habit_record.id,
  --           NEW.week_start_date + (habit_day || ' days')::interval,
  --           habit->'times'->>habit_day,
  --           'dual_write'
  --         );
  --       END IF;
  --     END LOOP;
  --   END LOOP;
  --
  -- ELSIF TG_OP = 'UPDATE' THEN
  --   -- TODO: Implement UPDATE sync logic
  --   -- Update weeks, habits, habit_records based on changed JSONB
  --   NULL;
  --
  -- ELSIF TG_OP = 'DELETE' THEN
  --   -- TODO: Implement DELETE sync logic
  --   -- Delete from weeks (CASCADE will handle habits and habit_records)
  --   DELETE FROM weeks
  --   WHERE child_id = (SELECT id FROM children WHERE name = OLD.child_name)
  --     AND week_start_date = OLD.week_start_date;
  -- END IF;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_old_to_new IS
  'Dual-write sync function. Phase 0: logs only. Phase 1: syncs old schema to new schema when Edge Function fails.';

-- ============================================================================
-- PART 4: Trigger on habit_tracker Table
-- Purpose: Automatically sync changes from old schema to new schema
-- Status: Created but only logs in Phase 0
-- ============================================================================

-- Check if trigger already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_habit_tracker_dual_write'
  ) THEN
    CREATE TRIGGER trigger_habit_tracker_dual_write
      AFTER INSERT OR UPDATE OR DELETE ON habit_tracker
      FOR EACH ROW
      EXECUTE FUNCTION sync_old_to_new();
  END IF;
END $$;

COMMENT ON TRIGGER trigger_habit_tracker_dual_write ON habit_tracker IS
  'Dual-write trigger. Phase 0: logs only. Phase 1: syncs to new schema when Edge Function fails.';

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Check trigger exists and is enabled
-- SELECT
--   tgname as trigger_name,
--   tgrelid::regclass as table_name,
--   tgfoid::regproc as function_name,
--   tgenabled as enabled,
--   CASE tgenabled
--     WHEN 'O' THEN 'Enabled'
--     WHEN 'D' THEN 'Disabled'
--     WHEN 'R' THEN 'Replica'
--     WHEN 'A' THEN 'Always'
--   END as status
-- FROM pg_trigger
-- WHERE tgname = 'trigger_habit_tracker_dual_write';
-- Expected: 1 row, enabled = 'O' (Enabled)

-- Check idempotency_log table structure
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'idempotency_log'
-- ORDER BY ordinal_position;
-- Expected: 8 columns (id, key, operation, request_data, response_data, status, created_at, expires_at)

-- Check idempotency_log indexes
-- SELECT
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'idempotency_log'
-- ORDER BY indexname;
-- Expected: 5 indexes (pkey + 4 custom)

-- Test trigger firing (Phase 0 - should only log, no sync)
-- INSERT INTO habit_tracker (child_name, week_start_date, week_period, habits, user_id)
-- VALUES (
--   'Trigger Test Child',
--   '2025-10-14',  -- Monday
--   '2025년 10월 14일 ~ 2025년 10월 20일',
--   '[]'::jsonb,
--   'fc24adf2-a7af-4fbf-abe0-c332bb48b02b'  -- Replace with real user_id
-- );
-- Expected: NOTICE in logs, no records created in new schema

-- Check trigger logs (look for NOTICE messages)
-- Expected: "Dual-write trigger fired: table=habit_tracker, operation=INSERT, id=..."

-- Cleanup test data
-- DELETE FROM habit_tracker WHERE child_name = 'Trigger Test Child';

-- ============================================================================
-- PART 6: Manual Trigger Control (for testing/debugging)
-- ============================================================================

-- Disable trigger (if needed for debugging)
-- ALTER TABLE habit_tracker DISABLE TRIGGER trigger_habit_tracker_dual_write;

-- Enable trigger
-- ALTER TABLE habit_tracker ENABLE TRIGGER trigger_habit_tracker_dual_write;

-- Drop trigger (if needed to recreate)
-- DROP TRIGGER IF EXISTS trigger_habit_tracker_dual_write ON habit_tracker;

-- ============================================================================
-- Migration Summary
-- ============================================================================

-- Tables Created: 1
--   - idempotency_log (for Edge Function idempotency)
--
-- Indexes Created: 4
--   - idx_idempotency_key (UNIQUE on key)
--   - idx_idempotency_expires (for cleanup)
--   - idx_idempotency_status (for monitoring)
--   - idx_idempotency_created (for recent logs)
--
-- Functions Created: 2
--   - sync_old_to_new() - Dual-write sync logic (Phase 0: logs only)
--   - cleanup_idempotency_log() - Remove expired logs
--
-- Triggers Created: 1
--   - trigger_habit_tracker_dual_write - Fires on INSERT/UPDATE/DELETE
--
-- Phase 0 Status:
--   ✅ Infrastructure ready
--   ✅ Trigger created (logs only)
--   ✅ Idempotency table ready
--   ✅ Safe to deploy (no production impact)
--
-- Phase 1 TODO:
--   - Uncomment sync logic in sync_old_to_new()
--   - Create pg_cron job for cleanup_idempotency_log()
--   - Test dual-write with production data
--   - Monitor drift and performance
--
-- ============================================================================
-- End of Migration
-- ============================================================================
