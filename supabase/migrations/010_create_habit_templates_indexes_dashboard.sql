-- ============================================================================
-- Migration: 010_create_habit_templates_indexes (Dashboard Version)
-- Description: Create indexes for habit_templates table (WITHOUT CONCURRENTLY)
-- Note: CONCURRENTLY removed for Supabase Dashboard compatibility
-- Related: 009_create_habit_templates_table.sql
-- ============================================================================

-- Index 1: User ID lookup
CREATE INDEX IF NOT EXISTS idx_habit_templates_user_id
ON habit_templates(user_id);

-- Index 2: Child ID lookup
CREATE INDEX IF NOT EXISTS idx_habit_templates_child_id
ON habit_templates(child_id);

-- Index 3: Composite index for user+child template queries
CREATE INDEX IF NOT EXISTS idx_habit_templates_user_child
ON habit_templates(user_id, child_id);

-- Index 4: Partial unique index - only one default per user+child
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_templates_default_unique
ON habit_templates(user_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE is_default = true;

-- Index 5: Partial index for migration tracking
CREATE INDEX IF NOT EXISTS idx_habit_templates_source_version
ON habit_templates(source_version)
WHERE source_version IN ('dual_write', 'migration');

-- Index 6: GIN index for JSONB habits column
CREATE INDEX IF NOT EXISTS idx_habit_templates_habits_gin
ON habit_templates USING GIN (habits);

-- Index 7: Composite for default template quick access
CREATE INDEX IF NOT EXISTS idx_habit_templates_user_default
ON habit_templates(user_id, is_default)
WHERE is_default = true;
