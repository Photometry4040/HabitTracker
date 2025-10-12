# Migration User Setup Guide

## Problem

The backfill scripts need to insert data into tables with foreign key constraints to `auth.users`. However:
- The old `habit_tracker` table doesn't have `user_id` field (commented out)
- Foreign key constraints require a valid `user_id` from `auth.users`
- The constraint was marked `NOT VALID` but appears to have been validated

## Solutions

### Option 1: Use Existing User (Recommended for Phase 0)

#### Step 1: Check if users exist

Run this query in Supabase SQL Editor:

```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at
LIMIT 5;
```

#### Step 2: Copy a user_id

If users exist, copy any `id` value (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

#### Step 3: Update backfill scripts

Edit both scripts and replace the user_id:

**`scripts/backfill-children-weeks.js`**:
```javascript
// Line ~32
const MIGRATION_USER_ID = 'PASTE_USER_ID_HERE';
```

**`scripts/backfill-habits-records.js`**:
```javascript
// Line ~32
const MIGRATION_USER_ID = 'PASTE_USER_ID_HERE';
```

#### Step 4: Run backfill

```bash
node scripts/backfill-children-weeks.js
node scripts/backfill-habits-records.js
node scripts/verify-backfill.js
```

### Option 2: Create User via Web App

#### Step 1: Start the web app

```bash
npm run dev
```

#### Step 2: Open browser

Navigate to: http://localhost:5173

#### Step 3: Sign up/Login

Create a new account or log in with existing credentials

#### Step 4: Get your user_id

Run this script:
```bash
node scripts/get-user-id.js
```

It will show your user_id. Copy it.

#### Step 5: Update backfill scripts

Same as Option 1, Step 3

### Option 3: Create User via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Copy the generated user ID
5. Update backfill scripts (same as Option 1, Step 3)

### Option 4: Temporarily Drop Foreign Key (Advanced)

**⚠️ Only for development/testing**

#### Step 1: Drop constraint

Run in Supabase SQL Editor:

```sql
ALTER TABLE children
DROP CONSTRAINT IF EXISTS fk_children_user_id;

ALTER TABLE weeks
DROP CONSTRAINT IF EXISTS fk_weeks_user_id;

ALTER TABLE habit_templates
DROP CONSTRAINT IF EXISTS fk_habit_templates_user_id;

ALTER TABLE habit_templates
DROP CONSTRAINT IF EXISTS fk_habit_templates_from_user_id;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS fk_notifications_user_id;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS fk_notifications_from_user_id;
```

#### Step 2: Update scripts to use placeholder

```javascript
const MIGRATION_USER_ID = '00000000-0000-0000-0000-000000000000';
```

#### Step 3: Run backfill

```bash
node scripts/backfill-children-weeks.js
node scripts/backfill-habits-records.js
```

#### Step 4: Re-add constraints (after migration)

```sql
ALTER TABLE children
ADD CONSTRAINT fk_children_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

ALTER TABLE weeks
ADD CONSTRAINT fk_weeks_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE NOT VALID;

-- Repeat for other tables...
```

## Recommended Approach for Phase 0

**Use Option 1** (existing user) or **Option 2** (create via web app)

This is safest and matches production behavior.

## After Migration

Once backfill is complete:

1. ✅ Run verification: `node scripts/verify-backfill.js`
2. ✅ Check data in Supabase Dashboard → Table Editor
3. ✅ Update PHASE_0_PROGRESS.md
4. 🟢 Ready for Phase 0 Day 4

---

**Created**: 2025-10-12
**Status**: Ready to use
**Phase**: 0 (Shadow Schema)
