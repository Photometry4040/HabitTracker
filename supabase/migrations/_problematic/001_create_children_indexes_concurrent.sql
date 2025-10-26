-- =====================================================================
-- Migration: 001_create_children_indexes_concurrent.sql
-- Phase: 0 (Shadow Schema - Index Creation)
-- Purpose: Create indexes CONCURRENTLY to avoid table locks
-- Author: DB Architect
-- Date: 2025-10-12
-- =====================================================================
--
-- IMPORTANT: This script must be run SEPARATELY from the main migration
-- because CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
--
-- Run this AFTER 001_create_children_table.sql has completed successfully.
--
-- CONCURRENTLY means:
-- - No locks on the table (production unaffected)
-- - Can take longer but safe for live systems
-- - If it fails, the index creation is aborted (no partial index)
--
-- EXECUTION:
-- psql -h <host> -U <user> -d <database> -f 001_create_children_indexes_concurrent.sql
-- OR via Supabase Dashboard SQL Editor (one statement at a time)
-- =====================================================================

-- =====================================================================
-- INDEX 1: Primary lookup by user_id
-- =====================================================================
-- This is the MOST CRITICAL index for RLS policy performance
-- Without this, every RLS check would do a table scan

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_user_id
  ON children(user_id);

-- Verify index was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_user_id') THEN
    RAISE NOTICE '✓ Index idx_children_user_id created successfully';
  ELSE
    RAISE WARNING '⚠ Index idx_children_user_id failed to create';
  END IF;
END $$;

-- =====================================================================
-- INDEX 2: Name search index
-- =====================================================================
-- Supports LIKE/ILIKE queries for child name search
-- Useful for autocomplete and search features

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_name
  ON children(name);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_name') THEN
    RAISE NOTICE '✓ Index idx_children_name created successfully';
  ELSE
    RAISE WARNING '⚠ Index idx_children_name failed to create';
  END IF;
END $$;

-- =====================================================================
-- INDEX 3: Composite index for (user_id, name)
-- =====================================================================
-- Supports the unique constraint and common query patterns
-- Queries filtering by user_id and name will use this index

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_user_name
  ON children(user_id, name);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_user_name') THEN
    RAISE NOTICE '✓ Index idx_children_user_name created successfully';
  ELSE
    RAISE WARNING '⚠ Index idx_children_user_name failed to create';
  END IF;
END $$;

-- =====================================================================
-- INDEX 4: Source version tracking (Partial Index)
-- =====================================================================
-- Partial index only indexes non-NULL source_version values
-- Reduces index size and improves performance for migration monitoring

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_source_version
  ON children(source_version)
  WHERE source_version IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_source_version') THEN
    RAISE NOTICE '✓ Index idx_children_source_version created successfully';
  ELSE
    RAISE WARNING '⚠ Index idx_children_source_version failed to create';
  END IF;
END $$;

-- =====================================================================
-- INDEX 5: Created timestamp (DESC order for recent-first queries)
-- =====================================================================
-- Optimizes queries like "SELECT * FROM children ORDER BY created_at DESC"
-- DESC index is more efficient for descending sorts

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_created_at
  ON children(created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_children_created_at') THEN
    RAISE NOTICE '✓ Index idx_children_created_at created successfully';
  ELSE
    RAISE WARNING '⚠ Index idx_children_created_at failed to create';
  END IF;
END $$;

-- =====================================================================
-- VERIFICATION: Show all indexes on children table
-- =====================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'children' AND schemaname = 'public';

  RAISE NOTICE '=== INDEX SUMMARY ===';
  RAISE NOTICE 'Total indexes on children table: %', index_count;

  IF index_count >= 5 THEN
    RAISE NOTICE '✓ All expected indexes created successfully';
  ELSE
    RAISE WARNING '⚠ Expected at least 5 indexes, found: %', index_count;
  END IF;

  -- List all indexes
  FOR index_rec IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'children' AND schemaname = 'public'
    ORDER BY indexname
  LOOP
    RAISE NOTICE '  - %', index_rec.indexname;
  END LOOP;

  RAISE NOTICE '=== END INDEX SUMMARY ===';
END $$;

-- =====================================================================
-- PERFORMANCE ANALYSIS
-- =====================================================================
-- Check index usage statistics (run this after some data is loaded)

-- Uncomment to see index statistics:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'children'
-- ORDER BY idx_scan DESC;

-- =====================================================================
-- ROLLBACK: Drop all indexes
-- =====================================================================
-- In case you need to recreate indexes:
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_children_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_children_name;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_children_user_name;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_children_source_version;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_children_created_at;
--
-- Note: Use CONCURRENTLY for drops too to avoid locks
-- =====================================================================

-- =====================================================================
-- END OF INDEX MIGRATION
-- =====================================================================
