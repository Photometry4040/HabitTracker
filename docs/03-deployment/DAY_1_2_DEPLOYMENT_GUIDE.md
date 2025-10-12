# Day 1 & 2 Deployment Guide - Data Loading Fix

## 🚨 Current Issue

Your web app at http://localhost:5173/ cannot load Supabase records because:
1. ❌ All 24 habit_tracker records have NULL user_id
2. ❌ Migration 013 (idempotency_log table) not deployed

## ✅ Quick Fix (5 Steps)

### Step 1: Deploy Migration 013

**What**: Create idempotency_log table for dual-write tracking

**Action**:
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/editor)
2. Open file: `supabase/migrations/013_create_dual_write_triggers.sql`
3. Copy entire contents (all ~400 lines)
4. Paste into SQL Editor
5. Click "Run"
6. ✅ Verify: "Success. No rows returned"

**Why**: Edge Function needs this table to prevent duplicate operations

---

### Step 2: Get Your User ID

**Option A: From Running Web App**
```bash
# 1. Open http://localhost:5173/
# 2. Login with your email/password
# 3. Open browser console (F12)
# 4. Paste this code:
const { data: { user } } = await window.supabase.auth.getUser();
console.log('User ID:', user.id);
# 5. Copy the User ID shown
```

**Option B: From Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/auth/users
2. Find your user in the list
3. Click to see full UUID
4. Copy the User ID

**Option C: Create New User**
```bash
# 1. Open http://localhost:5173/
# 2. Click "회원가입" (Sign up)
# 3. Email: test@example.com
# 4. Password: testpassword123
# 5. After signup, use Option A to get User ID
```

**Helper Script** (optional):
```bash
node scripts/get-user-id.js
```

---

### Step 3: Update Existing Records

**Action**: Add your user_id to all 24 existing records

```bash
# Replace YOUR_USER_ID with the UUID from Step 2
node scripts/add-user-id-to-existing-data.js YOUR_USER_ID
```

**Example**:
```bash
node scripts/add-user-id-to-existing-data.js fc24adf2-a7af-4fbf-abe0-c332bb48b02b
```

**Expected Output**:
```
🔧 Adding user_id to existing habit_tracker records

User ID: fc24adf2-a7af-4fbf-abe0-c332bb48b02b

Found 24 records without user_id

Sample records to update:
  1. 아이 1 - 2024년 7월 21일 ~ 2024년 7월 27일
  2. 아이 2 - 2024년 7월 21일 ~ 2024년 7월 27일
  ...

⏳ Updating records...

✅ Successfully updated 24 records

📊 Verification:
  Records without user_id: 0
  Records updated: 24

✅ All records now have user_id!
```

---

### Step 4: Verify Fix

**Action**: Confirm all records now have user_id

```bash
node scripts/check-database-status.js
```

**Look for**:
```
📊 Checking OLD SCHEMA (habit_tracker)...

  Total records: 24
  Sample records: 5

  Record 1:
    ID: ...
    Child: 아이 1
    Week: 2024년 7월 21일 ~ 2024년 7월 27일
    Has user_id: YES (fc24adf2-...)  ← Should say YES now
    Habits: 12

  Record 2:
    Has user_id: YES (fc24adf2-...)  ← All should say YES
```

✅ **Success**: All records show "Has user_id: YES"
❌ **Failed**: Still shows "Has user_id: NO" → Rerun Step 3

---

### Step 5: Test Web App

**Action**: Verify data loads in web app

1. **Refresh browser**: http://localhost:5173/
2. **Login**: Use SAME user from Step 2
   - Email: (your email from Step 2)
   - Password: (your password)
3. **Check data**: You should now see:
   - Child selector showing your children
   - Habit tracking data for selected child
   - Week selector with available weeks

✅ **Success**: Data loads and displays correctly
❌ **Failed**: Still no data → See Troubleshooting below

---

## 🔧 Troubleshooting

### Issue: "No records found" after fix

**Possible Causes**:
1. Logged in with different user than Step 2
2. Browser cache not cleared
3. user_id checks still commented out in code

**Solutions**:

**Check 1: Verify same user**
```bash
# In browser console (F12):
const { data: { user } } = await window.supabase.auth.getUser();
console.log('Current user:', user.id);
# Should match the user_id you used in Step 3
```

**Check 2: Hard refresh**
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R (Mac)

**Check 3: Verify user_id in database**
```bash
node scripts/check-database-status.js
```
Confirm all records show "Has user_id: YES (YOUR_ID)"

---

### Issue: Migration 013 fails to deploy

**Error**: "relation 'idempotency_log' already exists"
**Solution**: Table already created, safe to ignore. Continue to Step 2.

**Error**: "permission denied"
**Solution**: 
1. Verify you're logged into Supabase with owner/admin access
2. Check project URL is correct: gqvyzqodyspvwlwfjmfg

**Error**: "syntax error at or near..."
**Solution**:
1. Make sure you copied the ENTIRE file (including comments)
2. Check for any extra characters at start/end
3. Re-copy and try again

---

### Issue: Script error "Cannot read .env file"

**Solution**:
```bash
# 1. Verify .env exists
ls -la .env

# 2. Check .env has required variables
cat .env | grep VITE_SUPABASE

# Should show:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

If missing, create .env from template:
```bash
cp .env.example .env
# Then edit .env with your Supabase credentials
```

---

### Issue: "Records updated: 0"

**Cause**: All records already have user_id

**Verify**:
```bash
node scripts/check-database-status.js
```

If all show "Has user_id: YES", your data is already fixed.

**Next**: Try logging into web app with the user that owns the data.

---

## 📊 Verification Checklist

Before considering fix complete, verify:

- [ ] Migration 013 deployed successfully
- [ ] User ID obtained from Step 2
- [ ] Script updated 24 records (or 0 if already updated)
- [ ] check-database-status.js shows all "Has user_id: YES"
- [ ] Web app loads and displays habit tracking data
- [ ] Can select different children and weeks

---

## 🎯 After Successful Fix

### What's Fixed:
✅ All 24 habit_tracker records now have user_id
✅ idempotency_log table created for Edge Function
✅ Web app can query and display user's data
✅ Authentication flow working correctly

### Next Phase: Edge Function Deployment

Once data loads correctly in web app, proceed to:

**Phase 1 Day 2: Deploy Edge Function**

```bash
# 1. Deploy dual-write Edge Function
npx supabase functions deploy dual-write-habit

# 2. Test Edge Function
node scripts/test-edge-function.js

# 3. Verify dual-write works
# (Test will create, update, delete records in both schemas)
```

See: `supabase/functions/DEPLOYMENT.md` for details

---

## 📝 Summary

**What We Fixed**:
- Missing user_id in existing habit_tracker records (blocking data retrieval)
- Missing idempotency_log table (needed for Edge Function)

**How We Fixed It**:
1. Deployed Migration 013 (SQL in Supabase Dashboard)
2. Obtained user UUID from web app or dashboard
3. Ran update script to add user_id to 24 records
4. Verified all records now associated with user
5. Confirmed web app can load data after login

**Why This Matters**:
- App uses Row Level Security (RLS) with user authentication
- Queries filter by user_id to show only user's data
- Without user_id, records are invisible to authenticated queries
- This is required before testing Phase 1 dual-write functionality

---

**Status**: Ready to deploy
**Next**: Follow Step 1 above
**Time**: ~10 minutes to complete all steps
**Created**: 2025-10-12
