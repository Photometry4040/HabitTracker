-- ============================================================================
-- Migration: 012_create_notifications_indexes (Dashboard Version)
-- Description: Create indexes for notifications table (WITHOUT CONCURRENTLY)
-- Note: CONCURRENTLY removed for Supabase Dashboard compatibility
-- Related: 011_create_notifications_table.sql
-- ============================================================================

-- Index 1: User ID lookup
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Index 2: Composite index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read);

-- Index 3: Created at (recent-first ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc
ON notifications(created_at DESC);

-- Index 4: Composite index for user's recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Index 5: Notification type lookup
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(type);

-- Index 6: From user ID (partial - only non-null)
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id
ON notifications(from_user_id)
WHERE from_user_id IS NOT NULL;

-- Index 7: Partial index for migration tracking
CREATE INDEX IF NOT EXISTS idx_notifications_source_version
ON notifications(source_version)
WHERE source_version IN ('dual_write', 'migration');

-- Index 8: Partial index for unread count optimization
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id)
WHERE is_read = false;

-- Index 9: GIN index for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin
ON notifications USING GIN (metadata);
