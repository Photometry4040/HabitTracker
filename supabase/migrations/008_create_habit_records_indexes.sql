-- ============================================================================
-- Migration: 008_create_habit_records_indexes
-- Description: Create indexes for habit_records table
-- Strategy: CONCURRENTLY for zero-downtime
-- Related: 007_create_habit_records_table.sql
-- ============================================================================

-- ============================================================================
-- Index Strategy
-- ============================================================================
-- 1. habit_id: Filter records by habit (most common query)
-- 2. record_date: Filter by date range (weekly/monthly views)
-- 3. Composite (habit_id, record_date): Optimal for habit timeline
-- 4. status: Filter by completion status (analytics)
-- 5. Composite (habit_id, status): Habit-specific status queries
-- 6. Partial index on source_version: Track migration data only
-- ============================================================================

-- Index 1: Habit ID lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_habit_id 
ON habit_records(habit_id);

-- Index 2: Record date (recent-first ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_date_desc 
ON habit_records(record_date DESC);

-- Index 3: Composite index for habit timeline queries
-- Supports: WHERE habit_id = ? ORDER BY record_date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_habit_date 
ON habit_records(habit_id, record_date DESC);

-- Index 4: Status lookup (for analytics and filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_status 
ON habit_records(status);

-- Index 5: Composite for habit-specific status queries
-- Supports: WHERE habit_id = ? AND status = 'green'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_habit_status 
ON habit_records(habit_id, status);

-- Index 6: Partial index for migration tracking
-- Only indexes rows from dual-write or migration (not new_schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_source_version 
ON habit_records(source_version) 
WHERE source_version IN ('dual_write', 'migration');

-- Index 7: Composite for date range queries
-- Supports: WHERE record_date BETWEEN ? AND ? AND status = 'green'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_records_date_status 
ON habit_records(record_date DESC, status);

-- ============================================================================
-- Index Usage Examples
-- ============================================================================

-- Query 1: Get all records for a habit (most common)
-- SELECT * FROM habit_records WHERE habit_id = '...' ORDER BY record_date DESC;
-- Uses: idx_habit_records_habit_date

-- Query 2: Get records for a specific date range
-- SELECT * FROM habit_records WHERE record_date BETWEEN '2024-01-01' AND '2024-01-31';
-- Uses: idx_habit_records_date_desc

-- Query 3: Count completed habits (analytics)
-- SELECT COUNT(*) FROM habit_records WHERE status = 'green';
-- Uses: idx_habit_records_status

-- Query 4: Get completion rate for a habit
-- SELECT status, COUNT(*) FROM habit_records WHERE habit_id = '...' GROUP BY status;
-- Uses: idx_habit_records_habit_status

-- Query 5: Recent activity across all habits
-- SELECT * FROM habit_records ORDER BY record_date DESC LIMIT 50;
-- Uses: idx_habit_records_date_desc

-- ============================================================================
-- Performance Expectations
-- ============================================================================
-- Table Size Estimates:
-- - 10 users × 2 children × 52 weeks × 7 habits × 7 days = 50,960 rows/year
-- - After 5 years: ~254,800 rows
-- - Index overhead: ~40KB per index × 7 = 280KB total
--
-- Query Performance (estimated):
-- - Single habit timeline: <3ms (10x growth), <5ms (100x growth)
-- - Date range queries: <10ms (10x growth), <20ms (100x growth)
-- - Status analytics: <15ms (10x growth), <30ms (100x growth)
--
-- Expected Growth Scenarios:
-- - 10x (2,548,000 rows): All queries <30ms
-- - 100x (25,480,000 rows): All queries <100ms
-- - 1000x: Consider partitioning by record_date (monthly or yearly)
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'habit_records'
-- ORDER BY indexname;

-- Check index sizes
-- SELECT
--   indexrelname AS index_name,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND relname = 'habit_records'
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
-- WHERE tablename = 'habit_records'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial index on source_version reduces storage overhead
-- 3. Composite indexes support most common query patterns
-- 4. Safe to run on production (no downtime)
-- 5. habit_records will be the largest table - indexes are critical
-- 6. Consider date-based partitioning for 100x+ growth
-- ============================================================================
