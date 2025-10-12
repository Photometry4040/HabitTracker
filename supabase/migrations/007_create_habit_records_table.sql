-- ============================================================================
-- Migration: 007_create_habit_records_table
-- Description: Create habit_records table for Phase 0 (Shadow Schema)
-- Strategy: Strangler Fig Pattern
-- Related: TECH_SPEC.md, DB_MIGRATION_PLAN_V2.md
-- ============================================================================

-- ============================================================================
-- Table: habit_records
-- Purpose: Store daily completion records for each habit
-- ============================================================================

CREATE TABLE IF NOT EXISTS habit_records (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  habit_id UUID NOT NULL,
  
  -- Record Details
  record_date DATE NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  
  -- Migration Tracking
  source_version TEXT DEFAULT 'new_schema',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE habit_records IS 'Daily habit completion records (Shadow Schema - Phase 0)';
COMMENT ON COLUMN habit_records.id IS 'Primary key (UUID v4)';
COMMENT ON COLUMN habit_records.habit_id IS 'Reference to habits table';
COMMENT ON COLUMN habit_records.record_date IS 'Date of the habit completion (YYYY-MM-DD)';
COMMENT ON COLUMN habit_records.status IS 'Completion status: green (완료), yellow (부분 완료), red (미완료), none (미기록)';
COMMENT ON COLUMN habit_records.note IS 'Optional note about the completion (e.g., reason for failure, celebration message)';
COMMENT ON COLUMN habit_records.source_version IS 'Data origin: new_schema, dual_write, migration';

-- ============================================================================
-- Constraints
-- ============================================================================

-- Foreign Key to habits (NOT VALID for fast creation)
ALTER TABLE habit_records
ADD CONSTRAINT fk_habit_records_habit_id
FOREIGN KEY (habit_id) REFERENCES habits(id)
ON DELETE CASCADE NOT VALID;

-- Business Rule: Status must be one of the allowed values
ALTER TABLE habit_records
ADD CONSTRAINT ck_habit_records_status
CHECK (status IN ('green', 'yellow', 'red', 'none')) NOT VALID;

-- Business Rule: Note length limit (optional but recommended)
ALTER TABLE habit_records
ADD CONSTRAINT ck_habit_records_note_length
CHECK (note IS NULL OR char_length(note) <= 500) NOT VALID;

-- Business Rule: No duplicate records for same habit on same date
ALTER TABLE habit_records
ADD CONSTRAINT uq_habit_records_habit_date
UNIQUE (habit_id, record_date) DEFERRABLE INITIALLY IMMEDIATE;

-- ============================================================================
-- Indexes (will be created in separate migration file)
-- ============================================================================
-- See: 008_create_habit_records_indexes.sql

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: Policies created but NOT enabled yet (Phase 2 activation)

-- Policy: Users can only see records for their own habits
CREATE POLICY habit_records_select_policy ON habit_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM habits
    JOIN weeks ON weeks.id = habits.week_id
    WHERE habits.id = habit_records.habit_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only insert records for their own habits
CREATE POLICY habit_records_insert_policy ON habit_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habits
    JOIN weeks ON weeks.id = habits.week_id
    WHERE habits.id = habit_records.habit_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only update records for their own habits
CREATE POLICY habit_records_update_policy ON habit_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM habits
    JOIN weeks ON weeks.id = habits.week_id
    WHERE habits.id = habit_records.habit_id
    AND weeks.user_id = auth.uid()
  )
);

-- Policy: Users can only delete records for their own habits
CREATE POLICY habit_records_delete_policy ON habit_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM habits
    JOIN weeks ON weeks.id = habits.week_id
    WHERE habits.id = habit_records.habit_id
    AND weeks.user_id = auth.uid()
  )
);

-- RLS is NOT enabled yet (will be enabled in Phase 2)
-- ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_habit_records_updated_at
BEFORE UPDATE ON habit_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'habit_records'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'habit_records'::regclass;

-- Verify RLS policies exist but not enabled
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'habit_records';

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'habit_records';
-- Expected: rowsecurity = false

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This table is part of the Shadow Schema (Phase 0)
-- 2. RLS policies are created but NOT enabled (Phase 2)
-- 3. Foreign key constraints use NOT VALID (will be validated in Phase 1)
-- 4. Indexes will be created CONCURRENTLY in next migration file
-- 5. This replaces the JSONB completion data in old habit_tracker table
-- 6. Status values match existing UI: green, yellow, red, none
-- 7. Unique constraint prevents duplicate daily records
-- ============================================================================
