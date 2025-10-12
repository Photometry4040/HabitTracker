-- ============================================================================
-- CHILDREN TABLE DDL - PHASE 0
-- ============================================================================
-- Purpose: Create the foundational 'children' table for the Habit Tracker
--          system using the Strangler Fig Pattern for zero-downtime migration
-- Created: 2025-10-12
-- Migration Phase: Phase 0 - Shadow Schema Creation
-- ============================================================================

-- Section 1: Helper Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Section 2: Table Creation
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_version TEXT DEFAULT 'new_schema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 3: Constraints
ALTER TABLE children
ADD CONSTRAINT fk_children_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

ALTER TABLE children
ADD CONSTRAINT ck_children_name_length
CHECK (char_length(name) >= 1 AND char_length(name) <= 100) NOT VALID;

ALTER TABLE children
ADD CONSTRAINT uq_children_user_name
UNIQUE (user_id, name) DEFERRABLE INITIALLY IMMEDIATE;

-- Section 4: RLS Policies (NOT ENABLED)
CREATE POLICY children_select_policy ON children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY children_insert_policy ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY children_update_policy ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY children_delete_policy ON children FOR DELETE USING (auth.uid() = user_id);

-- Section 5: Trigger
CREATE TRIGGER set_children_updated_at
BEFORE UPDATE ON children
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
