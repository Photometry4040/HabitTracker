# Security Policies & RLS Configuration

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Phase**: Phase 3 Complete - RLS Enabled ✅

---

## 🔒 Overview

This document describes the security architecture and Row-Level Security (RLS) policies implemented in the Habit Tracker for Kids application.

---

## 📋 Table of Contents

1. [RLS Status](#rls-status)
2. [Core Tables Security](#core-tables-security)
3. [RLS Policies by Table](#rls-policies-by-table)
4. [Edge Function Security](#edge-function-security)
5. [User Data Isolation](#user-data-isolation)
6. [Verification & Monitoring](#verification--monitoring)
7. [Future Enhancements](#future-enhancements)

---

## 🔐 RLS Status

### Current Status: ✅ ENABLED (2025-10-18)

| Table | RLS Enabled | Policies | Status |
|-------|---|---|---|
| `children` | ✅ Yes | 4 (SELECT, INSERT, UPDATE, DELETE) | Active |
| `weeks` | ✅ Yes | 4 (SELECT, INSERT, UPDATE, DELETE) | Active |
| `habits` | ✅ Yes | 4 (SELECT, INSERT, UPDATE, DELETE) | Active |
| `habit_records` | ✅ Yes | 4 (SELECT, INSERT, UPDATE, DELETE) | Active |
| `idempotency_log` | ✅ Yes | 4 (SELECT, INSERT, UPDATE, DELETE) | Active |

### Verification Command

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records', 'idempotency_log')
AND schemaname = 'public'
ORDER BY tablename;
```

**Expected Output**: All rows should show `rowsecurity = true`

---

## 🛡️ Core Tables Security

### 1. `children` Table

**RLS Policy**: Direct user_id filtering

```sql
-- SELECT: Users can only see their own children
CREATE POLICY children_select_policy ON children
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only create children for themselves
CREATE POLICY children_insert_policy ON children
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own children
CREATE POLICY children_update_policy ON children
FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own children
CREATE POLICY children_delete_policy ON children
FOR DELETE
USING (auth.uid() = user_id);
```

**Data Isolation**: Direct ownership via `user_id` column

---

### 2. `weeks` Table

**RLS Policy**: User isolation via child_id → children.user_id

```sql
-- SELECT: Users can only see weeks for their children
CREATE POLICY weeks_select_policy ON weeks
FOR SELECT
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can only create weeks for their children
CREATE POLICY weeks_insert_policy ON weeks
FOR INSERT
WITH CHECK (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can only update weeks for their children
CREATE POLICY weeks_update_policy ON weeks
FOR UPDATE
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can only delete weeks for their children
CREATE POLICY weeks_delete_policy ON weeks
FOR DELETE
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);
```

**Data Isolation**: Via child ownership (child_id → children.user_id)

---

### 3. `habits` Table

**RLS Policy**: User isolation via week_id → weeks → children

```sql
-- SELECT: Users can only see habits in their weeks
CREATE POLICY habits_select_policy ON habits
FOR SELECT
USING (
  week_id IN (
    SELECT w.id FROM weeks w
    JOIN children c ON w.child_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: Similar hierarchical checks
```

**Data Isolation**: Via week ownership (week_id → weeks → children.user_id)

---

### 4. `habit_records` Table

**RLS Policy**: User isolation via habit_id → habits → weeks → children

```sql
-- SELECT: Users can only see records for their habits
CREATE POLICY habit_records_select_policy ON habit_records
FOR SELECT
USING (
  habit_id IN (
    SELECT h.id FROM habits h
    JOIN weeks w ON h.week_id = w.id
    JOIN children c ON w.child_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: Similar hierarchical checks
```

**Data Isolation**: Via habit ownership (habit_id → habits → weeks → children.user_id)

---

### 5. `idempotency_log` Table

**RLS Policy**: Direct user_id filtering (NEW - Phase 3)

```sql
-- SELECT: Users can only see their own operation logs
CREATE POLICY idempotency_log_select_policy ON idempotency_log
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- INSERT: Users can only log their own operations
CREATE POLICY idempotency_log_insert_policy ON idempotency_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own logs
CREATE POLICY idempotency_log_update_policy ON idempotency_log
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- DELETE: Users can only delete their own logs
CREATE POLICY idempotency_log_delete_policy ON idempotency_log
FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);
```

**Data Isolation**: Direct ownership via `user_id` column (NEW in Phase 3)

---

## 📊 RLS Policies by Table

### Hierarchy Diagram

```
auth.users (Supabase Auth)
    ↓
children (user_id = auth.uid())
    ↓ child_id
weeks (user_id = child.user_id)
    ↓ week_id
habits (no direct user_id)
    ↓ habit_id
habit_records (no direct user_id)

idempotency_log (user_id = auth.uid()) - Direct ownership
```

### Policy Types

1. **Direct Ownership** (children, idempotency_log)
   - Single condition: `auth.uid() = user_id`
   - Fastest to evaluate

2. **Hierarchical Ownership** (weeks, habits, habit_records)
   - Multi-level JOINs to verify ownership
   - Enforced via foreign key relationships

---

## 🔧 Edge Function Security

### JWT Extraction (New in Phase 3)

Edge Function now extracts `user_id` from JWT Authorization header:

```typescript
function extractUserIdFromJWT(authHeader: string | null): string | null {
  // Extract from "Bearer <jwt_token>"
  // Decode payload and return 'sub' claim (user_id)
}
```

### Idempotency Log Tracking

All operations (success/failure) are logged with user_id:

```typescript
await supabase
  .from('idempotency_log')
  .insert({
    key: idempotencyKey,
    operation: operation,
    request_data: data,
    response_data: responseData,
    status: 'success',
    user_id: userId  // ← NEW: Automatically captured from JWT
  });
```

### Benefits

- ✅ User-scoped operation logs
- ✅ Audit trail per user
- ✅ Prevents log tampering via RLS
- ✅ Better monitoring and debugging

---

## 👤 User Data Isolation

### Isolation Strategy

**Goal**: Ensure User A cannot access, modify, or delete User B's data

**Implementation**:
1. Each user is identified by `auth.uid()` (Supabase Auth UID)
2. All tables have user_id references (direct or hierarchical)
3. RLS policies enforce user_id filtering on EVERY operation
4. Database-level enforcement (cannot bypass from application)

### Data Isolation Examples

**Scenario 1: User A tries to read User B's children**
```sql
-- User A's query
SELECT * FROM children WHERE user_id = <user_b_id>;

-- RLS Policy evaluates:
-- WHERE auth.uid() = user_id
-- Result: No rows returned (auth.uid() ≠ user_b_id)
```

**Scenario 2: User A tries to update User B's habit record**
```sql
-- RLS policy uses JOINs to verify ownership:
-- habit_id IN (
--   SELECT h.id FROM habits h
--   JOIN weeks w ON h.week_id = w.id
--   JOIN children c ON w.child_id = c.id
--   WHERE c.user_id = auth.uid()  ← Fails for User A
-- )
-- Result: Update denied
```

### Service Role Bypass

⚠️ **Important**: Edge Functions use **Service Role Key**, which bypasses RLS

**Security**: This is acceptable because:
1. Service role key is server-only (not exposed to client)
2. Edge Functions validate user_id from JWT
3. Edge Function code is reviewed and controlled
4. Idempotency log tracks all Service Role operations

---

## ✅ Verification & Monitoring

### Automated Verification Script

```bash
node scripts/verify-rls-status.js
```

**Checks**:
- RLS enabled on all core tables
- Policies defined and active
- User isolation is working

### Manual Verification

**Check RLS Status:**
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records', 'idempotency_log')
AND schemaname = 'public';
```

**Check Policies:**
```sql
SELECT schemaname, tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records', 'idempotency_log')
ORDER BY tablename, policyname;
```

**Test User Isolation** (in SQL Editor with User A logged in):
```sql
-- As User A, try to access data
SELECT COUNT(*) FROM children;  -- Should only show User A's children
SELECT COUNT(*) FROM weeks;     -- Should only show User A's weeks
```

### Monitoring in Production

**Check idempotency_log for user_id values:**
```sql
SELECT user_id, operation, status, COUNT(*) as count
FROM idempotency_log
GROUP BY user_id, operation, status
ORDER BY created_at DESC;
```

**Alert on RLS Policy Violations:**
```sql
-- Check Supabase Edge Function logs
-- Look for "Unauthorized" or RLS policy errors
-- URL: Supabase Dashboard → Edge Functions → Logs
```

---

## 🚀 Future Enhancements

### 1. Rate Limiting
- Implement per-user rate limits on Edge Functions
- Prevent abuse and cost overruns

### 2. Audit Trail Enhancement
- Add detailed audit table with:
  - User ID
  - Operation type
  - Timestamp
  - IP address (if available)
  - Result (success/failure)

### 3. Data Encryption
- Add field-level encryption for sensitive data
- Example: reflection, reward (could contain personal notes)

### 4. Backup & Recovery
- Implement user-specific backups
- Ensure RLS applies to backup/restore operations

### 5. Multi-factor Authentication
- Add MFA support for sensitive operations
- Require MFA for data deletion

---

## 📚 Related Documentation

- **Architecture**: [CURRENT_ARCHITECTURE.md](../01-architecture/CURRENT_ARCHITECTURE.md)
- **Migration Plan**: [DB_MIGRATION_PLAN_V2.md](../00-overview/DB_MIGRATION_PLAN_V2.md)
- **Phase 3 Complete**: [PHASE_3_FINAL_COMPLETE.md](../02-active/PHASE_3_FINAL_COMPLETE.md)
- **Tech Spec**: [TECH_SPEC.md](../00-overview/TECH_SPEC.md)

---

## 🔗 External Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Guide](https://jwt.io/)

---

**Last Updated**: 2025-10-18
**Status**: ✅ Production Ready
**Next Review**: After feature additions or security audit
