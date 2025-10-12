-- ============================================================================
-- Migration: 008_create_habit_records_indexes (Dashboard Version)
-- Description: Create indexes for habit_records table (WITHOUT CONCURRENTLY)
-- Note: CONCURRENTLY removed for Supabase Dashboard compatibility
-- Related: 007_create_habit_records_table.sql
-- ============================================================================

-- Index 1: Habit ID lookup
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_id
ON habit_records(habit_id);

-- Index 2: Record date (recent-first ordering)
CREATE INDEX IF NOT EXISTS idx_habit_records_date_desc
ON habit_records(record_date DESC);

-- Index 3: Composite index for habit timeline queries
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_date
ON habit_records(habit_id, record_date DESC);

-- Index 4: Status lookup
CREATE INDEX IF NOT EXISTS idx_habit_records_status
ON habit_records(status);

-- Index 5: Composite for habit-specific status queries
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_status
ON habit_records(habit_id, status);

-- Index 6: Partial index for migration tracking
CREATE INDEX IF NOT EXISTS idx_habit_records_source_version
ON habit_records(source_version)
WHERE source_version IN ('dual_write', 'migration');

-- Index 7: Composite for date range queries
CREATE INDEX IF NOT EXISTS idx_habit_records_date_status
ON habit_records(record_date DESC, status);
