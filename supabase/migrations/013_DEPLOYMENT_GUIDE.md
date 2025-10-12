# Migration 013: Dual-Write Triggers - Deployment Guide

**Status**: Phase 0 Skeleton (Safe to Deploy)
**Impact**: LOW (Logs only, no data changes)
**Reversible**: YES
**Estimated Time**: < 1 minute

---

## Quick Deployment

### 1. Open Supabase SQL Editor
[Click here to open Supabase Dashboard](https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/editor)

### 2. Execute Migration File
- Open [`013_create_dual_write_triggers.sql`](013_create_dual_write_triggers.sql)
- Copy entire contents (400+ lines)
- Paste into Supabase SQL Editor
- Click "Run" button

### 3. Expected Results
```
Success. No rows returned
```

**Time**: < 5 seconds

---

## What This Migration Creates

### 1. Idempotency Log Table
```sql
idempotency_log
├── id (UUID, primary key)
├── key (TEXT, unique) - Idempotency key from header
├── operation (TEXT) - create_week, update_habit_record, delete_week
├── request_data (JSONB) - Original request
├── response_data (JSONB) - Cached response
├── status (TEXT) - success, failed, not_implemented
├── created_at (TIMESTAMPTZ)
└── expires_at (TIMESTAMPTZ) - Auto-expire after 24h
```

**Purpose**: Track Edge Function requests for idempotent operations

**Indexes**: 4 indexes created
- `idx_idempotency_key` - Fast key lookup
- `idx_idempotency_expires` - Cleanup queries
- `idx_idempotency_status` - Monitoring
- `idx_idempotency_created` - Recent logs

### 2. Cleanup Function
```sql
cleanup_idempotency_log() RETURNS INTEGER
```

**Purpose**: Remove expired idempotency logs (older than 24 hours)

**Usage**:
```sql
SELECT cleanup_idempotency_log();
-- Returns: Number of deleted logs
```

**Phase 1 TODO**: Schedule daily via pg_cron

### 3. Sync Trigger Function
```sql
sync_old_to_new() RETURNS TRIGGER
```

**Phase 0 Behavior**: Logs only (no data sync)

**Example Log Output**:
```
NOTICE: Dual-write trigger fired: table=habit_tracker, operation=INSERT, id=123
NOTICE: Trigger details: child_name=Test Child, week_start_date=2025-10-14
```

**Phase 1 TODO**: Uncomment sync logic to actually sync data

### 4. Trigger on habit_tracker
```sql
trigger_habit_tracker_dual_write
```

**Fires On**: INSERT, UPDATE, DELETE on habit_tracker table

**Phase 0 Behavior**: Logs operation details, does NOT modify new schema

**Phase 1 Behavior**: Syncs changes to new schema (children, weeks, habits, habit_records)

---

## Verification Steps

### Step 1: Check Idempotency Table
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'idempotency_log'
ORDER BY ordinal_position;
```

**Expected**: 8 columns (id, key, operation, request_data, response_data, status, created_at, expires_at)

### Step 2: Check Indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'idempotency_log'
ORDER BY indexname;
```

**Expected**: 5 indexes (pkey + 4 custom)

### Step 3: Check Trigger Exists
```sql
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_habit_tracker_dual_write';
```

**Expected**: 1 row
- trigger_name: `trigger_habit_tracker_dual_write`
- table_name: `habit_tracker`
- enabled: `O` (Enabled)

### Step 4: Test Trigger (Optional)
```sql
-- Insert test record
INSERT INTO habit_tracker (child_name, week_start_date, week_period, habits, user_id)
VALUES (
  'Trigger Test',
  '2025-10-14',  -- Monday
  '2025년 10월 14일 ~ 2025년 10월 20일',
  '[]'::jsonb,
  'fc24adf2-a7af-4fbf-abe0-c332bb48b02b'  -- Replace with your user_id
);

-- Check logs (should see NOTICE messages)
-- Expected output:
-- NOTICE: Dual-write trigger fired: table=habit_tracker, operation=INSERT, id=...
-- NOTICE: Trigger details: child_name=Trigger Test, week_start_date=2025-10-14

-- Verify NO records created in new schema (Phase 0 behavior)
SELECT COUNT(*) FROM children WHERE name = 'Trigger Test';
-- Expected: 0

SELECT COUNT(*) FROM weeks WHERE child_id IN (
  SELECT id FROM children WHERE name = 'Trigger Test'
);
-- Expected: 0

-- Cleanup test data
DELETE FROM habit_tracker WHERE child_name = 'Trigger Test';
```

---

## Safety Notes

### ✅ Safe to Deploy
- **No data changes**: Trigger only logs, does not sync
- **No breaking changes**: Existing functionality unaffected
- **Reversible**: Can disable or drop trigger anytime
- **Low risk**: Tested with commented sync logic

### 🔒 Security
- No RLS policies needed (system-level function)
- Trigger runs with definer privileges
- Idempotency log accessible only via service role

### ⚡ Performance
- **Minimal overhead**: Logging is fast (< 1ms)
- **No blocking**: Trigger is AFTER trigger (doesn't block writes)
- **Indexed**: All critical columns indexed

---

## Rollback Plan

### Option 1: Disable Trigger (Recommended)
```sql
ALTER TABLE habit_tracker DISABLE TRIGGER trigger_habit_tracker_dual_write;
```

**Impact**: Trigger stops firing, but structure remains

**Reversible**: Re-enable with `ENABLE TRIGGER`

### Option 2: Drop Trigger
```sql
DROP TRIGGER IF EXISTS trigger_habit_tracker_dual_write ON habit_tracker;
```

**Impact**: Trigger removed completely

**Reversible**: Re-run migration 013

### Option 3: Drop Everything
```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_habit_tracker_dual_write ON habit_tracker;

-- Drop functions
DROP FUNCTION IF EXISTS sync_old_to_new();
DROP FUNCTION IF EXISTS cleanup_idempotency_log();

-- Drop table (⚠️ loses idempotency logs)
DROP TABLE IF EXISTS idempotency_log;
```

**Impact**: Complete rollback

**Warning**: Loses all idempotency logs

---

## Monitoring

### Check Trigger Firing
```sql
-- Enable logging to see NOTICE messages
SET client_min_messages = 'NOTICE';

-- Perform operation that fires trigger
-- (Any INSERT/UPDATE/DELETE on habit_tracker)

-- Check logs in Supabase Dashboard > Logs
```

### Monitor Idempotency Log Growth
```sql
SELECT
  COUNT(*) as total_logs,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_logs,
  COUNT(*) FILTER (WHERE status = 'success') as success_logs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_logs
FROM idempotency_log;
```

### Cleanup Statistics
```sql
-- Run cleanup and see results
SELECT cleanup_idempotency_log() as deleted_count;
```

---

## Phase 1 Activation Checklist

When ready to activate dual-write sync (Phase 1):

- [ ] Edge Function deployed and tested
- [ ] 24-hour stability test passed
- [ ] Drift detection shows < 0.1% drift
- [ ] Performance baseline acceptable
- [ ] Team approval obtained
- [ ] Uncomment sync logic in `sync_old_to_new()`
- [ ] Create pg_cron job for `cleanup_idempotency_log()`
- [ ] Monitor logs for errors
- [ ] Verify drift remains low (< 0.1%)

---

## Troubleshooting

### Issue: Trigger Not Firing
**Check**:
```sql
SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_habit_tracker_dual_write';
```

**Solution**: If disabled, enable with:
```sql
ALTER TABLE habit_tracker ENABLE TRIGGER trigger_habit_tracker_dual_write;
```

### Issue: No NOTICE Messages in Logs
**Cause**: Log level too high

**Solution**:
```sql
SET client_min_messages = 'NOTICE';
```

### Issue: Idempotency Log Growing Too Large
**Check**:
```sql
SELECT COUNT(*) FROM idempotency_log;
```

**Solution**: Run cleanup manually
```sql
SELECT cleanup_idempotency_log();
```

**Long-term**: Schedule pg_cron job (Phase 1)

---

## Additional Resources

- [Edge Function README](../../functions/dual-write-habit/README.md) - Edge Function documentation
- [WEEK2_PLAN.md](../../WEEK2_PLAN.md) - Phase 0 Week 2 plan
- [PHASE_0_PROGRESS.md](../../PHASE_0_PROGRESS.md) - Overall progress tracking
- [DB_MIGRATION_PLAN_V2.md](../../DB_MIGRATION_PLAN_V2.md) - Migration strategy

---

## Success Criteria

Migration 013 is successful when:

- ✅ idempotency_log table created
- ✅ 4 indexes on idempotency_log created
- ✅ cleanup_idempotency_log() function created
- ✅ sync_old_to_new() function created
- ✅ trigger_habit_tracker_dual_write created and enabled
- ✅ Test trigger shows NOTICE in logs
- ✅ Test trigger does NOT create records in new schema (Phase 0)
- ✅ No errors in Supabase logs

---

**Created**: 2025-10-12
**Status**: Phase 0 Skeleton
**Next Step**: Deploy via Supabase SQL Editor
**Estimated Time**: < 1 minute
