-- ============================================================================
-- Migration: 003_create_weeks_table
-- Description: Create weeks table for Phase 0 (Shadow Schema)
-- Strategy: Strangler Fig Pattern
-- Related: TECH_SPEC.md, DB_MIGRATION_PLAN_V2.md
-- ============================================================================

-- ============================================================================
-- Table: weeks
-- Purpose: Store weekly habit tracking periods
-- ============================================================================

CREATE TABLE IF NOT EXISTS weeks (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL,
  child_id UUID NOT NULL,
  
  -- Week Period Data
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Week Content
  theme TEXT,
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  
  -- Template Reference (nullable - will be activated in Phase 2)
  template_id UUID,
  
  -- Migration Tracking
  source_version TEXT DEFAULT 'new_schema',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE weeks IS 'Weekly habit tracking periods (Shadow Schema - Phase 0)';
COMMENT ON COLUMN weeks.id IS 'Primary key (UUID v4)';
COMMENT ON COLUMN weeks.user_id IS 'Owner of this week (parent user)';
COMMENT ON COLUMN weeks.child_id IS 'Which child this week belongs to';
COMMENT ON COLUMN weeks.week_start_date IS 'Week start date (Monday)';
COMMENT ON COLUMN weeks.week_end_date IS 'Week end date (Sunday)';
COMMENT ON COLUMN weeks.theme IS 'Weekly theme or goal description';
COMMENT ON COLUMN weeks.reflection IS 'Weekly reflection data (JSONB)';
COMMENT ON COLUMN weeks.reward IS 'Reward description for completing habits';
COMMENT ON COLUMN weeks.template_id IS 'Reference to habit_templates (will be activated in Phase 2)';
COMMENT ON COLUMN weeks.source_version IS 'Data origin: new_schema, dual_write, migration';

-- ============================================================================
-- Constraints
-- ============================================================================

-- Foreign Key to auth.users (NOT VALID for fast creation)
ALTER TABLE weeks
ADD CONSTRAINT fk_weeks_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

-- Foreign Key to children (NOT VALID for fast creation)
ALTER TABLE weeks
ADD CONSTRAINT fk_weeks_child_id
FOREIGN KEY (child_id) REFERENCES children(id)
ON DELETE CASCADE NOT VALID;

-- Business Rule: week_end_date must be 6 days after week_start_date
ALTER TABLE weeks
ADD CONSTRAINT ck_weeks_date_range
CHECK (week_end_date = week_start_date + INTERVAL '6 days') NOT VALID;

-- Business Rule: week_start_date must be Monday (DOW = 1)
ALTER TABLE weeks
ADD CONSTRAINT ck_weeks_start_monday
CHECK (EXTRACT(DOW FROM week_start_date) = 1) NOT VALID;

-- Business Rule: No duplicate weeks for same child
ALTER TABLE weeks
ADD CONSTRAINT uq_weeks_child_start_date
UNIQUE (child_id, week_start_date) DEFERRABLE INITIALLY IMMEDIATE;

-- ============================================================================
-- Indexes (will be created in separate migration file)
-- ============================================================================
-- See: 004_create_weeks_indexes.sql

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: Policies created but NOT enabled yet (Phase 2 activation)

-- Policy: Users can only see their own weeks
CREATE POLICY weeks_select_policy ON weeks
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own weeks
CREATE POLICY weeks_insert_policy ON weeks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own weeks
CREATE POLICY weeks_update_policy ON weeks
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own weeks
CREATE POLICY weeks_delete_policy ON weeks
FOR DELETE
USING (auth.uid() = user_id);

-- RLS is NOT enabled yet (will be enabled in Phase 2)
-- ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_weeks_updated_at
BEFORE UPDATE ON weeks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'weeks'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'weeks'::regclass;

-- Verify RLS policies exist but not enabled
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'weeks';

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'weeks';
-- Expected: rowsecurity = false

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This table is part of the Shadow Schema (Phase 0)
-- 2. RLS policies are created but NOT enabled (Phase 2)
-- 3. Foreign key constraints use NOT VALID (will be validated in Phase 1)
-- 4. Indexes will be created CONCURRENTLY in next migration file
-- 5. template_id FK will be added after habit_templates table exists
-- ============================================================================
