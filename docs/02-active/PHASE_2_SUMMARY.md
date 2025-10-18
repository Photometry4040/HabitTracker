# Phase 2 Summary: Quick Reference Guide

**Full Plan**: See [PHASE_2_PLAN.md](PHASE_2_PLAN.md) for complete details

---

## Overview

**Goal**: Switch web app from old schema (habit_tracker) to new schema (children, weeks, habits, habit_records) + Enable RLS

**Duration**: 5 days (17 hours total)

**Current State** (Phase 2 Day 3 Complete):
- ✅ Edge Function deployed (4 operations)
- ✅ Dual-write API ready (src/lib/dual-write.js)
- ✅ Backfill complete (75% - 18/24 weeks)
- ✅ Web app reads from new schema (database-new.js)
- ✅ Web app writes via Edge Function (dual-write)
- ✅ Optimistic UI + Toggle UX
- ⚠️ RLS policies disabled (Day 4 작업)

**Target State** (Phase 2 Complete):
- ✅ Web app reads from new schema
- ✅ Web app writes via Edge Function (dual-write)
- ✅ RLS enabled on all tables
- ✅ 0% drift between old and new
- ✅ Secure user-based data access

---

## Quick Execution Guide

### Day 1: Read Operations (6 hours)

**Goal**: Switch all read operations from old schema to new schema

**Tasks**:
1. Create `src/lib/database-new.js` (3 functions)
   - `loadWeekDataNew()` - replaces loadChildData()
   - `loadAllChildrenNew()` - replaces loadAllChildren()
   - `loadChildWeeksNew()` - replaces loadChildWeeks()

2. Update `src/App.jsx` imports:
   ```javascript
   // OLD
   import { loadChildData, loadAllChildren, loadChildWeeks } from '@/lib/database.js'

   // NEW
   import { loadWeekDataNew as loadChildData, loadAllChildrenNew as loadAllChildren, loadChildWeeksNew as loadChildWeeks } from '@/lib/database-new.js'
   ```

3. Update `loadWeekData()` function to use `weekStartDate` instead of `weekPeriod`

4. Test:
   - Login → Select child → Load week
   - Check console for "✅ New Schema:" messages
   - Run: `node scripts/test-read-operations.js`

**Success Criteria**:
- ✅ All data loads from new schema
- ✅ No errors
- ✅ UI displays correctly

---

### Day 2: Write Operations (4 hours)

**Goal**: Switch all write operations from direct old schema to Edge Function dual-write

**Tasks**:
1. Update `saveData()` function in App.jsx:
   ```javascript
   // OLD
   await saveChildData(selectedChild, data)

   // NEW
   const result = await createWeekDualWrite(
     selectedChild,
     data.weekStartDate,
     data.habits,
     data.theme,
     data.reflection,
     data.reward
   )
   ```

2. Update `updateHabitColor()` function:
   ```javascript
   // Add after UI update:
   await updateHabitRecordDualWrite(
     selectedChild,
     weekStartDate,
     habit.name,
     dayIndex,
     color
   )
   ```

3. Test:
   - Create new week → Check both schemas have data
   - Click traffic light button → Check both schemas updated
   - Run: `node scripts/validate-zero-drift.js`

**Success Criteria**:
- ✅ Both old and new schema updated
- ✅ No data loss
- ✅ Drift rate approaches 0%

---

### Day 3: Testing & Bug Fixes (3 hours)

**Goal**: Comprehensive manual QA and fix any issues

**Test Scenarios**:
1. Login/Logout
2. Child list loading
3. Week data loading (existing + new)
4. Create week (dual-write)
5. Update habits (traffic lights)
6. Overwrite confirmation
7. Dashboard view
8. Error handling

**Bug Tracking**:
- Document in `PHASE2_BUGS.md`
- Fix immediately
- Re-test after each fix

**Success Criteria**:
- ✅ All test scenarios pass
- ✅ No critical bugs
- ✅ User experience unchanged

---

### Day 4: RLS Activation (2 hours)

**Goal**: Enable RLS policies for secure user-based access

**Tasks**:
1. Run `scripts/phase2-rls-activation-v2.sql` in Supabase Dashboard
   - Enable RLS one table at a time
   - Test after each table
   - Rollback if issues

2. Order of activation:
   - Step 1: children, habit_templates, notifications (direct ownership)
   - Step 2: weeks (indirect via children)
   - Step 3: habits, habit_records (nested ownership)

3. Verify:
   - Run: `node scripts/verify-rls.js`
   - Test in web app (login → load data)
   - Check only own data visible

**Success Criteria**:
- ✅ All 6 tables have RLS enabled
- ✅ Web app still works
- ✅ Users only see their own data

---

### Day 5: Final Validation (2 hours)

**Goal**: Confirm 0% drift and complete documentation

**Tasks**:
1. Final drift check:
   ```bash
   node scripts/final-drift-check.js
   ```
   Expected: 0% drift, no critical issues

2. Create completion report:
   - Copy template from PHASE_2_PLAN.md
   - Fill in actual metrics
   - Document any bugs fixed
   - List lessons learned

3. Update documentation:
   - PHASE_2_COMPLETION_REPORT.md
   - Update CLAUDE.md if needed

**Success Criteria**:
- ✅ Drift rate: 0%
- ✅ All objectives met
- ✅ Documentation complete

---

## Key Code Changes

### 1. App.jsx Imports

```javascript
// BEFORE
import { saveChildData, loadChildData, loadAllChildren, loadChildWeeks, deleteChildData } from '@/lib/database.js'

// AFTER
import { saveChildData, deleteChildData } from '@/lib/database.js' // Keep for fallback
import { loadWeekDataNew as loadChildData, loadAllChildrenNew as loadAllChildren, loadChildWeeksNew as loadChildWeeks } from '@/lib/database-new.js'
import { createWeekDualWrite, updateHabitRecordDualWrite, deleteWeekDualWrite } from '@/lib/dual-write.js'
```

### 2. saveData Function

```javascript
// BEFORE
await saveChildData(selectedChild, data)

// AFTER
const result = await createWeekDualWrite(
  selectedChild,
  data.weekStartDate,
  data.habits,
  data.theme,
  data.reflection,
  data.reward
)
console.log('✅ Dual-Write Success:', result)
```

### 3. updateHabitColor Function

```javascript
// BEFORE (only UI update)
setHabits(prev => prev.map(habit =>
  habit.id === habitId ? { ...habit, times: [...] } : habit
))

// AFTER (UI + database)
setHabits(prev => ...) // Optimistic UI update

await updateHabitRecordDualWrite(
  selectedChild,
  weekStartDate,
  habit.name,
  dayIndex,
  color
)
```

### 4. loadWeekData Function

```javascript
// BEFORE
const data = await loadChildData(childName, weekPeriod)

// AFTER
const data = await loadChildData(childName, weekStartDate) // Note: weekStartDate not weekPeriod
```

---

## Files to Create/Modify

### New Files (Day 1-5)

1. `src/lib/database-new.js` (200 lines)
   - loadWeekDataNew()
   - loadAllChildrenNew()
   - loadChildWeeksNew()

2. `scripts/test-read-operations.js` (100 lines)
   - Automated tests for read operations

3. `scripts/validate-zero-drift.js` (150 lines)
   - Check drift rate between schemas

4. `scripts/verify-rls.js` (80 lines)
   - Verify RLS policies working

5. `scripts/final-drift-check.js` (50 lines)
   - Final validation before completion

6. `scripts/phase2-rls-activation-v2.sql` (300 lines)
   - SQL script to enable RLS

7. `PHASE_2_COMPLETION_REPORT.md`
   - Final report with metrics

8. `PHASE2_BUGS.md` (if needed)
   - Bug tracking during QA

### Modified Files

1. `src/App.jsx` (~50 lines changed)
   - Import statements
   - saveData() function
   - updateHabitColor() function
   - loadWeekData() function
   - useEffect for weekStartDate

2. `src/components/ChildSelector.jsx` (~10 lines changed)
   - Use loadAllChildrenNew()

3. `.gitignore` (if needed)
   - Add PHASE2_BUGS.md if it contains sensitive info

---

## Testing Checklist

### Manual Tests (Day 3)

- [ ] Login/Logout
- [ ] Load children list (8 children)
- [ ] Select child "이은지"
- [ ] Load existing week (2025-07-01)
- [ ] Load non-existent week (should show empty)
- [ ] Create new week (2025-11-03)
- [ ] Add 3 habits
- [ ] Click traffic light buttons
- [ ] Save week (dual-write)
- [ ] Overwrite existing week (confirmation)
- [ ] Refresh page → Data persists
- [ ] Dashboard view
- [ ] Check browser console (no errors)

### Automated Tests

```bash
# Day 1
node scripts/test-read-operations.js

# Day 2
node scripts/validate-zero-drift.js

# Day 4
node scripts/verify-rls.js

# Day 5
node scripts/final-drift-check.js
```

---

## Rollback Plan

### Quick Rollback (if issues)

**Scenario 1: Read Operations Broken**
```javascript
// src/App.jsx - Revert imports
import { loadChildData, loadAllChildren, loadChildWeeks } from '@/lib/database.js'
```
Time: 5 minutes

**Scenario 2: Write Operations Broken**
```javascript
// src/App.jsx - Revert saveData()
await saveChildData(selectedChild, data) // OLD way
```
Time: 10 minutes

**Scenario 3: RLS Blocking Access**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE weeks DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```
Time: 2 minutes

**Complete Rollback**
```bash
# Revert all App.jsx changes
git checkout src/App.jsx

# Disable RLS (SQL above)

# Remove new files
rm src/lib/database-new.js

# Restart app
npm run dev
```
Time: 15 minutes

---

## Success Metrics

### Data Consistency
- **Drift Rate**: 0.00% (target)
- **Old Schema**: 24 records
- **New Schema**: 24 weeks
- **source_version**: Mix of 'migration' (18) and 'dual_write' (6)

### Performance
- **Load Children**: <100ms
- **Load Week**: <200ms
- **Save Week**: <1500ms (Edge Function overhead acceptable)
- **Update Habit**: <1000ms

### Code Quality
- **Lines Changed**: ~350
- **New Files**: 7
- **Test Scripts**: 5
- **Test Coverage**: 10 manual scenarios + 4 automated scripts

---

## Common Issues & Solutions

### Issue 1: "Permission denied" after enabling RLS
**Cause**: Policy query incorrect or user_id mismatch
**Solution**:
- Check policy with: `SELECT * FROM pg_policies WHERE tablename = 'children'`
- Verify user_id: `SELECT user_id FROM children`
- Disable RLS temporarily, fix policy, re-enable

### Issue 2: Drift rate not 0%
**Cause**: Some write operations not using dual-write
**Solution**:
- Check which operations creating drift: `SELECT source_version, COUNT(*) FROM weeks GROUP BY source_version`
- Find missing dual-write calls in App.jsx
- Add dual-write call
- Re-test

### Issue 3: Slow queries after RLS
**Cause**: Missing indexes or inefficient policy query
**Solution**:
- Check query plan: `EXPLAIN ANALYZE SELECT * FROM weeks WHERE ...`
- Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'weeks'`
- Add missing index if needed

### Issue 4: Edge Function timeout
**Cause**: Too much data or slow network
**Solution**:
- Check Supabase logs for errors
- Increase timeout (if possible)
- Optimize Edge Function (batch operations)
- Use database trigger as fallback

---

## Next Steps After Phase 2

### Phase 3: Old Schema Removal (1-2 weeks)

**Goals**:
1. Monitor for 1 week (ensure stability)
2. Stop dual-writes (new schema only)
3. Remove database.js (old code)
4. Drop habit_tracker table
5. Full new schema operation

**Prerequisites**:
- ✅ Phase 2 complete (0% drift)
- ✅ No issues for 1 week
- ✅ All users on new schema
- ✅ Backup created

---

## Resources

### Documentation
- **Full Plan**: [PHASE_2_PLAN.md](PHASE_2_PLAN.md)
- **Phase 1 Report**: [PHASE_1_완료_보고서.md](PHASE_1_완료_보고서.md)
- **Phase 0 Progress**: [PHASE_0_PROGRESS.md](PHASE_0_PROGRESS.md)
- **Tech Spec**: [TECH_SPEC.md](TECH_SPEC.md)
- **Migration Plan**: [DB_MIGRATION_PLAN_V2.md](DB_MIGRATION_PLAN_V2.md)

### Code
- **Edge Function**: `supabase/functions/dual-write-habit/index.ts`
- **Dual-Write API**: `src/lib/dual-write.js`
- **Old Database**: `src/lib/database.js`
- **New Database**: `src/lib/database-new.js` (to be created)

### Scripts
- **Test Scripts**: `scripts/test-*.js`
- **Validation Scripts**: `scripts/validate-*.js`
- **RLS Activation**: `scripts/phase2-rls-activation-v2.sql`

---

## Contact & Support

**Issues**: Document in PHASE2_BUGS.md
**Questions**: Review PHASE_2_PLAN.md for details
**Rollback**: Follow Quick Rollback guide above

---

**Created**: 2025-10-12
**Status**: 📋 Ready to Execute
**Next Action**: Day 1 - Create database-new.js

---

🚀 **Phase 2 Ready! Let's migrate to the new schema!** 🎯
