# Children Table Architecture Diagram

## Table Structure

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                      CHILDREN TABLE                         ┃
┃                   (Phase 0 Shadow Schema)                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────┬──────────────┬──────────┬─────────────────┐
│ Column Name     │ Type         │ Nullable │ Default         │
├─────────────────┼──────────────┼──────────┼─────────────────┤
│ id              │ UUID         │ NOT NULL │ gen_random_uuid()│ ← PRIMARY KEY
│ user_id         │ UUID         │ NOT NULL │ -               │ ← FOREIGN KEY → auth.users(id)
│ name            │ TEXT         │ NOT NULL │ -               │
│ created_at      │ TIMESTAMPTZ  │ NOT NULL │ NOW()           │
│ updated_at      │ TIMESTAMPTZ  │ NOT NULL │ NOW()           │ ← Auto-updated by trigger
│ source_version  │ TEXT         │ NULLABLE │ 'new_schema'    │ ← Migration tracking
└─────────────────┴──────────────┴──────────┴─────────────────┘
```

## Constraints Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CONSTRAINTS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRIMARY KEY                                                 │
│  ┌────────────────────────────────────────┐                 │
│  │ children_pkey                           │                 │
│  │ ON (id)                                 │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  FOREIGN KEY (NOT VALID ⚡)                                  │
│  ┌────────────────────────────────────────┐                 │
│  │ fk_children_user_id                     │                 │
│  │ (user_id) → auth.users(id)             │                 │
│  │ ON DELETE CASCADE                       │                 │
│  │ [NOT VALID - Fast creation]             │                 │
│  └────────────────────────────────────────┘                 │
│           │                                                  │
│           └──→ Will validate in Phase 2                     │
│                                                              │
│  CHECK CONSTRAINTS (NOT VALID ⚡)                            │
│  ┌────────────────────────────────────────┐                 │
│  │ check_children_name_length              │                 │
│  │ CHECK: length(name) BETWEEN 1 AND 100  │                 │
│  │ [NOT VALID]                             │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ check_children_source_version           │                 │
│  │ CHECK: source_version IN (...)         │                 │
│  │ [NOT VALID]                             │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  UNIQUE CONSTRAINT (DEFERRABLE)                             │
│  ┌────────────────────────────────────────┐                 │
│  │ unique_children_user_name               │                 │
│  │ UNIQUE (user_id, name)                 │                 │
│  │ DEFERRABLE INITIALLY DEFERRED           │                 │
│  └────────────────────────────────────────┘                 │
│           │                                                  │
│           └──→ Allows bulk operations                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Index Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INDEX STRATEGY                            │
│              (All created CONCURRENTLY)                      │
└─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ idx_children_user_id                     │  ← CRITICAL for RLS
   │ B-tree on (user_id)                     │
   │ Use: WHERE user_id = $1                 │
   │ Impact: 🔥🔥🔥 (RLS policy lookups)     │
   └─────────────────────────────────────────┘
              │
              ├─────────────────────────────────┐
              │                                 │
   ┌──────────▼──────────┐         ┌──────────▼──────────┐
   │ idx_children_name    │         │ idx_children_user_name│
   │ B-tree on (name)     │         │ Composite (user_id,  │
   │ Use: Search/LIKE     │         │         name)        │
   │ Impact: 🔥🔥         │         │ Use: Unique lookups  │
   └──────────────────────┘         │ Impact: 🔥🔥🔥       │
                                    └──────────────────────┘
              │
              ├─────────────────────────────────┐
              │                                 │
   ┌──────────▼──────────┐         ┌──────────▼────────────┐
   │idx_children_source_  │         │idx_children_created_at│
   │       version        │         │ B-tree DESC           │
   │ Partial WHERE ≠ NULL │         │ Use: ORDER BY DESC   │
   │ Use: Migration stats │         │ Impact: 🔥           │
   │ Impact: 🔥           │         └──────────────────────┘
   └──────────────────────┘
```

## Trigger Mechanism

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER FLOW                              │
└─────────────────────────────────────────────────────────────┘

  UPDATE children SET name = 'New Name' WHERE id = $1
           │
           ▼
  ┌────────────────────────────────────┐
  │ BEFORE UPDATE Trigger              │
  │ trigger_children_updated_at        │
  └────────────────────────────────────┘
           │
           ▼
  ┌────────────────────────────────────┐
  │ Function:                          │
  │ update_children_updated_at()       │
  │                                    │
  │ BEGIN                              │
  │   NEW.updated_at = NOW();          │
  │   RETURN NEW;                      │
  │ END;                               │
  └────────────────────────────────────┘
           │
           ▼
  Row updated with new updated_at timestamp
```

## RLS Policy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              ROW LEVEL SECURITY (RLS)                        │
│                                                              │
│  STATUS: 🔴 DISABLED (Phase 0)                              │
│          🟢 WILL ENABLE (Phase 2)                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  policy_children_    │
│      select          │──────┐
│                      │      │
│ FOR SELECT           │      │
│ USING (              │      │
│   auth.uid() =       │      │
│   user_id            │      │
│ )                    │      │
└──────────────────────┘      │
                              │
┌──────────────────────┐      │
│  policy_children_    │      │    ┌─────────────────────┐
│      insert          │──────┼───▶│   auth.uid()        │
│                      │      │    │                     │
│ FOR INSERT           │      │    │ Supabase Auth JWT   │
│ WITH CHECK (         │      │    │ Returns user UUID   │
│   auth.uid() =       │      │    │                     │
│   user_id            │      │    └─────────────────────┘
│ )                    │      │              │
└──────────────────────┘      │              │
                              │              │
┌──────────────────────┐      │              │
│  policy_children_    │      │              │
│      update          │──────┤              │
│                      │      │              │
│ FOR UPDATE           │      │              │
│ USING (              │      │              │
│   auth.uid() =       │      │    Compares with row's
│   user_id            │      │    user_id to enforce
│ )                    │      │    ownership
│ WITH CHECK (         │      │
│   auth.uid() =       │      │
│   user_id            │      │
│ )                    │      │
└──────────────────────┘      │
                              │
┌──────────────────────┐      │
│  policy_children_    │      │
│      delete          │──────┘
│                      │
│ FOR DELETE           │
│ USING (              │
│   auth.uid() =       │
│   user_id            │
│ )                    │
└──────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 0 DATA FLOW                         │
└─────────────────────────────────────────────────────────────┘

CURRENT STATE (Old Schema):
┌──────────────────────┐
│   habit_tracker      │
│ ┌──────────────────┐ │
│ │ id: 1            │ │
│ │ child_name: "앨리스"│ │
│ │ user_id: abc-123 │ │
│ │ week_start: ...  │ │
│ │ habits: [...]    │ │  ← Denormalized JSONB
│ └──────────────────┘ │
└──────────────────────┘
         │
         │ Phase 0: Backfill
         │ (Not yet implemented)
         ▼
┌──────────────────────┐
│   children           │  ← NEW Shadow Schema
│ ┌──────────────────┐ │
│ │ id: uuid-1       │ │
│ │ user_id: abc-123 │ │
│ │ name: "앨리스"    │ │
│ │ created_at: ...  │ │
│ │ source: migration│ │
│ └──────────────────┘ │
└──────────────────────┘
         │
         │ Phase 1: Dual Write
         │ (Future)
         ▼
    BOTH schemas kept in sync
```

## Migration Timeline

```
Phase 0 (Current)           Phase 1 (Next)          Phase 2 (Future)
──────────────────          ─────────────           ────────────────
┌──────────────┐            ┌──────────────┐        ┌──────────────┐
│ CREATE TABLE │            │ Dual Write   │        │ Enable RLS   │
│ (Shadow)     │───────────▶│ Old + New    │───────▶│ Validate FK  │
│              │            │ Schemas      │        │ Full Switch  │
└──────────────┘            └──────────────┘        └──────────────┘
      │                            │                        │
      │ • Table created            │ • Edge Functions       │ • RLS ON
      │ • NOT VALID                │ • Triggers             │ • Constraints
      │ • Indexes CONCURRENT       │ • Sync both schemas    │   validated
      │ • RLS policies             │ • Monitor drift        │ • Old schema
      │   (inactive)               │                        │   deprecated
      │ • Zero impact              │                        │
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE METRICS                         │
└─────────────────────────────────────────────────────────────┘

Operation          │ Index Used                │ Complexity │ Speed
──────────────────┼──────────────────────────┼────────────┼──────
SELECT by user_id  │ idx_children_user_id      │ O(log n)   │ 🚀🚀🚀
SELECT by name     │ idx_children_name         │ O(log n)   │ 🚀🚀
SELECT (user,name) │ idx_children_user_name    │ O(log n)   │ 🚀🚀🚀
ORDER BY created   │ idx_children_created_at   │ O(log n)   │ 🚀🚀
INSERT             │ All indexes updated       │ O(log n)   │ 🚀
UPDATE             │ Trigger + index updates   │ O(log n)   │ 🚀
DELETE CASCADE     │ FK cascade propagates     │ O(n*m)     │ 🚀

Index Build Time   │ Method                    │ Locks      │ Safety
──────────────────┼──────────────────────────┼────────────┼──────
All indexes        │ CONCURRENTLY              │ None       │ 100%

Constraint Checks  │ Status                    │ Speed      │ Risk
──────────────────┼──────────────────────────┼────────────┼──────
Foreign Key        │ NOT VALID                 │ Instant    │ 0%
Check constraints  │ NOT VALID                 │ Instant    │ 0%
Unique constraint  │ DEFERRABLE                │ Fast       │ 0%
```

## Storage Estimates

```
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE ANALYSIS                           │
└─────────────────────────────────────────────────────────────┘

Per Row Size Estimate:
├─ id (UUID):              16 bytes
├─ user_id (UUID):         16 bytes
├─ name (TEXT avg 10):     ~15 bytes (10 + overhead)
├─ created_at (TIMESTAMPTZ): 8 bytes
├─ updated_at (TIMESTAMPTZ): 8 bytes
├─ source_version (TEXT):   ~15 bytes
├─ Row overhead:           ~23 bytes (PostgreSQL)
└─ Total per row:          ~101 bytes

For 10,000 children:
├─ Table data:             ~1 MB
├─ Indexes (5x):           ~2.5 MB
├─ TOAST overhead:         ~0.1 MB
└─ Total:                  ~3.6 MB

Scalability:
├─ 100K children:          ~36 MB
├─ 1M children:            ~360 MB
└─ 10M children:           ~3.6 GB
```

## Validation Checklist

```
┌─────────────────────────────────────────────────────────────┐
│              POST-MIGRATION VALIDATION                       │
└─────────────────────────────────────────────────────────────┘

□ Table Structure
  ├─ ✓ Table exists in public schema
  ├─ ✓ 6 columns present
  ├─ ✓ Correct data types
  └─ ✓ Correct nullability

□ Constraints
  ├─ ✓ Primary key on id
  ├─ ✓ Foreign key to auth.users (NOT VALID)
  ├─ ✓ Check: name length
  ├─ ✓ Check: source_version enum
  └─ ✓ Unique: (user_id, name)

□ Indexes
  ├─ ✓ idx_children_user_id
  ├─ ✓ idx_children_name
  ├─ ✓ idx_children_user_name
  ├─ ✓ idx_children_source_version (partial)
  └─ ✓ idx_children_created_at (DESC)

□ Triggers
  ├─ ✓ trigger_children_updated_at exists
  └─ ✓ Function update_children_updated_at() exists

□ RLS
  ├─ ✓ 4 policies created (SELECT, INSERT, UPDATE, DELETE)
  ├─ ✓ Policies reference auth.uid()
  └─ ✓ RLS is DISABLED (Phase 0)

□ Functional Tests
  ├─ ✓ Can insert row with defaults
  ├─ ✓ updated_at auto-updates
  ├─ ✓ UUIDs auto-generate
  └─ ✓ Timestamps auto-set
```

---

**Legend:**
- 🔴 Not active
- 🟢 Active
- 🚀 Fast operation
- 🔥 High impact index
- ⚡ Performance optimization
- ✓ Completed
- □ To be checked

**File**: `supabase/migrations/CHILDREN_TABLE_DIAGRAM.md`
**Created**: 2025-10-12
**Author**: DB Architect
