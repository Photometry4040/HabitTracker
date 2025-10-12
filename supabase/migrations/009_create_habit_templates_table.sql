-- ============================================================================
-- Migration: 009_create_habit_templates_table
-- Description: Create habit_templates table for Phase 0 (Shadow Schema)
-- Strategy: Strangler Fig Pattern
-- Related: TECH_SPEC.md, DB_MIGRATION_PLAN_V2.md
-- ============================================================================

-- ============================================================================
-- Table: habit_templates
-- Purpose: Store reusable habit templates for quick week creation
-- ============================================================================

CREATE TABLE IF NOT EXISTS habit_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL,
  child_id UUID,

  -- Template Details
  name TEXT NOT NULL,
  description TEXT,
  habits JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Migration Tracking
  source_version TEXT DEFAULT 'new_schema',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE habit_templates IS 'Reusable habit templates for quick week creation (Shadow Schema - Phase 0)';
COMMENT ON COLUMN habit_templates.id IS 'Primary key (UUID v4)';
COMMENT ON COLUMN habit_templates.user_id IS 'Owner of this template (parent user)';
COMMENT ON COLUMN habit_templates.child_id IS 'Specific child template (NULL = shared template)';
COMMENT ON COLUMN habit_templates.name IS 'Template name (e.g., "학기 중 루틴", "방학 루틴")';
COMMENT ON COLUMN habit_templates.description IS 'Optional description of the template';
COMMENT ON COLUMN habit_templates.habits IS 'JSONB array of habit definitions: [{name, time_period, display_order}, ...]';
COMMENT ON COLUMN habit_templates.is_default IS 'Whether this is the default template for quick access';
COMMENT ON COLUMN habit_templates.source_version IS 'Data origin: new_schema, dual_write, migration';

-- ============================================================================
-- Constraints
-- ============================================================================

-- Foreign Key to auth.users (NOT VALID for fast creation)
ALTER TABLE habit_templates
ADD CONSTRAINT fk_habit_templates_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

-- Foreign Key to children (NOT VALID for fast creation)
ALTER TABLE habit_templates
ADD CONSTRAINT fk_habit_templates_child_id
FOREIGN KEY (child_id) REFERENCES children(id)
ON DELETE CASCADE NOT VALID;

-- Business Rule: Template name must be between 1-100 characters
ALTER TABLE habit_templates
ADD CONSTRAINT ck_habit_templates_name_length
CHECK (char_length(name) >= 1 AND char_length(name) <= 100) NOT VALID;

-- Business Rule: Description length limit (optional)
ALTER TABLE habit_templates
ADD CONSTRAINT ck_habit_templates_description_length
CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID;

-- Business Rule: habits JSONB must be an array
ALTER TABLE habit_templates
ADD CONSTRAINT ck_habit_templates_habits_is_array
CHECK (jsonb_typeof(habits) = 'array') NOT VALID;

-- Business Rule: Only one default template per user+child combination
-- Note: This is enforced by partial unique index (see indexes file)

-- ============================================================================
-- Indexes (will be created in separate migration file)
-- ============================================================================
-- See: 010_create_habit_templates_indexes.sql

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Note: Policies created but NOT enabled yet (Phase 2 activation)

-- Policy: Users can only see their own templates
CREATE POLICY habit_templates_select_policy ON habit_templates
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own templates
CREATE POLICY habit_templates_insert_policy ON habit_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own templates
CREATE POLICY habit_templates_update_policy ON habit_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own templates
CREATE POLICY habit_templates_delete_policy ON habit_templates
FOR DELETE
USING (auth.uid() = user_id);

-- RLS is NOT enabled yet (will be enabled in Phase 2)
-- ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_habit_templates_updated_at
BEFORE UPDATE ON habit_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'habit_templates'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'habit_templates'::regclass;

-- Verify RLS policies exist but not enabled
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'habit_templates';

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'habit_templates';
-- Expected: rowsecurity = false

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. This table is part of the Shadow Schema (Phase 0)
-- 2. RLS policies are created but NOT enabled (Phase 2)
-- 3. Foreign key constraints use NOT VALID (will be validated in Phase 1)
-- 4. Indexes will be created CONCURRENTLY in next migration file
-- 5. habits JSONB structure: [{name: "책 읽기", time_period: "아침", display_order: 0}, ...]
-- 6. child_id is nullable - NULL means shared template for all children
-- 7. is_default flag allows quick access to preferred template
-- 8. Partial unique index ensures only one default per user+child
-- ============================================================================
