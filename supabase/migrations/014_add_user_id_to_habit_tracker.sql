-- ============================================================================
-- Migration: 014_add_user_id_to_habit_tracker
-- Description: Add user_id column to existing habit_tracker table
-- Created: 2025-10-12
-- Purpose: Enable user-based data filtering for authentication
-- ============================================================================

-- Add user_id column (nullable for now to allow existing data)
ALTER TABLE habit_tracker 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint to auth.users
ALTER TABLE habit_tracker
ADD CONSTRAINT fk_habit_tracker_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_habit_tracker_user_id 
ON habit_tracker(user_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_habit_tracker_user_child_week 
ON habit_tracker(user_id, child_name, week_start_date);

-- Add comments
COMMENT ON COLUMN habit_tracker.user_id IS 
  'User who owns this habit tracking data. Links to auth.users.';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 014 completed: user_id column added to habit_tracker';
END $$;
