-- ============================================================================
-- Migration: 010_create_habit_templates_indexes
-- Description: Create indexes for habit_templates table
-- Strategy: CONCURRENTLY for zero-downtime
-- Related: 009_create_habit_templates_table.sql
-- ============================================================================

-- ============================================================================
-- Index Strategy
-- ============================================================================
-- 1. user_id: Filter templates by user (most common query)
-- 2. child_id: Filter templates by child
-- 3. Composite (user_id, child_id): Optimal for user+child template list
-- 4. Partial unique (user_id, child_id, is_default): Enforce one default
-- 5. Partial index on source_version: Track migration data only
-- 6. GIN index on habits JSONB: Support habit name search within templates
-- ============================================================================

-- Index 1: User ID lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_user_id
ON habit_templates(user_id);

-- Index 2: Child ID lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_child_id
ON habit_templates(child_id);

-- Index 3: Composite index for user+child template queries
-- Supports: WHERE user_id = ? AND child_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_user_child
ON habit_templates(user_id, child_id);

-- Index 4: Partial unique index - only one default per user+child
-- Enforces business rule: is_default = true can only exist once per user+child
-- NULL child_id is treated as a separate group (shared templates)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_default_unique
ON habit_templates(user_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE is_default = true;

-- Index 5: Partial index for migration tracking
-- Only indexes rows from dual-write or migration (not new_schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_source_version
ON habit_templates(source_version)
WHERE source_version IN ('dual_write', 'migration');

-- Index 6: GIN index for JSONB habits column
-- Supports: WHERE habits @> '[{"name": "책 읽기"}]'::jsonb
-- Enables searching for templates containing specific habit names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_habits_gin
ON habit_templates USING GIN (habits);

-- Index 7: Composite for default template quick access
-- Supports: WHERE user_id = ? AND is_default = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_templates_user_default
ON habit_templates(user_id, is_default)
WHERE is_default = true;

-- ============================================================================
-- Index Usage Examples
-- ============================================================================

-- Query 1: Get all templates for a user (most common)
-- SELECT * FROM habit_templates WHERE user_id = '...';
-- Uses: idx_habit_templates_user_id

-- Query 2: Get templates for a specific child
-- SELECT * FROM habit_templates WHERE user_id = '...' AND child_id = '...';
-- Uses: idx_habit_templates_user_child

-- Query 3: Get default template for quick access
-- SELECT * FROM habit_templates WHERE user_id = '...' AND is_default = true;
-- Uses: idx_habit_templates_user_default

-- Query 4: Search templates containing a specific habit
-- SELECT * FROM habit_templates WHERE habits @> '[{"name": "책 읽기"}]'::jsonb;
-- Uses: idx_habit_templates_habits_gin

-- Query 5: Shared templates (no child_id)
-- SELECT * FROM habit_templates WHERE user_id = '...' AND child_id IS NULL;
-- Uses: idx_habit_templates_user_child

-- ============================================================================
-- Performance Expectations
-- ============================================================================
-- Table Size Estimates:
-- - 10 users × 5 templates = 50 rows (small table)
-- - After 5 years: ~250 rows (assuming 10x growth)
-- - Index overhead: ~20KB per index × 7 = 140KB total
--
-- Query Performance (estimated):
-- - User template list: <1ms (always fast due to small size)
-- - Default template lookup: <1ms
-- - JSONB habit search: <5ms (GIN index)
--
-- Expected Growth Scenarios:
-- - 10x (500 rows): All queries <1ms
-- - 100x (5,000 rows): All queries <3ms
-- - 1000x (50,000 rows): All queries <10ms
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'habit_templates'
-- ORDER BY indexname;

-- Check index sizes
-- SELECT
--   indexrelname AS index_name,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND relname = 'habit_templates'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Verify unique constraint on is_default
-- INSERT INTO habit_templates (user_id, child_id, name, is_default)
-- VALUES ('...', '...', 'Test', true);
-- -- Second insert should fail if same user_id+child_id+is_default=true

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. All indexes use CONCURRENTLY to avoid table locks
-- 2. Partial unique index enforces business rule: one default per user+child
-- 3. GIN index enables advanced JSONB queries for habit search
-- 4. COALESCE trick in unique index handles NULL child_id correctly
-- 5. Safe to run on production (no downtime)
-- 6. habit_templates is a small table - all queries will be very fast
-- ============================================================================
