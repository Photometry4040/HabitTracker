# Phase 2 Day 2: Testing Guide

## Status Summary

### ✅ Completed
- [x] App.jsx read operations migrated to new schema (Day 1)
- [x] App.jsx write operations migrated to Edge Functions (Day 2)
- [x] Edge Function deployed and responding
- [x] All code changes complete

### ⚠️ Blocker: Migration 013 Not Deployed
- [ ] **idempotency_log table missing** - Edge Function will fail without it
- [ ] Need manual deployment via Supabase Dashboard

---

## Pre-Test Deployment Required

### Step 1: Deploy Migration 013 (idempotency_log table)

**Why**: Edge Function requires `idempotency_log` table to track operations and prevent duplicates.

**Current Error**:
```
relation "public.idempotency_log" does not exist
```

**Deployment Steps**:

1. **Open Supabase SQL Editor**:
   https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/editor

2. **Copy Migration File**:
   Open: `supabase/migrations/013_create_dual_write_triggers.sql`

3. **Paste and Run**:
   - Paste entire file (325 lines) into SQL Editor
   - Click "Run" button
   - ✅ Expected: "Success. No rows returned"

4. **Verify Deployment**:
   ```sql
   -- Check table exists
   SELECT COUNT(*) FROM idempotency_log;
   -- Expected: 0 rows (empty table is correct)

   -- Check table structure
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'idempotency_log'
   ORDER BY ordinal_position;
   -- Expected: 8 columns (id, key, operation, request_data, response_data, status, created_at, expires_at)
   ```

5. **Re-run Status Check**:
   ```bash
   node scripts/check-database-status.js
   ```

   Should now show:
   ```
   📝 Checking idempotency_log...
     Total logs: 0
     ✅ Table exists and is ready
   ```

---

## Testing Plan (After Migration 013 Deployed)

### Test Environment
- **URL**: http://localhost:5173/
- **User**: fc24adf2-a7af-4fbf-abe0-c332bb48b02b (existing user)
- **Test Children**: "test", "이영준"
- **Dev Server**: Already running (confirmed)

---

### Test 1: New Week Creation (saveData via Edge Function)

**Goal**: Verify `createWeekDualWrite()` writes to both old and new schemas.

**Steps**:

1. **Open web app and login**:
   - Go to http://localhost:5173/
   - Login with existing credentials

2. **Create new week**:
   - Select child: "test"
   - Select new week start date: **2025년 10월 14일** (Monday, not yet used)
   - Add habits:
     ```
     - 양치하기 (아침)
     - 책읽기 (저녁)
     - 운동하기 (오후)
     ```
   - Add theme: "건강한 습관 만들기"
   - Add reward: "주말에 영화 보기"

3. **Save data**:
   - Click "저장" button
   - **Expected Console Output**:
     ```
     데이터가 성공적으로 저장되었습니다! (Dual-write)
     {
       success: true,
       old_schema: { id: 134 },
       new_schema: {
         child_id: "...",
         week_id: "...",
         habit_ids: ["...", "...", "..."]
       }
     }
     ```

4. **Verify data persists**:
   - Refresh page (F5)
   - Select same child and date
   - ✅ All habits, theme, reward should load correctly

5. **Check database consistency**:
   ```bash
   node scripts/validate-zero-drift.js
   ```

   **Expected**: 0% drift (data in both schemas)

---

### Test 2: Habit Color Update (updateHabitColor via Edge Function)

**Goal**: Verify `updateHabitRecordDualWrite()` persists color changes immediately.

**Steps**:

1. **Load existing week**:
   - Select child: "test"
   - Select date: **2025년 7월 21일** (existing week with data)

2. **Change habit colors**:
   - Click on "양치하기" Monday cell → Change to GREEN
   - Click on "양치하기" Tuesday cell → Change to YELLOW
   - Click on "양치하기" Wednesday cell → Change to RED

3. **Expected Console Output** (after each click):
   ```
   Habit record updated via Edge Function: 양치하기 day 0 = green
   Habit record updated via Edge Function: 양치하기 day 1 = yellow
   Habit record updated via Edge Function: 양치하기 day 2 = red
   ```

4. **Verify optimistic UI**:
   - ✅ Colors change **instantly** (no delay)
   - ✅ No need to click save button

5. **Verify persistence**:
   - Refresh page (F5)
   - Select same child and date
   - ✅ All color changes should persist

6. **Check database consistency**:
   ```bash
   node scripts/validate-zero-drift.js
   ```

   **Expected**: 0% drift (changes in both schemas)

---

### Test 3: Idempotency Verification

**Goal**: Verify Edge Function prevents duplicate operations.

**Steps**:

1. **Check idempotency logs**:
   ```bash
   node scripts/check-idempotency-logs.js
   ```

   **Expected**:
   - Logs from Test 1 (create_week operation)
   - Logs from Test 2 (update_habit_record operations)
   - Each with unique idempotency key
   - All status: "success"

2. **Verify log expiration**:
   ```sql
   SELECT
     operation,
     status,
     created_at,
     expires_at,
     expires_at - NOW() as time_until_expiry
   FROM idempotency_log
   ORDER BY created_at DESC
   LIMIT 10;
   ```

   **Expected**: All logs expire in ~24 hours

---

### Test 4: Error Handling

**Goal**: Verify graceful error handling when Edge Function fails.

**Test 4a: Network Error Simulation**

1. **Temporarily break Edge Function URL**:
   - Edit `src/lib/dual-write.js` line 8
   - Change: `const EDGE_FUNCTION_URL = 'https://invalid-url.com/error'`

2. **Try to save data**:
   - Create new week
   - Click save

3. **Expected Behavior**:
   - ❌ Console shows error
   - ❌ Alert shown to user
   - ❌ Data NOT saved (neither schema)

4. **Restore correct URL**:
   - Revert change to `dual-write.js`

**Test 4b: Invalid Data**

1. **Try to update color without selecting child**:
   - Logout and login
   - Don't select child or date
   - Somehow trigger color update (if possible)

2. **Expected Console Output**:
   ```
   Cannot save: missing selectedChild or weekStartDate
   ```

---

## Success Criteria

### ✅ Day 2 Complete When:
1. [ ] Migration 013 deployed successfully
2. [ ] Test 1: New week creation works (dual-write confirmed)
3. [ ] Test 2: Habit color updates persist (dual-write confirmed)
4. [ ] Test 3: Idempotency logs recorded correctly
5. [ ] Test 4: Error handling works gracefully
6. [ ] Drift validation shows 0% drift
7. [ ] No console errors during normal operation

---

## Troubleshooting

### Error: "relation 'idempotency_log' does not exist"
**Cause**: Migration 013 not deployed
**Fix**: Follow "Step 1: Deploy Migration 013" above

### Error: "Edge Function call failed"
**Cause**: Edge Function not responding or invalid request
**Fix**:
1. Check Edge Function is deployed:
   ```bash
   curl https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit
   ```
2. Verify environment variables in `.env`

### Error: "인증되지 않은 사용자입니다"
**Cause**: User session expired
**Fix**: Logout and login again

### No console output when clicking buttons
**Cause**: Browser console not open
**Fix**: Press F12 to open DevTools console

### Drift validation shows >0% drift
**Cause**: Edge Function not writing to both schemas
**Fix**:
1. Check Edge Function logs in Supabase Dashboard
2. Verify Edge Function code in `supabase/functions/dual-write-habit/index.ts`
3. Re-run backfill if needed

---

## Next Steps After Day 2

### Day 3: Testing & Bug Fixes (3 hours)
- Manual QA testing (10 scenarios)
- Bug fixes and documentation
- Edge case testing

### Day 4: RLS Activation (2 hours)
- Enable Row Level Security on 6 tables
- Verify user isolation
- Performance testing

### Day 5: Final Validation (2 hours)
- Final drift check (target: 0%)
- Completion report
- Documentation updates

---

**Created**: 2025-10-12 (Phase 2 Day 2)
**Status**: Waiting for Migration 013 deployment
**Blocker**: idempotency_log table missing
**Next Action**: Deploy Migration 013 via Supabase Dashboard
