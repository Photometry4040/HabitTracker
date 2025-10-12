-- ============================================================================
-- Migration: 005_create_habits_table
-- Description: Create habits table for Phase 0 (Shadow Schema)
-- Strategy: Strangler Fig Pattern
-- Related: TECH_SPEC.md, DB_MIGRATION_PLAN_V2.md
-- ============================================================================

-- ============================================================================
-- Table: habits
-- Purpose: Store individual habits within a weekly tracking period
-- ============================================================================

CREATE TABLE IF NOT EXISTS habits (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  week_id UUID NOT NULL,
  
  -- Habit Details
  name TEXT NOT NULL,
  time_period TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Migration Tracking
  source_version TEXT DEFAULT 'new_schema',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE habits IS 'Individual habits within weekly tracking periods (Shadow Schema - Phase 0)';
COMMENT ON COLUMN habits.id IS 'Primary key (UUID v4)';
COMMENT ON COLUMN habits.week_id IS 'Reference to weeks table';
COMMENT ON COLUMN habits.name IS 'Habit name/description (e.g., "책 읽기", "양치하기")';
COMMENT ON COLUMN habits.time_period IS 'Time slot for habit (e.g., "아침", "저녁", "자기 전")';
COMMENT ON COLUMN habits.display_order IS 'Display order within the week (0-based)';
COMMENT ON COLUMN habits.source_version IS 'Data origin: new_schema, dual_write, migration';

-- ============================================================================
-- Constraints
-- ============================================================================

-- Foreign Key to weeks (NOT VALID for fast creation)
ALTER TABLE habits
ADD CONSTRAINT fk_habits_week_id
FOREIGN KEY (week_id) REFERENCES weeks(id)
ON DELETE CASCADE NOT VALID;

-- Business Rule: Habit name must be between 1-200 characters
ALTER TABLE habits
ADD CONSTRAINT ck_habits_name_length
CHECK (char_length(name) >= 1 AND char_length(name) <= 200) NOT VALID;

-- Business Rule: Display order must be non-negative
ALTER TABLE habits
ADD CONSTRAINT ck_habits_display_order
CHECK (display_order >= 0) NOT VALID;

-- Business Rule: No duplicate habit names within same week
ALTER TABLE habits
ADD CONSTRAINT uq_habits_week_name
UNIQUE (week_id, name) DEFERRABLE INITIALLY IMMEDIATE;

-- ============================================================================
-- Indexes (will be created in separate migration file)
-- ============================================================================
-- See: 006_create_habits_indexes.sql

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: Policies created but NOT enabled yet (Phase 2 activation)

-- Policy: Users can only see habits from their own weeks
CREATE POLICY habits_select_policy ON habits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM weeks
    WHERE weeks.id = habits.week_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only insert habits into their own weeks
CREATE POLICY habits_insert_policy ON habits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM weeks
    WHERE weeks.id = habits.week_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only update habits in their own weeks
CREATE POLICY habits_update_policy ON habits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM weeks
    WHERE weeks.id = habits.week_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only delete habits from their own weeks
CREATE POLICY habits_delete_policy ON habits
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM weeks
    WHERE weeks.id = habits.week_id
    AND weeks.user_id = auth.uid()
  )
);

-- RLS is NOT enabled yet (will be enabled in Phase 2)
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_habits_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'habits'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'habits'::regclass;

-- Verify RLS policies exist but not enabled
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'habits';

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'habits';
-- Expected: rowsecurity = false

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This table is part of the Shadow Schema (Phase 0)
-- 2. RLS policies are created but NOT enabled (Phase 2)
-- 3. Foreign key constraints use NOT VALID (will be validated in Phase 1)
-- 4. Indexes will be created CONCURRENTLY in next migration file
-- 5. Habit completion records are stored in separate habit_records table
-- 6. display_order allows flexible reordering within UI
-- ============================================================================
