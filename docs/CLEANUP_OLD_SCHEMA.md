# OLD SCHEMA Cleanup Guide

**Date**: 2025-10-26
**Status**: ✅ Ready to Execute
**Monitoring Period**: 2025-10-18 ~ 2025-10-25 (Completed)

## Overview

This document guides the safe removal of the `habit_tracker_old` table after successful Phase 3 migration and monitoring period.

## Background

- **Phase 3 Completion**: 2025-10-18
- **Table Renamed**: `habit_tracker` → `habit_tracker_old`
- **Monitoring Period**: 1 week (completed 2025-10-25)
- **Backup Created**: `backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json` (70.62 KB, 34 records)
- **NEW SCHEMA Status**: Fully operational, 100% of app using NEW SCHEMA

## Pre-Cleanup Checklist

Before running cleanup, verify:

- [x] Monitoring period completed (after 2025-10-25)
- [x] No unexpected changes detected in `habit_tracker_old`
- [x] Backup file exists and is valid
- [x] NEW SCHEMA tables fully operational
- [x] All write operations use Edge Function (NEW SCHEMA only)
- [x] All read operations use `database-new.js` (NEW SCHEMA only)

## Cleanup Steps

### Step 1: Run Migration

Execute the cleanup migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor:
# Copy contents of: supabase/migrations/20251026_drop_old_schema.sql
```

### Step 2: Verify Cleanup

Run verification script:

```bash
node scripts/verify-old-schema-cleanup.js
```

**Expected Output:**
```
✅ ALL TESTS PASSED - OLD SCHEMA cleanup verified!

Summary:
  - habit_tracker_old table: DROPPED ✅
  - v_old_schema_status view: DROPPED ✅
  - NEW SCHEMA tables: OPERATIONAL ✅
  - Backup file: EXISTS ✅
```

### Step 3: Update Documentation

Update references in:

1. **CLAUDE.md**
   - Remove OLD SCHEMA monitoring notes
   - Update "Archived Tables" section
   - Update project status

2. **README.md**
   - Remove OLD SCHEMA references if any

3. **docs/02-active/**
   - Mark Phase 3 as fully complete
   - Archive cleanup documentation

## What Gets Removed

### Database Objects
- `habit_tracker_old` table (34 records)
- `v_old_schema_status` view

### Documentation Updates
- OLD SCHEMA monitoring notes
- Migration drift references
- Temporary dual-write mode documentation

## Rollback Procedure

If issues arise, restore from backup:

### Option 1: Quick Restore (Table Only)

```sql
-- Re-create table from backup
CREATE TABLE habit_tracker_old (
  -- ... (copy structure from backup metadata)
);

-- Import data using restore script
-- node scripts/restore-old-schema.js
```

### Option 2: Full Migration Rollback

```bash
# Revert migration (if using Supabase migrations system)
supabase db reset

# Re-apply migrations up to 014_rename_old_schema.sql
```

## Verification Queries

### Check OLD SCHEMA is Gone
```sql
-- Should return error: relation "habit_tracker_old" does not exist
SELECT * FROM habit_tracker_old LIMIT 1;
```

### Check NEW SCHEMA is Healthy
```sql
-- Should return counts > 0
SELECT
  (SELECT COUNT(*) FROM children) as children_count,
  (SELECT COUNT(*) FROM weeks) as weeks_count,
  (SELECT COUNT(*) FROM habits) as habits_count,
  (SELECT COUNT(*) FROM habit_records) as records_count;
```

## Post-Cleanup Actions

After successful cleanup:

1. **Archive Migration Files**
   ```bash
   mkdir -p supabase/migrations/_archive_old
   mv supabase/migrations/014_rename_old_schema.sql supabase/migrations/_archive_old/
   ```

2. **Update CLAUDE.md**
   - Remove "Monitoring Period" section
   - Update "Archived Tables" to reflect deletion
   - Update project status

3. **Update Project Status**
   - Mark Phase 3 as 100% complete
   - Remove OLD SCHEMA references from active docs
   - Archive drift analysis scripts

4. **Clean Up Scripts**
   ```bash
   # Move old verification scripts to archive
   mkdir -p scripts/_archive
   mv scripts/analyze-drift-details.js scripts/_archive/
   mv scripts/verify-table-rename.js scripts/_archive/
   ```

## Recovery Information

**Backup Details:**
- File: `backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json`
- Size: 70.62 KB
- Records: 34
- Children: 6 unique children
- Date Range: Earliest to latest week data

**Backup Contents:**
- All habit tracking data from OLD SCHEMA
- Weekly periods, habits, and daily records
- Child information and metadata

## Support

If you encounter issues:

1. Check Supabase logs for errors
2. Verify NEW SCHEMA is operational
3. Review backup file integrity
4. Check Phase 3 documentation: `docs/02-active/PHASE_3_FINAL_COMPLETE.md`
5. Contact: Create GitHub issue with error details

## Timeline

- **2025-10-18**: Phase 3 completed, OLD SCHEMA renamed
- **2025-10-18**: Backup created, monitoring started
- **2025-10-25**: Monitoring period completed
- **2025-10-26**: Cleanup migration created
- **2025-10-26**: Ready to execute cleanup

---

**Status**: ✅ Ready to Execute
**Risk Level**: Low (backup verified, NEW SCHEMA tested)
**Estimated Duration**: 5 minutes
**Reversible**: Yes (via backup restore)
