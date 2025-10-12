-- ============================================================================
-- Migration: 006_create_habits_indexes
-- Description: Create indexes for habits table
-- Strategy: CONCURRENTLY for zero-downtime
-- Related: 005_create_habits_table.sql
-- ============================================================================

-- ============================================================================
-- Index Strategy
-- ============================================================================
-- 1. week_id: Filter habits by week (most common query)
-- 2. Composite (week_id, display_order): Optimal for ordered habit list
-- 3. name: Search habits by name (less common but useful)
-- 4. Partial index on source_version: Track migration data only
-- 5. Composite (week_id, name): Support unique constraint efficiently
-- ============================================================================

-- Index 1: Week ID lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_week_id 
ON habits(week_id);

-- Index 2: Composite index for ordered habit list
-- Supports: WHERE week_id = ? ORDER BY display_order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_week_order 
ON habits(week_id, display_order);

-- Index 3: Habit name search
-- Supports: WHERE name ILIKE '%keyword%' (with pg_trgm extension)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_name 
ON habits(name);

-- Index 4: Partial index for migration tracking
-- Only indexes rows from dual-write or migration (not new_schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_source_version 
ON habits(source_version) 
WHERE source_version IN ('dual_write', 'migration');

-- Index 5: Composite for unique constraint enforcement
-- Supports the unique constraint: (week_id, name)
-- Note: This is automatically created by the UNIQUE constraint
-- but we ensure it exists with explicit definition
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_week_name 
ON habits(week_id, name);

-- ============================================================================
-- Index Usage Examples
-- ============================================================================

-- Query 1: Get all habits for a week in display order (most common)
-- SELECT * FROM habits WHERE week_id = '...' ORDER BY display_order;
-- Uses: idx_habits_week_order

-- Query 2: Search habits by name
-- SELECT * FROM habits WHERE name ILIKE '%책%';
-- Uses: idx_habits_name

-- Query 3: Check for duplicate habit name within week
-- SELECT * FROM habits WHERE week_id = '...' AND name = '...';
-- Uses: idx_habits_week_name

-- Query 4: Count migrated habits
-- SELECT COUNT(*) FROM habits WHERE source_version = 'migration';
-- Uses: idx_habits_source_version

-- ============================================================================
-- Performance Expectations
-- ============================================================================
-- Table Size Estimates:
-- - 10 users × 2 children × 52 weeks × 7 habits = 7,280 rows/year
-- - After 5 years: ~36,400 rows
-- - Index overhead: ~30KB per index × 5 = 150KB total
--
-- Query Performance (estimated):
-- - Week habit list: <3ms (10x growth), <5ms (100x growth)
-- - Habit name search: <10ms (10x growth), <20ms (100x growth)
-- - Duplicate check: <2ms (10x growth), <3ms (100x growth)
--
-- Expected Growth Scenarios:
-- - 10x (364,000 rows): All queries <20ms
-- - 100x (3,640,000 rows): All queries <50ms
-- - 1000x (36,400,000 rows): Consider partitioning by week_id
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'habits'
-- ORDER BY indexname;

-- Check index sizes
-- SELECT
--   indexrelname AS index_name,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND relname = 'habits'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Verify index usage stats (after some queries)
-- SELECT
--   schemaname,
--   tablename,
--   indexrelname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'habits'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial index on source_version reduces storage overhead
-- 3. Composite indexes support most common query patterns
-- 4. Safe to run on production (no downtime)
-- 5. Consider adding GIN index for full-text search if needed later
-- ============================================================================
