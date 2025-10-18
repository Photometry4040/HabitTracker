-- ============================================================================
-- Migration: 015_enable_rls_on_core_tables.sql
-- Description: CRITICAL SECURITY FIX - Enable RLS on all core tables
-- Phase: Phase 3 Security Fix
-- Date: 2025-10-18
-- Status: ✅ Applied
-- ============================================================================
-- CRITICAL ISSUE FIXED: RLS policies were defined but NOT enabled on:
-- - children
-- - weeks
-- - habits
-- - habit_records
-- This allowed ALL users to access ALL data across user boundaries
-- SOLUTION: Enable RLS on all four core tables
-- ============================================================================

-- Enable RLS on children table
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Enable RLS on weeks table
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on habits table
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on habit_records table
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification Queries (run these to confirm RLS is enabled)
-- ============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records')
-- AND schemaname = 'public'
-- ORDER BY tablename;
-- Expected output: All should show rowsecurity = true

-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records')
-- AND schemaname = 'public'
-- ORDER BY tablename, policyname;
-- Expected: Should list all defined policies
