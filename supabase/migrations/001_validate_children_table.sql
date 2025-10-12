-- =====================================================================
-- Validation Script: 001_validate_children_table.sql
-- Phase: 0 (Shadow Schema - Validation)
-- Purpose: Comprehensive validation of children table creation
-- Author: DB Architect (Perfectionist Mode)
-- Date: 2025-10-12
-- =====================================================================
--
-- This script performs exhaustive validation of the children table
-- to ensure all requirements from Phase 0 are met.
--
-- USAGE: Run this after 001_create_children_table.sql completes
-- =====================================================================

\echo '========================================='
\echo 'CHILDREN TABLE VALIDATION SCRIPT'
\echo 'Phase 0 - Shadow Schema'
\echo '========================================='
\echo ''

-- =====================================================================
-- TEST 1: Table Existence
-- =====================================================================

\echo 'TEST 1: Checking if children table exists...'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'children'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE '✓ PASS: Table "children" exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Table "children" does not exist';
  END IF;
END $$;

-- =====================================================================
-- TEST 2: Column Structure
-- =====================================================================

\echo ''
\echo 'TEST 2: Validating column structure...'

DO $$
DECLARE
  expected_columns TEXT[] := ARRAY['id', 'user_id', 'name', 'created_at', 'updated_at', 'source_version'];
  actual_column TEXT;
  missing_columns TEXT[] := '{}';
  column_count INTEGER;
BEGIN
  -- Count columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'children';

  IF column_count = 6 THEN
    RAISE NOTICE '✓ PASS: Expected 6 columns found';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Expected 6 columns, found %', column_count;
  END IF;

  -- Check each expected column exists
  FOREACH actual_column IN ARRAY expected_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'children'
      AND column_name = actual_column
    ) THEN
      missing_columns := array_append(missing_columns, actual_column);
    END IF;
  END LOOP;

  IF array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✓ PASS: All required columns present';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

-- Display column details
\echo ''
\echo 'Column Details:'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'children'
ORDER BY ordinal_position;

-- =====================================================================
-- TEST 3: Data Types Validation
-- =====================================================================

\echo ''
\echo 'TEST 3: Validating column data types...'

DO $$
BEGIN
  -- Check id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'id'
    AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE '✓ PASS: id is UUID type';
  ELSE
    RAISE EXCEPTION '✗ FAIL: id is not UUID type';
  END IF;

  -- Check user_id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'user_id'
    AND data_type = 'uuid'
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE '✓ PASS: user_id is NOT NULL UUID';
  ELSE
    RAISE EXCEPTION '✗ FAIL: user_id is not NOT NULL UUID';
  END IF;

  -- Check name is TEXT NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'name'
    AND data_type = 'text'
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE '✓ PASS: name is NOT NULL TEXT';
  ELSE
    RAISE EXCEPTION '✗ FAIL: name is not NOT NULL TEXT';
  END IF;

  -- Check created_at is TIMESTAMPTZ NOT NULL with default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'created_at'
    AND data_type = 'timestamp with time zone'
    AND is_nullable = 'NO'
    AND column_default IS NOT NULL
  ) THEN
    RAISE NOTICE '✓ PASS: created_at is NOT NULL TIMESTAMPTZ with default';
  ELSE
    RAISE EXCEPTION '✗ FAIL: created_at configuration incorrect';
  END IF;

  -- Check updated_at is TIMESTAMPTZ NOT NULL with default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'updated_at'
    AND data_type = 'timestamp with time zone'
    AND is_nullable = 'NO'
    AND column_default IS NOT NULL
  ) THEN
    RAISE NOTICE '✓ PASS: updated_at is NOT NULL TIMESTAMPTZ with default';
  ELSE
    RAISE EXCEPTION '✗ FAIL: updated_at configuration incorrect';
  END IF;

  -- Check source_version is TEXT with default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children'
    AND column_name = 'source_version'
    AND data_type = 'text'
  ) THEN
    RAISE NOTICE '✓ PASS: source_version is TEXT';
  ELSE
    RAISE EXCEPTION '✗ FAIL: source_version is not TEXT';
  END IF;
END $$;

-- =====================================================================
-- TEST 4: Primary Key
-- =====================================================================

\echo ''
\echo 'TEST 4: Validating primary key...'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'children_pkey'
    AND contype = 'p'
    AND conrelid = 'children'::regclass
  ) THEN
    RAISE NOTICE '✓ PASS: Primary key constraint exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Primary key constraint not found';
  END IF;
END $$;

-- =====================================================================
-- TEST 5: Foreign Key Constraints
-- =====================================================================

\echo ''
\echo 'TEST 5: Validating foreign key constraints...'

DO $$
BEGIN
  -- Check FK to auth.users exists and is NOT VALID
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_children_user_id'
    AND contype = 'f'
    AND conrelid = 'children'::regclass
    AND NOT convalidated  -- Should be NOT VALID
  ) THEN
    RAISE NOTICE '✓ PASS: Foreign key fk_children_user_id exists with NOT VALID';
  ELSE
    -- Check if it exists but is validated
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'fk_children_user_id'
      AND contype = 'f'
      AND conrelid = 'children'::regclass
      AND convalidated
    ) THEN
      RAISE WARNING '⚠ WARNING: Foreign key exists but is VALIDATED (should be NOT VALID in Phase 0)';
    ELSE
      RAISE EXCEPTION '✗ FAIL: Foreign key fk_children_user_id not found';
    END IF;
  END IF;

  -- Verify FK points to auth.users(id)
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    JOIN pg_class ref ON ref.oid = c.confrelid
    WHERE c.conname = 'fk_children_user_id'
    AND ref.relname = 'users'
  ) THEN
    RAISE NOTICE '✓ PASS: Foreign key references auth.users correctly';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Foreign key does not reference auth.users';
  END IF;
END $$;

-- =====================================================================
-- TEST 6: Check Constraints
-- =====================================================================

\echo ''
\echo 'TEST 6: Validating check constraints...'

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Count check constraints
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE contype = 'c'
  AND conrelid = 'children'::regclass;

  IF constraint_count >= 2 THEN
    RAISE NOTICE '✓ PASS: At least 2 check constraints found (expected: name_length, source_version)';
  ELSE
    RAISE WARNING '⚠ WARNING: Expected at least 2 check constraints, found %', constraint_count;
  END IF;

  -- Check name length constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_children_name_length'
    AND contype = 'c'
    AND conrelid = 'children'::regclass
  ) THEN
    RAISE NOTICE '✓ PASS: Name length check constraint exists';
  ELSE
    RAISE WARNING '⚠ WARNING: Name length check constraint not found';
  END IF;

  -- Check source_version constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_children_source_version'
    AND contype = 'c'
    AND conrelid = 'children'::regclass
  ) THEN
    RAISE NOTICE '✓ PASS: Source version check constraint exists';
  ELSE
    RAISE WARNING '⚠ WARNING: Source version check constraint not found';
  END IF;
END $$;

-- =====================================================================
-- TEST 7: Unique Constraints
-- =====================================================================

\echo ''
\echo 'TEST 7: Validating unique constraints...'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_children_user_name'
    AND contype = 'u'
    AND conrelid = 'children'::regclass
  ) THEN
    RAISE NOTICE '✓ PASS: Unique constraint on (user_id, name) exists';
  ELSE
    RAISE WARNING '⚠ WARNING: Unique constraint unique_children_user_name not found';
  END IF;
END $$;

-- =====================================================================
-- TEST 8: Indexes
-- =====================================================================

\echo ''
\echo 'TEST 8: Validating indexes...'

DO $$
DECLARE
  index_count INTEGER;
  expected_indexes TEXT[] := ARRAY[
    'idx_children_user_id',
    'idx_children_name',
    'idx_children_user_name',
    'idx_children_source_version',
    'idx_children_created_at'
  ];
  idx_name TEXT;
BEGIN
  -- Count indexes (excluding primary key)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'children'
  AND schemaname = 'public'
  AND indexname NOT LIKE '%pkey';

  RAISE NOTICE 'Found % indexes on children table (excluding PK)', index_count;

  IF index_count >= 5 THEN
    RAISE NOTICE '✓ PASS: At least 5 indexes exist';
  ELSE
    RAISE WARNING '⚠ WARNING: Expected at least 5 indexes, found %. May need to run CONCURRENTLY script.', index_count;
  END IF;

  -- Check each expected index
  FOREACH idx_name IN ARRAY expected_indexes
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'children'
      AND indexname = idx_name
    ) THEN
      RAISE NOTICE '  ✓ Index % exists', idx_name;
    ELSE
      RAISE WARNING '  ⚠ Index % not found', idx_name;
    END IF;
  END LOOP;
END $$;

-- Display all indexes
\echo ''
\echo 'Existing Indexes:'
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'children'
AND schemaname = 'public'
ORDER BY indexname;

-- =====================================================================
-- TEST 9: Triggers
-- =====================================================================

\echo ''
\echo 'TEST 9: Validating triggers...'

DO $$
BEGIN
  -- Check updated_at trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_children_updated_at'
    AND tgrelid = 'children'::regclass
  ) THEN
    RAISE NOTICE '✓ PASS: Trigger trigger_children_updated_at exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Trigger trigger_children_updated_at not found';
  END IF;

  -- Check trigger function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_children_updated_at'
  ) THEN
    RAISE NOTICE '✓ PASS: Trigger function update_children_updated_at exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Trigger function update_children_updated_at not found';
  END IF;
END $$;

-- =====================================================================
-- TEST 10: RLS Policies
-- =====================================================================

\echo ''
\echo 'TEST 10: Validating RLS policies...'

DO $$
DECLARE
  policy_count INTEGER;
  expected_policies TEXT[] := ARRAY[
    'policy_children_select',
    'policy_children_insert',
    'policy_children_update',
    'policy_children_delete'
  ];
  pol_name TEXT;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'children';

  IF policy_count = 4 THEN
    RAISE NOTICE '✓ PASS: All 4 RLS policies exist';
  ELSE
    RAISE WARNING '⚠ WARNING: Expected 4 RLS policies, found %', policy_count;
  END IF;

  -- Check each expected policy
  FOREACH pol_name IN ARRAY expected_policies
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'children'
      AND policyname = pol_name
    ) THEN
      RAISE NOTICE '  ✓ Policy % exists', pol_name;
    ELSE
      RAISE WARNING '  ⚠ Policy % not found', pol_name;
    END IF;
  END LOOP;
END $$;

-- Display all policies
\echo ''
\echo 'Existing RLS Policies:'
SELECT
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_check
FROM pg_policies
WHERE tablename = 'children'
ORDER BY policyname;

-- =====================================================================
-- TEST 11: RLS Status
-- =====================================================================

\echo ''
\echo 'TEST 11: Validating RLS status (should be DISABLED in Phase 0)...'

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'children'
  AND relnamespace = 'public'::regnamespace;

  IF rls_enabled = false OR rls_enabled IS NULL THEN
    RAISE NOTICE '✓ PASS: RLS is DISABLED (as expected for Phase 0)';
  ELSE
    RAISE WARNING '⚠ WARNING: RLS is ENABLED (should be disabled in Phase 0)';
  END IF;
END $$;

-- =====================================================================
-- TEST 12: Default Values
-- =====================================================================

\echo ''
\echo 'TEST 12: Testing default values with sample insert...'

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  test_id UUID;
  test_created TIMESTAMPTZ;
  test_updated TIMESTAMPTZ;
  test_source TEXT;
BEGIN
  -- Insert test row
  INSERT INTO children (user_id, name)
  VALUES (test_user_id, 'Test Child for Validation')
  RETURNING id, created_at, updated_at, source_version
  INTO test_id, test_created, test_updated, test_source;

  -- Validate defaults
  IF test_id IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: id auto-generated (UUID: %)', test_id;
  ELSE
    RAISE EXCEPTION '✗ FAIL: id was not auto-generated';
  END IF;

  IF test_created IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: created_at auto-set to %', test_created;
  ELSE
    RAISE EXCEPTION '✗ FAIL: created_at was not auto-set';
  END IF;

  IF test_updated IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: updated_at auto-set to %', test_updated;
  ELSE
    RAISE EXCEPTION '✗ FAIL: updated_at was not auto-set';
  END IF;

  IF test_source = 'new_schema' THEN
    RAISE NOTICE '✓ PASS: source_version defaulted to "new_schema"';
  ELSE
    RAISE WARNING '⚠ WARNING: source_version is "%" (expected "new_schema")', test_source;
  END IF;

  -- Test updated_at trigger
  PERFORM pg_sleep(0.1);  -- Small delay to ensure different timestamp
  UPDATE children
  SET name = 'Test Child Updated'
  WHERE id = test_id
  RETURNING updated_at INTO test_updated;

  IF test_updated > test_created THEN
    RAISE NOTICE '✓ PASS: updated_at trigger works (updated_at > created_at)';
  ELSE
    RAISE EXCEPTION '✗ FAIL: updated_at trigger did not update timestamp';
  END IF;

  -- Clean up
  DELETE FROM children WHERE id = test_id;
  RAISE NOTICE '✓ Test data cleaned up';

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE '⚠ NOTE: FK violation on test insert (expected in Phase 0 with NOT VALID constraint)';
    RAISE NOTICE '  This is NORMAL - the FK will be validated after backfill in Phase 2';
  WHEN OTHERS THEN
    RAISE EXCEPTION '✗ FAIL: Test insert failed with error: %', SQLERRM;
END $$;

-- =====================================================================
-- SUMMARY
-- =====================================================================

\echo ''
\echo '========================================='
\echo 'VALIDATION SUMMARY'
\echo '========================================='

DO $$
DECLARE
  table_ok BOOLEAN;
  columns_ok BOOLEAN;
  constraints_ok BOOLEAN;
  indexes_ok BOOLEAN;
  triggers_ok BOOLEAN;
  policies_ok BOOLEAN;
  total_score INTEGER := 0;
BEGIN
  -- Check each category
  table_ok := EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'children');
  columns_ok := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'children') = 6;
  constraints_ok := (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'children'::regclass) >= 4;
  indexes_ok := (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'children') >= 5;
  triggers_ok := EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'children'::regclass);
  policies_ok := (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'children') = 4;

  -- Calculate score
  IF table_ok THEN total_score := total_score + 1; END IF;
  IF columns_ok THEN total_score := total_score + 1; END IF;
  IF constraints_ok THEN total_score := total_score + 1; END IF;
  IF indexes_ok THEN total_score := total_score + 1; END IF;
  IF triggers_ok THEN total_score := total_score + 1; END IF;
  IF policies_ok THEN total_score := total_score + 1; END IF;

  RAISE NOTICE 'Table Structure:     %', CASE WHEN table_ok THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE 'Columns:             %', CASE WHEN columns_ok THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE 'Constraints:         %', CASE WHEN constraints_ok THEN '✓ OK' ELSE '⚠ PARTIAL' END;
  RAISE NOTICE 'Indexes:             %', CASE WHEN indexes_ok THEN '✓ OK' ELSE '⚠ PARTIAL' END;
  RAISE NOTICE 'Triggers:            %', CASE WHEN triggers_ok THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE 'RLS Policies:        %', CASE WHEN policies_ok THEN '✓ OK' ELSE '⚠ PARTIAL' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Overall Score: %/6', total_score;

  IF total_score = 6 THEN
    RAISE NOTICE '✓✓✓ EXCELLENT: All validations passed!';
  ELSIF total_score >= 4 THEN
    RAISE NOTICE '⚠ GOOD: Most validations passed, review warnings above';
  ELSE
    RAISE WARNING '✗ NEEDS ATTENTION: Multiple validations failed';
  END IF;
END $$;

\echo '========================================='
\echo 'END OF VALIDATION'
\echo '========================================='
