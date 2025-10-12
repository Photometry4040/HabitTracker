-- ============================================================================
-- Migration: 011_create_notifications_table
-- Description: Create notifications table for Phase 0 (Shadow Schema)
-- Strategy: Strangler Fig Pattern
-- Related: TECH_SPEC.md, DB_MIGRATION_PLAN_V2.md
-- ============================================================================

-- ============================================================================
-- Table: notifications
-- Purpose: Store user notifications (mentions, achievements, reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL,
  from_user_id UUID,

  -- Notification Details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,

  -- Migration Tracking
  source_version TEXT DEFAULT 'new_schema',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE notifications IS 'User notifications for mentions, achievements, and reports (Shadow Schema - Phase 0)';
COMMENT ON COLUMN notifications.id IS 'Primary key (UUID v4)';
COMMENT ON COLUMN notifications.user_id IS 'Recipient of the notification';
COMMENT ON COLUMN notifications.from_user_id IS 'Sender of the notification (NULL for system notifications)';
COMMENT ON COLUMN notifications.type IS 'Notification type: mention, achievement, weekly_report, chat';
COMMENT ON COLUMN notifications.title IS 'Notification title (e.g., "새로운 멘션", "습관 달성!")';
COMMENT ON COLUMN notifications.message IS 'Notification message content';
COMMENT ON COLUMN notifications.link_url IS 'Optional link to related content (e.g., /weeks/123)';
COMMENT ON COLUMN notifications.metadata IS 'Additional data: {habit_id, week_id, achievement_type, etc.}';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN notifications.source_version IS 'Data origin: new_schema, dual_write, migration';

-- ============================================================================
-- Constraints
-- ============================================================================

-- Foreign Key to auth.users (recipient, NOT VALID for fast creation)
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

-- Foreign Key to auth.users (sender, NOT VALID for fast creation)
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_from_user_id
FOREIGN KEY (from_user_id) REFERENCES auth.users(id)
ON DELETE SET NULL NOT VALID;

-- Business Rule: Notification type must be one of the allowed values
ALTER TABLE notifications
ADD CONSTRAINT ck_notifications_type
CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')) NOT VALID;

-- Business Rule: Title length limit
ALTER TABLE notifications
ADD CONSTRAINT ck_notifications_title_length
CHECK (char_length(title) >= 1 AND char_length(title) <= 200) NOT VALID;

-- Business Rule: Message length limit
ALTER TABLE notifications
ADD CONSTRAINT ck_notifications_message_length
CHECK (char_length(message) >= 1 AND char_length(message) <= 1000) NOT VALID;

-- Business Rule: metadata must be a JSON object
ALTER TABLE notifications
ADD CONSTRAINT ck_notifications_metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object') NOT VALID;

-- ============================================================================
-- Indexes (will be created in separate migration file)
-- ============================================================================
-- See: 012_create_notifications_indexes.sql

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: Policies created but NOT enabled yet (Phase 2 activation)

-- Policy: Users can only see their own notifications
CREATE POLICY notifications_select_policy ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert notifications for themselves or others (mentions)
-- System can insert achievements and reports
CREATE POLICY notifications_insert_policy ON notifications
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id OR from_user_id IS NULL
);

-- Policy: Users can only update their own notifications (mark as read)
CREATE POLICY notifications_update_policy ON notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own notifications
CREATE POLICY notifications_delete_policy ON notifications
FOR DELETE
USING (auth.uid() = user_id);

-- RLS is NOT enabled yet (will be enabled in Phase 2)
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Note: No updated_at trigger needed (notifications are immutable after creation)

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'notifications'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'notifications'::regclass;

-- Verify RLS policies exist but not enabled
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'notifications';

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'notifications';
-- Expected: rowsecurity = false

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This table is part of the Shadow Schema (Phase 0)
-- 2. RLS policies are created but NOT enabled (Phase 2)
-- 3. Foreign key constraints use NOT VALID (will be validated in Phase 1)
-- 4. Indexes will be created CONCURRENTLY in next migration file
-- 5. No updated_at column - notifications are immutable
-- 6. from_user_id can be NULL for system-generated notifications
-- 7. metadata JSONB allows flexible notification data
-- 8. This table will grow large - indexes and cleanup strategy critical
-- ============================================================================
