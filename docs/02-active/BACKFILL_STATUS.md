# Backfill Scripts Status - Phase 0 Day 3

## ✅ What's Complete

### Scripts Created
1. ✅ **backfill-children-weeks.js** - Migrates children and weeks data from habit_tracker
2. ✅ **backfill-habits-records.js** - Migrates habits and habit_records from JSONB to normalized tables
3. ✅ **verify-backfill.js** - Verifies data integrity after migration
4. ✅ **get-user-id.js** - Helper to get user_id for migration

### Documentation Created
- ✅ **MIGRATION_USER_SETUP.md** - Complete guide for user_id setup
- ✅ **BACKFILL_STATUS.md** - This file (current status)

### Issues Resolved
1. ✅ Fixed `user_id` field not existing in `habit_tracker` table
2. ✅ Fixed UPSERT conflicts with DEFERRABLE constraints
3. ✅ Implemented check-and-insert pattern to avoid conflicts
4. ✅ Added flexible user_id input (env var or command line)

## ⚠️ Current Blocker

**Foreign Key Constraint Issue:**
- Tables require valid `user_id` from `auth.users` table
- The constraint `fk_children_user_id` is enforced despite `NOT VALID` flag
- Need a real user_id from `auth.users` to run migration

## 🚀 Next Steps - Choose One Option

### Option A: Use Supabase Dashboard (Fastest)

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg)
2. Go to **Authentication → Users**
3. If users exist:
   - Copy any user ID
   - Run: `node scripts/backfill-children-weeks.js PASTE-USER-ID-HERE`
4. If no users exist:
   - Click "Add user" → "Create new user"
   - Enter email: `migration@test.com`, password: anything
   - Copy the generated user ID
   - Run: `node scripts/backfill-children-weeks.js PASTE-USER-ID-HERE`

### Option B: Use Web App (More Realistic)

1. Ensure web app is running (already started on port 5173)
2. Open: http://localhost:5173
3. Log in or sign up with any credentials
4. After login, run: `node scripts/get-user-id.js`
5. Copy the displayed user_id
6. Run: `node scripts/backfill-children-weeks.js PASTE-USER-ID-HERE`

### Option C: Drop Foreign Key Temporarily (Advanced)

**⚠️ Only if you're comfortable with SQL**

See [MIGRATION_USER_SETUP.md](MIGRATION_USER_SETUP.md) - Option 4

## 📋 Full Migration Command Sequence

Once you have a user_id:

```bash
# Set user_id (replace with actual value)
export MIGRATION_USER_ID="your-user-id-from-auth-users"

# Run backfill scripts in order
node scripts/backfill-children-weeks.js $MIGRATION_USER_ID
node scripts/backfill-habits-records.js  # Will auto-use same user_id
node scripts/verify-backfill.js

# Check results
echo "✅ Migration complete! Check output above for summary."
```

## 📊 Expected Results

After successful migration:

**Children table:**
- ~6 unique children from habit_tracker
- All with same user_id (migration user)
- source_version = 'migration'

**Weeks table:**
- ~24 week records
- Linked to children via child_id
- week_end_date auto-calculated (start + 6 days)
- source_version = 'migration'

**Habits table:**
- ~120 individual habits (5 per week × 24 weeks)
- Linked to weeks via week_id
- source_version = 'migration'

**Habit_records table:**
- ~840 daily records (7 days × 120 habits, minus empty days)
- status: green/yellow/red/none
- source_version = 'migration'

## 🐛 Troubleshooting

### Error: "violates foreign key constraint"
**Fix**: Provide a valid user_id from auth.users (see Next Steps above)

### Error: "table habit_tracker does not exist"
**Fix**: This is expected if you have no old data. Migration will exit gracefully.

### Error: "already exists" or duplicate key
**Fix**: Scripts now check for existing data before inserting. Re-run is safe.

### No data migrated (0 inserted)
**Cause**: Backfill scripts filter out existing data
**Fix**: Check if data was already migrated. Run verify script to confirm.

## 📖 Related Documentation

- **[PHASE_0_TODO.md](PHASE_0_TODO.md)** - Overall Phase 0 plan
- **[PHASE_0_PROGRESS.md](PHASE_0_PROGRESS.md)** - Daily progress tracking
- **[MIGRATION_USER_SETUP.md](MIGRATION_USER_SETUP.md)** - Detailed user_id setup guide
- **[MANUAL_DEPLOYMENT_REQUIRED.md](MANUAL_DEPLOYMENT_REQUIRED.md)** - Schema deployment guide

## ✅ After Migration Success

1. Update [PHASE_0_PROGRESS.md](PHASE_0_PROGRESS.md):
   - Mark Day 3 as 100% complete
   - Add verification results
2. Proceed to **Day 4: Constraint Validation**
3. Continue with Phase 0 plan

---

**Status**: 🟡 Blocked - Waiting for user_id
**Last Updated**: 2025-10-12
**Next Action**: Choose Option A or B above and provide user_id
