-- ============================================================================
-- CHILDREN TABLE INDEXES - PHASE 0
-- ============================================================================
-- Purpose: Create indexes with CONCURRENTLY for zero-downtime
-- Created: 2025-10-12
-- Note: Must be executed in a separate transaction from table creation
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_name ON children(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_user_name ON children(user_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_source_version ON children(source_version) WHERE source_version IN ('dual_write', 'migration');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_children_created_at_desc ON children(created_at DESC);
