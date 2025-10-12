-- ============================================================================
-- Migration: 012_create_notifications_indexes
-- Description: Create indexes for notifications table
-- Strategy: CONCURRENTLY for zero-downtime
-- Related: 011_create_notifications_table.sql
-- ============================================================================

-- ============================================================================
-- Index Strategy
-- ============================================================================
-- 1. user_id: Filter notifications by user (most common query)
-- 2. Composite (user_id, is_read): Unread notifications query
-- 3. created_at: Order by recent notifications
-- 4. Composite (user_id, created_at): User's recent notifications
-- 5. type: Filter by notification type (analytics)
-- 6. from_user_id: Track who sent notifications
-- 7. Partial index on source_version: Track migration data only
-- 8. Partial index on unread: Optimize unread count queries
-- ============================================================================

-- Index 1: User ID lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Index 2: Composite index for unread notifications
-- Supports: WHERE user_id = ? AND is_read = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read);

-- Index 3: Created at (recent-first ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at_desc
ON notifications(created_at DESC);

-- Index 4: Composite index for user's recent notifications
-- Supports: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Index 5: Notification type lookup (analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type
ON notifications(type);

-- Index 6: From user ID (track who sent notifications)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_from_user_id
ON notifications(from_user_id)
WHERE from_user_id IS NOT NULL;

-- Index 7: Partial index for migration tracking
-- Only indexes rows from dual-write or migration (not new_schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_source_version
ON notifications(source_version)
WHERE source_version IN ('dual_write', 'migration');

-- Index 8: Partial index for unread count optimization
-- Optimizes: SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
ON notifications(user_id)
WHERE is_read = false;

-- Index 9: GIN index for metadata JSONB (optional, for advanced queries)
-- Supports: WHERE metadata @> '{"habit_id": "..."}'::jsonb
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_metadata_gin
ON notifications USING GIN (metadata);

-- ============================================================================
-- Index Usage Examples
-- ============================================================================

-- Query 1: Get all notifications for a user (most common)
-- SELECT * FROM notifications WHERE user_id = '...' ORDER BY created_at DESC;
-- Uses: idx_notifications_user_created

-- Query 2: Get unread notifications (real-time badge)
-- SELECT * FROM notifications WHERE user_id = '...' AND is_read = false;
-- Uses: idx_notifications_user_read

-- Query 3: Count unread notifications (badge count)
-- SELECT COUNT(*) FROM notifications WHERE user_id = '...' AND is_read = false;
-- Uses: idx_notifications_unread (partial index)

-- Query 4: Get notifications by type (analytics)
-- SELECT * FROM notifications WHERE type = 'achievement';
-- Uses: idx_notifications_type

-- Query 5: Get notifications sent by a specific user
-- SELECT * FROM notifications WHERE from_user_id = '...';
-- Uses: idx_notifications_from_user_id

-- Query 6: Find notifications for a specific habit
-- SELECT * FROM notifications WHERE metadata @> '{"habit_id": "..."}'::jsonb;
-- Uses: idx_notifications_metadata_gin

-- ============================================================================
-- Performance Expectations
-- ============================================================================
-- Table Size Estimates:
-- - 10 users × 2 notifications/day × 365 days = 7,300 rows/year
-- - After 5 years: ~36,500 rows
-- - Index overhead: ~40KB per index × 9 = 360KB total
--
-- Query Performance (estimated):
-- - User notification list: <5ms (10x growth), <10ms (100x growth)
-- - Unread count: <2ms (10x growth), <3ms (100x growth)
-- - Type analytics: <10ms (10x growth), <20ms (100x growth)
--
-- Expected Growth Scenarios:
-- - 10x (365,000 rows): All queries <20ms
-- - 100x (3,650,000 rows): All queries <50ms
-- - 1000x: Consider cleanup strategy (delete read notifications older than 90 days)
--
-- Cleanup Strategy Recommendation:
-- DELETE FROM notifications
-- WHERE is_read = true AND created_at < NOW() - INTERVAL '90 days';
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'notifications'
-- ORDER BY indexname;

-- Check index sizes
-- SELECT
--   indexrelname AS index_name,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND relname = 'notifications'
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
-- WHERE tablename = 'notifications'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial index on is_read=false optimizes unread count queries
-- 3. Partial index on from_user_id IS NOT NULL reduces index size
-- 4. GIN index enables advanced metadata queries
-- 5. Safe to run on production (no downtime)
-- 6. notifications table will grow large - cleanup strategy recommended
-- 7. Consider partitioning by created_at if table exceeds 10M rows
-- ============================================================================
