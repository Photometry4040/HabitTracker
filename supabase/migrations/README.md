# Database Migrations - Phase 0

## Overview

This directory contains the SQL migration scripts for Phase 0 of the Habit Tracker database re-architecture. These scripts implement the **Strangler Fig Pattern** for a zero-downtime migration from the monolithic `habit_tracker` table to a normalized schema.

## Migration Strategy

**Phase 0 Goal**: Create a "shadow schema" alongside the existing database without affecting production.

- ✅ Zero downtime
- ✅ No data loss risk
- ✅ Fully reversible
- ✅ Comprehensive validation

## Files in This Directory

### 001_create_children_table.sql
**Main migration script** that creates the `children` table with:
- All required columns (id, user_id, name, timestamps, source_version)
- Primary key and foreign key constraints (with `NOT VALID` flag)
- Check constraints for data validation
- Unique constraint on (user_id, name)
- Trigger for automatic `updated_at` timestamp
- RLS policies (created but not enabled)
- Inline verification checks

**Execution Time**: ~100ms (instant, no locks)

### 001_create_children_indexes_concurrent.sql
**Index creation script** that must be run separately because `CREATE INDEX CONCURRENTLY` cannot run inside a transaction:
- idx_children_user_id (critical for RLS performance)
- idx_children_name (for search/autocomplete)
- idx_children_user_name (composite, supports unique constraint)
- idx_children_source_version (partial index for migration tracking)
- idx_children_created_at (for sorting by date)

**Execution Time**: ~1-5 seconds per index (depending on data size)

### 001_validate_children_table.sql
**Comprehensive validation script** with 12 test suites:
1. Table existence
2. Column structure (6 columns)
3. Data types validation
4. Primary key verification
5. Foreign key constraints
6. Check constraints
7. Unique constraints
8. Index verification
9. Trigger verification
10. RLS policies (4 policies)
11. RLS status (should be disabled)
12. Default values testing

**Execution Time**: ~500ms

## How to Execute

### Option 1: Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd "/Users/jueunlee/project/Habit Tracker Template for Kids with Visual Goals"

# Run the main migration
npx supabase db push

# Or manually apply specific migration
npx supabase db execute -f supabase/migrations/001_create_children_table.sql

# Run concurrent indexes (one at a time in Supabase Dashboard)
# Or via psql:
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/001_create_children_indexes_concurrent.sql

# Validate the migration
npx supabase db execute -f supabase/migrations/001_validate_children_table.sql
```

### Option 2: Supabase Dashboard

1. **Go to SQL Editor** in your Supabase project
2. **Run 001_create_children_table.sql**
   - Copy and paste the entire content
   - Click "Run"
   - Verify success message
3. **Run indexes CONCURRENTLY** (one at a time)
   - Open `001_create_children_indexes_concurrent.sql`
   - Copy each `CREATE INDEX CONCURRENTLY` statement
   - Run individually (cannot run all at once)
4. **Run validation script**
   - Copy `001_validate_children_table.sql`
   - Run and check for ✓ marks

### Option 3: Direct psql Connection

```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"

# Run main migration
psql $DATABASE_URL -f supabase/migrations/001_create_children_table.sql

# Run concurrent indexes
psql $DATABASE_URL -f supabase/migrations/001_create_children_indexes_concurrent.sql

# Validate
psql $DATABASE_URL -f supabase/migrations/001_validate_children_table.sql
```

## Expected Output

### Successful Migration Output

```
✓ Table "children" created successfully
✓ All 6 columns present
✓ Constraints created
✓ Indexes created
✓ All 4 RLS policies created
✓ RLS is DISABLED (as expected for Phase 0)
✓ Trigger for updated_at created successfully
=== VERIFICATION COMPLETE ===
```

### Validation Output

```
========================================
VALIDATION SUMMARY
========================================
Table Structure:     ✓ OK
Columns:             ✓ OK
Constraints:         ✓ OK
Indexes:             ✓ OK
Triggers:            ✓ OK
RLS Policies:        ✓ OK

Overall Score: 6/6
✓✓✓ EXCELLENT: All validations passed!
========================================
```

## Troubleshooting

### Issue: Foreign Key Violation

**Symptom**: Error when inserting test data
```
ERROR: foreign_key_violation
```

**Solution**: This is **EXPECTED** in Phase 0 because the foreign key is created with `NOT VALID`. The constraint will be validated after backfill in Phase 2. No action needed.

### Issue: Index Creation Fails

**Symptom**: `CREATE INDEX CONCURRENTLY` fails
```
ERROR: deadlock detected
```

**Solution**:
1. Ensure no long-running transactions are active
2. Run each index creation separately
3. Retry failed indexes individually

### Issue: Permission Denied

**Symptom**: Cannot create table
```
ERROR: permission denied for schema public
```

**Solution**: Use a database superuser or service role key:
```bash
# Set service role key in environment
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Issue: Indexes Not Created

**Symptom**: Validation shows "⚠ PARTIAL" for indexes

**Solution**: Indexes marked as `IF NOT EXISTS` were skipped. This means they might already exist, or the CONCURRENTLY script wasn't run yet. Run:
```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'children';

-- If missing, run the concurrent index script
```

## Rollback Procedure

If you need to completely remove the `children` table:

```sql
BEGIN;

-- Drop all dependent objects
DROP TRIGGER IF EXISTS trigger_children_updated_at ON children;
DROP FUNCTION IF EXISTS update_children_updated_at();

-- Drop indexes (use CONCURRENTLY to avoid locks)
DROP INDEX CONCURRENTLY IF EXISTS idx_children_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_children_name;
DROP INDEX CONCURRENTLY IF EXISTS idx_children_user_name;
DROP INDEX CONCURRENTLY IF EXISTS idx_children_source_version;
DROP INDEX CONCURRENTLY IF EXISTS idx_children_created_at;

-- Drop the table (CASCADE drops RLS policies)
DROP TABLE IF EXISTS children CASCADE;

COMMIT;
```

**⚠️ WARNING**: `CASCADE` will also drop dependent tables (weeks, habits, etc.) once they're created. In Phase 0, this is safe.

## Schema Diagram

```
┌─────────────────────────────────────────┐
│           children                      │
├─────────────────────────────────────────┤
│ PK │ id              UUID               │
│ FK │ user_id         UUID  → auth.users│
│    │ name            TEXT               │
│    │ created_at      TIMESTAMPTZ        │
│    │ updated_at      TIMESTAMPTZ        │
│    │ source_version  TEXT               │
└─────────────────────────────────────────┘
         │
         │ Indexes:
         ├─ idx_children_user_id (user_id)
         ├─ idx_children_name (name)
         ├─ idx_children_user_name (user_id, name)
         ├─ idx_children_source_version (source_version) [WHERE NOT NULL]
         └─ idx_children_created_at (created_at DESC)

         │ Constraints:
         ├─ PK: children_pkey (id)
         ├─ FK: fk_children_user_id → auth.users(id) [NOT VALID]
         ├─ CHECK: check_children_name_length (1 <= length <= 100) [NOT VALID]
         ├─ CHECK: check_children_source_version (IN enum) [NOT VALID]
         └─ UNIQUE: unique_children_user_name (user_id, name)

         │ RLS Policies (NOT ENABLED):
         ├─ policy_children_select: auth.uid() = user_id
         ├─ policy_children_insert: auth.uid() = user_id
         ├─ policy_children_update: auth.uid() = user_id
         └─ policy_children_delete: auth.uid() = user_id

         │ Triggers:
         └─ trigger_children_updated_at → update_children_updated_at()
```

## Next Steps

After successfully running these migrations:

1. ✅ **Verify**: Run validation script and confirm all tests pass
2. ✅ **Document**: Record any issues or deviations in Phase 0 retrospective
3. ⏭️ **Continue**: Proceed to create remaining tables (weeks, habits, etc.)
4. ⏭️ **Backfill**: Run backfill script to populate children from habit_tracker
5. ⏭️ **Monitor**: Set up drift detection to ensure data consistency

## Migration Tracking

| Migration | Status | Date | Notes |
|-----------|--------|------|-------|
| 001_create_children_table.sql | ✅ Complete | 2025-10-12 | Initial creation with NOT VALID constraints |
| 001_create_children_indexes_concurrent.sql | ⏳ Pending | - | Run separately with CONCURRENTLY |
| 001_validate_children_table.sql | ⏳ Pending | - | Validation test suite |

## Related Documentation

- [DB_MIGRATION_PLAN_V2.md](../../DB_MIGRATION_PLAN_V2.md) - Complete migration strategy
- [PHASE_0_TODO.md](../../PHASE_0_TODO.md) - Detailed Phase 0 task breakdown
- [TECH_SPEC.md](../../TECH_SPEC.md) - Technical specifications

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review validation output for specific errors
3. Consult DB_MIGRATION_PLAN_V2.md rollback procedures
4. Open an issue with migration logs and error messages

---

**Author**: DB Architect (Perfectionist Mode)
**Version**: 1.0
**Last Updated**: 2025-10-12
**Phase**: 0 (Shadow Schema Creation)
