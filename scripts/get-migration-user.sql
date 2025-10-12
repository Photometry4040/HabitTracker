-- Get any existing user from auth.users for migration
-- Run this in Supabase SQL Editor to get a user_id for migration

SELECT id FROM auth.users LIMIT 1;

-- If no users exist, you need to log into the web app first
-- to create a user, then run the backfill scripts
