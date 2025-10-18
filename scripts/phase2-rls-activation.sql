-- ============================================================================
-- Phase 2 Day 4: RLS Activation Script
-- Purpose: Enable Row Level Security on all 6 tables
-- Strategy: Gradual activation with verification at each step
-- ============================================================================

-- IMPORTANT: Run this script step by step in Supabase SQL Editor!

-- ============================================================================
-- Pre-Activation Checks
-- ============================================================================

-- Check current RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
ORDER BY tablename;

-- ============================================================================
-- Step 1-6: Activate RLS on all tables
-- ============================================================================

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Final Verification
-- ============================================================================

SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
ORDER BY tablename;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
GROUP BY tablename
ORDER BY tablename;
