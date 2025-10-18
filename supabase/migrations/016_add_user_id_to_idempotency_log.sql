-- ============================================================================
-- Migration: 016_add_user_id_to_idempotency_log.sql
-- Description: Add user_id column and RLS policy to idempotency_log table
-- Phase: Phase 3 Security Enhancement
-- Date: 2025-10-18
-- Purpose: Enable user-level isolation for idempotency logs
-- ============================================================================

-- ============================================================================
-- Step 1: Add user_id column (nullable for historical data)
-- ============================================================================
ALTER TABLE idempotency_log
ADD COLUMN user_id UUID;

COMMENT ON COLUMN idempotency_log.user_id IS 'Owner of the operation (parent user)';

-- ============================================================================
-- Step 2: Add foreign key constraint
-- ============================================================================
ALTER TABLE idempotency_log
ADD CONSTRAINT fk_idempotency_log_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- ============================================================================
-- Step 3: Create index for performance
-- ============================================================================
CREATE INDEX idx_idempotency_log_user_id ON idempotency_log(user_id);

-- ============================================================================
-- Step 4: Create RLS Policies for idempotency_log
-- ============================================================================

-- Policy 1: SELECT - Users can only see their own operation logs
CREATE POLICY idempotency_log_select_policy ON idempotency_log
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 2: INSERT - Users can only insert their own operation logs
CREATE POLICY idempotency_log_insert_policy ON idempotency_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Users can only update their own operation logs
CREATE POLICY idempotency_log_update_policy ON idempotency_log
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 4: DELETE - Users can only delete their own operation logs
CREATE POLICY idempotency_log_delete_policy ON idempotency_log
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- Verification Queries (run these to confirm)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'idempotency_log'
-- ORDER BY ordinal_position;

-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'idempotency_log'
-- ORDER BY policyname;
