-- Phase 2: RLS Activation Script
-- Execute AFTER dual-write is stable (24+ hours)
-- Execute AFTER zero drift confirmed
-- Execute in stages (one table at a time with monitoring)

-- Stage 1: Enable RLS on children (direct ownership)
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour, verify queries work

-- Stage 2: Enable RLS on habit_templates (direct ownership)
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour

-- Stage 3: Enable RLS on notifications (direct ownership)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour

-- Stage 4: Enable RLS on weeks (indirect ownership)
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour

-- Stage 5: Enable RLS on habits (nested ownership)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour

-- Stage 6: Enable RLS on habit_records (deep nested ownership)
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;
-- Monitor for 1 hour

-- Verification: Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
ORDER BY tablename;

-- Expected: All tables show rls_enabled = true
