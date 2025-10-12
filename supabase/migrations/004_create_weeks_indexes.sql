-- ============================================================================
-- Migration: 004_create_weeks_indexes
-- Description: Create indexes for weeks table
-- Strategy: CONCURRENTLY for zero-downtime
-- Related: 003_create_weeks_table.sql
-- ============================================================================

-- ============================================================================
-- Index Strategy
-- ============================================================================
-- 1. user_id: Filter weeks by user (most common query)
-- 2. child_id: Filter weeks by child
-- 3. week_start_date: Order by date (DESC for recent-first)
-- 4. Composite (child_id, week_start_date): Optimal for child's week list
-- 5. Partial index on source_version: Track migration data only
-- ============================================================================

-- Index 1: User ID lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_user_id 
ON weeks(user_id);

-- Index 2: Child ID lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_child_id 
ON weeks(child_id);

-- Index 3: Week start date (recent-first ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_start_date_desc 
ON weeks(week_start_date DESC);

-- Index 4: Composite index for optimal child week queries
-- Supports: WHERE child_id = ? ORDER BY week_start_date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_child_date 
ON weeks(child_id, week_start_date DESC);

-- Index 5: Partial index for migration tracking
-- Only indexes rows from dual-write or migration (not new_schema)
-- Reduces index size while supporting migration monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_source_version 
ON weeks(source_version) 
WHERE source_version IN ('dual_write', 'migration');

-- Index 6: Composite for user + recent weeks query
-- Supports: WHERE user_id = ? ORDER BY week_start_date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeks_user_date 
ON weeks(user_id, week_start_date DESC);

-- ============================================================================
-- Index Usage Examples
-- ============================================================================

-- Query 1: Get all weeks for a specific child (most common)
-- SELECT * FROM weeks WHERE child_id = '...' ORDER BY week_start_date DESC;
-- Uses: idx_weeks_child_date

-- Query 2: Get all weeks for a user (dashboard view)
-- SELECT * FROM weeks WHERE user_id = '...' ORDER BY week_start_date DESC;
-- Uses: idx_weeks_user_date

-- Query 3: Get recent weeks across all users (admin view)
-- SELECT * FROM weeks ORDER BY week_start_date DESC LIMIT 50;
-- Uses: idx_weeks_start_date_desc

-- Query 4: Count migrated data
-- SELECT COUNT(*) FROM weeks WHERE source_version = 'migration';
-- Uses: idx_weeks_source_version

-- ============================================================================
-- Performance Expectations
-- ============================================================================
-- Table Size Estimates:
-- - 10 users × 2 children × 52 weeks/year = 1,040 rows/year
-- - After 5 years: ~5,200 rows
-- - Index overhead: ~50KB per index × 6 = 300KB total
--
-- Query Performance (estimated):
-- - Single child week list: <5ms (10x growth), <10ms (100x growth)
-- - User dashboard: <10ms (10x growth), <20ms (100x growth)
-- - Date range queries: <15ms (10x growth), <30ms (100x growth)
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'weeks'
-- ORDER BY indexname;

-- Check index sizes
-- SELECT
--   indexrelname AS index_name,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND relname = 'weeks'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial index on source_version reduces storage overhead
-- 3. Composite indexes support most common query patterns
-- 4. Safe to run on production (no downtime)
-- ============================================================================
