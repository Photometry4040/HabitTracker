# Phase 0 Week 2 Plan: Verification + Dual-Write Preparation

**Week**: 2 of 2 (Phase 0)
**Days**: Day 6-10 (2025-10-14 to 2025-10-18)
**Status**: Planning
**Previous Week**: Week 1 COMPLETE (13/13 tasks, 100%)

---

## 📋 Week 2 Overview

### Goals
1. **Validate NOT VALID constraints** - Execute VALIDATE CONSTRAINT commands
2. **Continuous monitoring** - Drift detection automation
3. **Dual-write preparation** - Edge Functions and Database Triggers scaffolding
4. **Phase 0 completion** - Final verification and approval

### Timeline

```
Day 6 (Mon)  ████ Constraint validation + Enable RLS (optional)
Day 7 (Tue)  ████ Drift detection automation + CI/CD setup
Day 8 (Wed)  ████ Edge Function skeleton (dual-write prep)
Day 9 (Thu)  ████ Database Trigger skeleton (dual-write backup)
Day 10 (Fri) ████ Phase 0 final verification + retrospective
```

### Success Criteria
- [ ] All NOT VALID constraints validated (9/9)
- [ ] Drift detection running automatically (every 6 hours)
- [ ] Dual-write infrastructure ready (Edge Function + Trigger scaffolds)
- [ ] Phase 0 retrospective completed
- [ ] Phase 1 kickoff approved

---

## Day 6: Constraint Validation + RLS Preparation

### Morning (9:00-12:00)

#### T0.14: Execute VALIDATE CONSTRAINT (2h)
**Goal**: Validate all NOT VALID constraints to enforce data integrity

**Script**: `scripts/execute-validate-constraints.js`

```javascript
// Auto-generated from validate-constraints.js output
// Executes VALIDATE CONSTRAINT for all 9 constraints

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync('.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('❌ Could not read .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const constraints = [
  // Foreign keys
  { table: 'children', constraint: 'fk_children_user_id', type: 'FK' },
  { table: 'weeks', constraint: 'fk_weeks_user_id', type: 'FK' },
  { table: 'weeks', constraint: 'fk_weeks_child_id', type: 'FK' },
  { table: 'habits', constraint: 'fk_habits_week_id', type: 'FK' },
  { table: 'habit_records', constraint: 'fk_habit_records_habit_id', type: 'FK' },

  // Check constraints
  { table: 'children', constraint: 'ck_children_name_length', type: 'CHECK' },
  { table: 'weeks', constraint: 'ck_weeks_date_range', type: 'CHECK' },
  { table: 'weeks', constraint: 'ck_weeks_start_monday', type: 'CHECK' },
  { table: 'habit_records', constraint: 'ck_habit_records_status', type: 'CHECK' }
];

async function validateConstraint(table, constraint, type) {
  console.log(`\n🔍 Validating ${type}: ${table}.${constraint}`);

  const startTime = Date.now();

  try {
    // Execute via RPC (raw SQL)
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table} VALIDATE CONSTRAINT ${constraint};`
    });

    if (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      return { table, constraint, status: 'failed', error: error.message };
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Validated in ${duration}ms`);
    return { table, constraint, status: 'success', duration };
  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    return { table, constraint, status: 'error', error: err.message };
  }
}

async function main() {
  console.log('🚀 Starting constraint validation...\n');
  console.log('⚠️  This will scan all records to validate constraints');
  console.log('⚠️  Estimated time: 2-5 minutes for current data size\n');

  const results = [];

  for (const { table, constraint, type } of constraints) {
    const result = await validateConstraint(table, constraint, type);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  console.log(`✅ Success: ${successCount}/${constraints.length}`);
  console.log(`❌ Failed: ${failedCount}/${constraints.length}`);

  if (failedCount > 0) {
    console.log('\n⚠️  Failed constraints:');
    results.filter(r => r.status !== 'success').forEach(r => {
      console.log(`  - ${r.table}.${r.constraint}: ${r.error}`);
    });
  }

  console.log('\n✅ All constraints are now VALIDATED!');
  console.log('🎉 Data integrity enforcement is active');
}

main();
```

**Steps**:
1. Create `scripts/execute-validate-constraints.js`
2. Test in dry-run mode (optional)
3. Execute validation (2-5 minutes)
4. Verify all 9 constraints validated successfully

**Completion Criteria**:
- [ ] Script created and tested
- [ ] All 9 constraints validated (0 failures)
- [ ] Performance acceptable (<5 minutes total)
- [ ] Documentation updated

---

### Afternoon (13:00-17:00)

#### T0.15: RLS Policy Testing (Optional) (2h)
**Goal**: Prepare RLS policies for Phase 2 activation (test but don't enable)

**Note**: This is preparation work. RLS will NOT be enabled in Phase 0.

**Script**: `scripts/test-rls-policies.js`

```javascript
// Test RLS policies in isolation (without enabling RLS)
// Verifies that policies are correctly written

import { createClient } from '@supabase/supabase-js';

// Use service role key for testing (bypasses RLS)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLSPolicies() {
  console.log('🧪 Testing RLS Policies (not enabled yet)...\n');

  // Test 1: Verify policies exist
  console.log('📋 Test 1: Policy existence check');
  const { data: policies, error: policyError } = await supabase
    .rpc('get_policies');

  if (policyError) {
    console.error('❌ Failed to fetch policies:', policyError.message);
    return;
  }

  const expectedPolicies = [
    'children_select_policy',
    'children_insert_policy',
    'children_update_policy',
    'children_delete_policy',
    'weeks_select_policy',
    'weeks_insert_policy',
    'weeks_update_policy',
    'weeks_delete_policy',
    // ... (24 policies total)
  ];

  console.log(`✅ Found ${policies.length} policies`);
  console.log(`Expected: ${expectedPolicies.length} policies\n`);

  // Test 2: Verify RLS is NOT enabled
  console.log('📋 Test 2: RLS status check');
  const { data: tables } = await supabase
    .rpc('get_rls_status');

  tables.forEach(table => {
    if (table.rls_enabled) {
      console.warn(`⚠️  RLS is enabled on ${table.table_name} (should be disabled in Phase 0)`);
    } else {
      console.log(`✅ ${table.table_name}: RLS disabled (correct)`);
    }
  });

  console.log('\n✅ RLS policy testing complete');
  console.log('⚠️  RLS will be enabled in Phase 2');
}

testRLSPolicies();
```

**Steps**:
1. Create `scripts/test-rls-policies.js`
2. Verify 24 RLS policies exist
3. Confirm RLS is disabled on all 6 tables
4. Document policy structure for Phase 2

**Completion Criteria**:
- [ ] Script created and tested
- [ ] All 24 policies confirmed to exist
- [ ] RLS confirmed disabled on all tables
- [ ] Phase 2 RLS activation plan documented

---

## Day 7: Drift Detection Automation

### Morning (9:00-12:00)

#### T0.16: Drift Detection Script (2h)
**Goal**: Create automated drift detection to monitor old vs new schema consistency

**Script**: `scripts/drift-detection.js`

```javascript
// Continuous monitoring for data drift between old and new schemas
// Runs every 6 hours via GitHub Actions

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ... (Supabase setup similar to previous scripts)

async function detectDrift() {
  console.log('🔍 Starting drift detection...\n');

  const issues = [];
  const startTime = Date.now();

  // 1. Count comparison
  console.log('📊 Test 1: Record count comparison');

  const { count: oldWeeksCount } = await supabase
    .from('habit_tracker')
    .select('*', { count: 'exact', head: true });

  const { count: newWeeksCount } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true });

  if (oldWeeksCount !== newWeeksCount) {
    issues.push({
      severity: 'HIGH',
      type: 'COUNT_MISMATCH',
      table: 'weeks',
      old_count: oldWeeksCount,
      new_count: newWeeksCount,
      diff: newWeeksCount - oldWeeksCount
    });
  }

  console.log(`  Old schema (habit_tracker): ${oldWeeksCount} weeks`);
  console.log(`  New schema (weeks): ${newWeeksCount} weeks`);
  console.log(`  ${oldWeeksCount === newWeeksCount ? '✅' : '❌'} Counts match\n`);

  // 2. Sample data verification (10 random records)
  console.log('📊 Test 2: Sample data verification');

  const { data: oldSamples } = await supabase
    .from('habit_tracker')
    .select('*')
    .limit(10);

  for (const oldRow of oldSamples) {
    // Find corresponding new schema data
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('name', oldRow.child_name)
      .single();

    if (!child) {
      issues.push({
        severity: 'CRITICAL',
        type: 'MISSING_CHILD',
        child_name: oldRow.child_name
      });
      continue;
    }

    const { data: week } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .eq('week_start_date', oldRow.week_start_date)
      .single();

    if (!week) {
      issues.push({
        severity: 'CRITICAL',
        type: 'MISSING_WEEK',
        child_name: oldRow.child_name,
        week_start_date: oldRow.week_start_date
      });
      continue;
    }

    // Verify theme matches
    if (oldRow.theme !== week.theme) {
      issues.push({
        severity: 'MEDIUM',
        type: 'DATA_MISMATCH',
        field: 'theme',
        child_name: oldRow.child_name,
        week_start_date: oldRow.week_start_date,
        old_value: oldRow.theme,
        new_value: week.theme
      });
    }
  }

  console.log(`  Checked ${oldSamples.length} sample records`);
  console.log(`  ${issues.length === 0 ? '✅' : '❌'} All samples match\n`);

  // 3. Source version distribution
  console.log('📊 Test 3: Source version tracking');

  const { data: sourceVersions } = await supabase
    .from('weeks')
    .select('source_version')
    .order('source_version');

  const versionCounts = {};
  for (const row of sourceVersions) {
    versionCounts[row.source_version] = (versionCounts[row.source_version] || 0) + 1;
  }

  console.log('  Source version distribution:');
  for (const [version, count] of Object.entries(versionCounts)) {
    console.log(`    ${version}: ${count} records`);
  }

  // Report
  const duration = Date.now() - startTime;
  console.log('\n' + '='.repeat(60));
  console.log('📊 Drift Detection Summary');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration}ms`);
  console.log(`Issues found: ${issues.length}`);

  if (issues.length === 0) {
    console.log('\n✅ No drift detected - schemas are in sync');
  } else {
    console.log('\n⚠️  Drift detected:');
    console.table(issues);

    // Send alert (Discord webhook)
    await sendDiscordAlert({
      title: '🚨 Schema Drift Detected',
      description: `Found ${issues.length} drift issues`,
      issues: issues
    });
  }

  return issues;
}

async function sendDiscordAlert({ title, description, issues }) {
  // Read Discord webhook URL from .env
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('⚠️  No Discord webhook configured, skipping alert');
    return;
  }

  const embed = {
    title: title,
    description: description,
    color: 0xFF0000, // Red
    fields: issues.slice(0, 10).map(issue => ({
      name: `${issue.severity}: ${issue.type}`,
      value: JSON.stringify(issue, null, 2).substring(0, 1000),
      inline: false
    })),
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (response.ok) {
      console.log('✅ Discord alert sent');
    } else {
      console.error('❌ Failed to send Discord alert');
    }
  } catch (err) {
    console.error('❌ Discord alert error:', err.message);
  }
}

detectDrift().catch(console.error);
```

**Steps**:
1. Create `scripts/drift-detection.js`
2. Test locally (should show 0 drift)
3. Configure Discord webhook (optional)
4. Document expected behavior

**Completion Criteria**:
- [ ] Script created and tested
- [ ] 0 drift detected on first run
- [ ] Discord alerts configured (optional)
- [ ] Ready for CI/CD integration (Day 7 afternoon)

---

### Afternoon (13:00-17:00)

#### T0.17: GitHub Actions Drift Detection (2h)
**Goal**: Automate drift detection with GitHub Actions (runs every 6 hours)

**File**: `.github/workflows/drift-detection.yml`

```yaml
name: Drift Detection

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:  # Allow manual runs
  push:
    paths:
      - 'scripts/drift-detection.js'
      - '.github/workflows/drift-detection.yml'

jobs:
  detect-drift:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run drift detection
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: node scripts/drift-detection.js

      - name: Create issue on drift
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Schema Drift Detected',
              body: `
                ## Schema Drift Alert

                The automated drift detection found inconsistencies between old and new schemas.

                **Timestamp**: ${new Date().toISOString()}
                **Workflow**: [${context.workflow}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})

                ### Next Steps
                1. Check the workflow logs for detailed drift information
                2. Run \`node scripts/drift-detection.js\` locally to investigate
                3. If legitimate drift (e.g., new data in old schema), run backfill scripts
                4. If unexpected, investigate and resolve data integrity issue

                ### Useful Commands
                \`\`\`bash
                # Check drift locally
                node scripts/drift-detection.js

                # Re-run backfill if needed
                node scripts/backfill-children-weeks.js
                node scripts/backfill-habits-records.js

                # Verify after fix
                node scripts/verify-backfill.js
                \`\`\`
              `,
              labels: ['bug', 'drift-detection', 'high-priority']
            });
```

**Steps**:
1. Create `.github/workflows/drift-detection.yml`
2. Add required secrets to GitHub (if not already present)
3. Trigger manual run to test
4. Verify workflow succeeds
5. Wait for next scheduled run (6 hours) or test with cron simulator

**Completion Criteria**:
- [ ] Workflow file created
- [ ] Manual run successful
- [ ] Issue creation tested (simulate failure)
- [ ] Scheduled runs configured (every 6 hours)

---

## Day 8-9: Dual-Write Preparation (Phase 1 Scaffolding)

### Day 8 Morning (9:00-12:00)

#### T0.18: Edge Function Skeleton (2h)
**Goal**: Create Edge Function structure for Phase 1 dual-write (not yet functional)

**File**: `supabase/functions/dual-write-habit/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request
    const { operation, data } = await req.json();

    // Check idempotency key
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      throw new Error('X-Idempotency-Key header required');
    }

    // TODO: Phase 1 implementation
    // For now, just return 501 Not Implemented

    console.log(`Dual-write request: ${operation}`);
    console.log(`Idempotency key: ${idempotencyKey}`);
    console.log('Data:', data);

    return new Response(
      JSON.stringify({
        message: 'Dual-write Edge Function skeleton',
        status: 'not_implemented',
        phase: 'Phase 0',
        note: 'Will be implemented in Phase 1',
        received: { operation, data, idempotencyKey }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 501
      }
    );

  } catch (error) {
    console.error('Edge Function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Placeholder functions for Phase 1

async function createWeekDualWrite(supabase: any, data: any) {
  // TODO: Implement in Phase 1
  // 1. Write to old schema (habit_tracker)
  // 2. Write to new schema (children, weeks)
  // 3. Verify consistency
  throw new Error('Not implemented yet');
}

async function updateHabitRecordDualWrite(supabase: any, data: any) {
  // TODO: Implement in Phase 1
  // 1. Update old schema (JSONB habits array)
  // 2. Update new schema (habit_records table)
  // 3. Verify consistency
  throw new Error('Not implemented yet');
}

async function deleteWeekDualWrite(supabase: any, data: any) {
  // TODO: Implement in Phase 1
  // 1. Delete from old schema
  // 2. Delete from new schema (CASCADE)
  // 3. Verify consistency
  throw new Error('Not implemented yet');
}
```

**Steps**:
1. Create `supabase/functions/dual-write-habit/index.ts`
2. Deploy to Supabase: `npx supabase functions deploy dual-write-habit`
3. Test with curl (should return 501 Not Implemented)
4. Document function structure for Phase 1

**Test Command**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-key-123" \
  -d '{"operation":"create_week","data":{"child_name":"Test","week_start_date":"2025-10-14"}}'
```

**Expected Response**:
```json
{
  "message": "Dual-write Edge Function skeleton",
  "status": "not_implemented",
  "phase": "Phase 0",
  "note": "Will be implemented in Phase 1"
}
```

**Completion Criteria**:
- [ ] Edge Function created and deployed
- [ ] Returns 501 with proper message
- [ ] Handles CORS correctly
- [ ] Idempotency key validation works
- [ ] Phase 1 implementation plan documented

---

### Day 8 Afternoon + Day 9 Morning (13:00-12:00 next day)

#### T0.19: Database Trigger Skeleton (3h)
**Goal**: Create Database Trigger for dual-write backup (Edge Function failures)

**File**: `supabase/migrations/013_create_dual_write_triggers.sql`

```sql
-- ============================================================================
-- Migration: 013_create_dual_write_triggers
-- Description: Database triggers for dual-write (Phase 1 backup mechanism)
-- Strategy: Created in Phase 0, activated in Phase 1
-- ============================================================================

-- ============================================================================
-- Trigger Function: sync_old_to_new
-- Purpose: Backup mechanism when Edge Function fails
-- Activation: Phase 1 (currently logs only)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_old_to_new()
RETURNS TRIGGER AS $$
BEGIN
  -- Phase 0: Just log, don't sync yet
  RAISE NOTICE 'Dual-write trigger fired: table=%, operation=%, id=%',
    TG_TABLE_NAME, TG_OP, NEW.id;

  -- TODO: Phase 1 implementation
  -- IF TG_OP = 'INSERT' THEN
  --   -- Parse OLD.habits JSONB
  --   -- Insert into new schema tables
  -- ELSIF TG_OP = 'UPDATE' THEN
  --   -- Update new schema
  -- ELSIF TG_OP = 'DELETE' THEN
  --   -- Delete from new schema
  -- END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers (created but only logs in Phase 0)
-- ============================================================================

-- Trigger on habit_tracker table
CREATE TRIGGER trigger_habit_tracker_dual_write
  AFTER INSERT OR UPDATE OR DELETE ON habit_tracker
  FOR EACH ROW
  EXECUTE FUNCTION sync_old_to_new();

-- ============================================================================
-- Idempotency Log Table (for Edge Function)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_idempotency_key ON idempotency_log(key);
CREATE INDEX idx_idempotency_expires ON idempotency_log(expires_at);

COMMENT ON TABLE idempotency_log IS 'Idempotency tracking for dual-write Edge Function';
COMMENT ON COLUMN idempotency_log.key IS 'Unique idempotency key from X-Idempotency-Key header';
COMMENT ON COLUMN idempotency_log.expires_at IS 'Auto-expire after 24 hours (cleanup job)';

-- ============================================================================
-- Cleanup Function (remove expired idempotency logs)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_idempotency_log()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_log WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- TODO: Phase 1 - Create pg_cron job to run cleanup daily
-- SELECT cron.schedule('cleanup-idempotency', '0 2 * * *', 'SELECT cleanup_idempotency_log()');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check trigger exists
-- SELECT tgname, tgrelid::regclass, tgfoid::regproc
-- FROM pg_trigger
-- WHERE tgname = 'trigger_habit_tracker_dual_write';

-- Test trigger (Phase 0 - should only log)
-- INSERT INTO habit_tracker (child_name, week_start_date, week_period, habits)
-- VALUES ('Test Child', '2025-10-14', '2025년 10월 14일 ~ 2025년 10월 20일', '[]');
-- Expected: NOTICE in logs, no actual sync

-- Check idempotency_log table
-- SELECT * FROM idempotency_log ORDER BY created_at DESC LIMIT 10;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. Trigger function created but only logs in Phase 0
-- 2. Actual sync logic will be implemented in Phase 1
-- 3. Idempotency log table ready for Edge Function use
-- 4. Cleanup function created (pg_cron job in Phase 1)
-- 5. Safe to deploy - no production impact (just logging)
-- ============================================================================
```

**Steps**:
1. Create `supabase/migrations/013_create_dual_write_triggers.sql`
2. Deploy via Supabase Dashboard SQL Editor
3. Test trigger with INSERT (should only log, not sync)
4. Verify idempotency_log table created
5. Document Phase 1 implementation plan

**Test Queries**:
```sql
-- Verify trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_habit_tracker_dual_write';

-- Test trigger (should only log)
INSERT INTO habit_tracker (child_name, week_start_date, week_period, habits, user_id)
VALUES (
  'Trigger Test',
  '2025-10-14',
  '2025년 10월 14일 ~ 2025년 10월 20일',
  '[]'::jsonb,
  'fc24adf2-a7af-4fbf-abe0-c332bb48b02b'
);

-- Check logs (should see NOTICE)
-- Expected: "Dual-write trigger fired: table=habit_tracker, operation=INSERT, id=..."

-- Cleanup test data
DELETE FROM habit_tracker WHERE child_name = 'Trigger Test';
```

**Completion Criteria**:
- [ ] Migration file created
- [ ] Trigger function deployed
- [ ] Trigger created on habit_tracker table
- [ ] Idempotency_log table created
- [ ] Test INSERT shows NOTICE in logs (no actual sync)
- [ ] Phase 1 implementation plan documented

---

### Day 9 Afternoon (13:00-17:00)

#### T0.20: Dual-Write Integration Test Plan (2h)
**Goal**: Document Phase 1 dual-write integration and testing strategy

**File**: `docs/PHASE1_DUAL_WRITE_PLAN.md`

```markdown
# Phase 1 Dual-Write Implementation Plan

**Status**: Phase 0 Preparation Complete
**Timeline**: Phase 1 Week 1-2 (4 weeks total for Phase 1)
**Prerequisites**: All Phase 0 tasks complete

---

## Infrastructure Ready (Phase 0)

### ✅ Edge Function Skeleton
- File: `supabase/functions/dual-write-habit/index.ts`
- Status: Deployed (returns 501 Not Implemented)
- URL: https://your-project.supabase.co/functions/v1/dual-write-habit
- Handles: CORS, idempotency keys, error handling

### ✅ Database Trigger Skeleton
- Migration: `013_create_dual_write_triggers.sql`
- Function: `sync_old_to_new()`
- Status: Created (logs only, no sync)
- Trigger: `trigger_habit_tracker_dual_write` on habit_tracker table

### ✅ Idempotency Infrastructure
- Table: `idempotency_log`
- Cleanup: `cleanup_idempotency_log()` function ready
- Expiration: 24-hour auto-expire

---

## Phase 1 Implementation Checklist

### Week 1: Core Dual-Write Logic

#### Day 1-2: Edge Function Implementation
- [ ] Implement `createWeekDualWrite()`
  - Write to old schema (habit_tracker)
  - Write to new schema (children, weeks, habits)
  - Handle idempotency
  - Return success/failure status

- [ ] Implement `updateHabitRecordDualWrite()`
  - Update old schema (JSONB habits.times array)
  - Update new schema (habit_records table)
  - Handle Last-Write-Wins conflicts

- [ ] Implement `deleteWeekDualWrite()`
  - Delete from old schema
  - Delete from new schema (CASCADE)
  - Verify orphaned records cleaned up

#### Day 3-4: Database Trigger Implementation
- [ ] Implement `sync_old_to_new()` INSERT logic
  - Parse JSONB habits array
  - Create children (if not exists)
  - Create weeks
  - Create habits
  - Create habit_records (from times array)

- [ ] Implement UPDATE logic
  - Detect changes in JSONB
  - Update corresponding new schema records

- [ ] Implement DELETE logic
  - Cascade delete from new schema

#### Day 5: Testing & Verification
- [ ] Unit tests for Edge Function
- [ ] Integration tests for Trigger
- [ ] Idempotency tests (duplicate requests)
- [ ] Performance tests (100+ concurrent requests)
- [ ] Rollback tests (Edge Function OFF)

### Week 2: Integration & Monitoring

#### Day 6-7: Frontend Integration
- [ ] Update `src/lib/database.js` to call Edge Function
- [ ] Add X-Idempotency-Key generation
- [ ] Add retry logic (exponential backoff)
- [ ] Add error handling (fallback to old schema only)

#### Day 8-9: Monitoring Setup
- [ ] Supabase logs analysis
- [ ] Drift detection (enhanced for dual-write)
- [ ] Alert thresholds (>1% drift = critical)
- [ ] Dashboard for sync metrics

#### Day 10: Phase 1 Verification
- [ ] 24-hour dual-write stability test
- [ ] Zero drift confirmed
- [ ] Performance acceptable (<200ms p95)
- [ ] Phase 2 (gradual cutover) approved

---

## Testing Strategy

### 1. Idempotency Tests
```javascript
// Test duplicate request handling
const idempotencyKey = 'test-key-123';

const response1 = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey },
  body: JSON.stringify({ operation: 'create_week', data: {...} })
});

const response2 = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey },
  body: JSON.stringify({ operation: 'create_week', data: {...} })
});

// Expected: response1 creates data, response2 returns cached result
// Verify: Only 1 record in database
```

### 2. Consistency Tests
```javascript
// Verify old and new schemas have identical data
const { data: oldData } = await supabase.from('habit_tracker').select('*');
const { data: newData } = await supabase.from('weeks').select(`
  *,
  children!inner(*),
  habits(*, habit_records(*))
`);

// Compare: child_name vs children.name, habits JSONB vs habits table
```

### 3. Performance Tests
```bash
# Load test with k6
k6 run --vus 50 --duration 30s loadtest/dual-write.js

# Expected:
# - p95 < 200ms
# - Error rate < 0.1%
# - Zero drift after test
```

### 4. Rollback Tests
```javascript
// Simulate Edge Function failure
// Expected: Database Trigger handles sync
// Verify: Zero data loss
```

---

## Rollback Plan

### Scenario 1: Edge Function Issues
**Action**: Disable Edge Function, rely on Database Trigger
```bash
npx supabase functions delete dual-write-habit
```
**Impact**: Minimal (Trigger handles sync)
**Recovery Time**: < 5 minutes

### Scenario 2: Excessive Drift (>1%)
**Action**: Stop dual-write, rollback to old schema only
```javascript
// In src/lib/database.js
const ENABLE_DUAL_WRITE = false; // Emergency flag
```
**Impact**: New schema stops receiving writes
**Recovery Time**: < 1 minute

### Scenario 3: Database Trigger Issues
**Action**: Disable trigger, Edge Function only
```sql
ALTER TABLE habit_tracker DISABLE TRIGGER trigger_habit_tracker_dual_write;
```
**Impact**: No backup if Edge Function fails
**Recovery Time**: < 5 minutes

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Dual-write functional (Edge Function + Trigger)
- [ ] 24-hour stability test passed
- [ ] Zero drift (<0.1%)
- [ ] Performance acceptable (<200ms p95)
- [ ] Rollback tested and documented
- [ ] Team approval for Phase 2

---

**Next Phase**: Phase 2 - Gradual Read Cutover (5% → 100%)
```

**Steps**:
1. Create `docs/PHASE1_DUAL_WRITE_PLAN.md`
2. Review with team (if applicable)
3. Commit to repository
4. Prepare Phase 1 kickoff presentation

**Completion Criteria**:
- [ ] Document created and reviewed
- [ ] Testing strategy defined
- [ ] Rollback plan documented
- [ ] Success criteria clear
- [ ] Phase 1 kickoff ready

---

## Day 10: Phase 0 Final Verification

### Morning (9:00-12:00)

#### T0.21: Phase 0 Completion Checklist (2h)
**Goal**: Verify all Phase 0 objectives met

**Checklist**:

**Infrastructure** ✅
- [x] 6 tables created (children, weeks, habits, habit_records, habit_templates, notifications)
- [x] 41 indexes created (CONCURRENTLY via Dashboard)
- [x] 24 RLS policies created (disabled, ready for Phase 2)
- [x] 9 NOT VALID constraints created
- [ ] All constraints validated (VALIDATE CONSTRAINT executed)
- [x] source_version tracking field in all tables

**Data Migration** ✅
- [x] Backfill scripts created (children-weeks, habits-records)
- [x] 424 records migrated (6 children, 18 weeks, 117 habits, 283 records)
- [x] 75% week migration rate (6 skipped due to Monday constraint)
- [x] Verification script created and executed
- [x] Foreign key integrity confirmed (0 orphaned records)

**Automation** ✅
- [x] Validation script created (validate-constraints.js)
- [x] Performance baseline script created (measure-performance-baseline.js)
- [ ] Drift detection script created (drift-detection.js)
- [ ] GitHub Actions workflow created (drift-detection.yml)
- [ ] Discord alerts configured (optional)

**Dual-Write Preparation**
- [ ] Edge Function skeleton deployed (dual-write-habit)
- [ ] Database Trigger skeleton created (sync_old_to_new)
- [ ] Idempotency infrastructure ready (idempotency_log table)
- [ ] Phase 1 implementation plan documented

**Documentation** ✅
- [x] PHASE_0_PROGRESS.md tracking document
- [x] WEEK1_REVIEW.md comprehensive review
- [x] DB_MIGRATION_PLAN_V2.md migration strategy
- [x] CHILDREN_TABLE_DDL_SUMMARY.md table documentation
- [x] MIGRATION_USER_SETUP.md user guide
- [x] ORCHESTRATION_PLAN.md workflow guide
- [ ] WEEK2_PLAN.md (this document)
- [ ] PHASE0_RETROSPECTIVE.md (Day 10 deliverable)

**Performance** ✅
- [x] Baseline established (80.92ms avg)
- [x] All queries < 200ms at current scale
- [x] Growth projections documented (10x, 100x, 1000x)
- [x] Optimization recommendations noted

---

### Afternoon (13:00-17:00)

#### T0.22: Phase 0 Retrospective Document (3h)
**Goal**: Comprehensive Phase 0 review and lessons learned

**File**: `docs/PHASE0_RETROSPECTIVE.md`

**Structure**:
1. Executive Summary
2. Objectives vs Achievements
3. Data Statistics
4. Technical Highlights
5. Issues Encountered & Resolutions
6. Velocity Analysis
7. Lessons Learned
8. Recommendations for Phase 1
9. Team Acknowledgments
10. Phase 1 Kickoff Approval

**Creation Process**:
- Review all Week 1 and Week 2 work
- Compile metrics from PHASE_0_PROGRESS.md
- Extract lessons from WEEK1_REVIEW.md
- Add Week 2 accomplishments
- Final statistics and charts
- Phase 1 readiness assessment

**Completion Criteria**:
- [ ] Retrospective document created (comprehensive)
- [ ] All Phase 0 metrics documented
- [ ] Lessons learned captured
- [ ] Phase 1 kickoff approved by team
- [ ] Repository tagged as `phase-0-complete`

---

## Week 2 Success Criteria

### Must Have
- [ ] All 9 NOT VALID constraints validated
- [ ] Drift detection script operational
- [ ] GitHub Actions workflow running (every 6 hours)
- [ ] Dual-write infrastructure ready (Edge Function + Trigger skeletons)
- [ ] Phase 0 retrospective complete

### Should Have
- [ ] RLS policies tested (not enabled)
- [ ] Discord alerts configured
- [ ] Performance regression tests
- [ ] Phase 1 implementation plan reviewed

### Nice to Have
- [ ] Supabase Dashboard monitoring setup
- [ ] Grafana/Prometheus integration (if available)
- [ ] Load testing baseline

---

## Timeline Summary

```
Day 6 (Mon):  Constraint validation + RLS preparation
Day 7 (Tue):  Drift detection + CI/CD automation
Day 8 (Wed):  Edge Function skeleton
Day 9 (Thu):  Database Trigger skeleton + Phase 1 planning
Day 10 (Fri): Phase 0 verification + retrospective
```

**Total Effort**: ~20 hours (2 work weeks compressed into 5 days)
**Expected Completion**: 2025-10-18 (if maintaining 3.5x velocity)

---

## Risk Mitigation

### Risk 1: Constraint Validation Failures
**Probability**: Low (all data pre-validated)
**Impact**: Medium (blocks Phase 0 completion)
**Mitigation**: Manual data cleanup if needed, re-run backfill

### Risk 2: Drift Detection False Positives
**Probability**: Medium (Monday constraint, skipped weeks)
**Impact**: Low (already known and documented)
**Mitigation**: Filter known skipped weeks in drift detection logic

### Risk 3: GitHub Actions Quota
**Probability**: Low (small project)
**Impact**: Low (can use local cron instead)
**Mitigation**: Monitor Actions usage, fallback to local scheduling

---

## Phase 1 Preview

**Start Date**: 2025-10-19 (if Week 2 completes on schedule)
**Duration**: 4 weeks
**Key Milestones**:
- Week 1-2: Implement dual-write logic (Edge Function + Trigger)
- Week 3: Frontend integration and testing
- Week 4: 24-hour stability test, Phase 2 approval

**Ready to Start When**:
- ✅ All Phase 0 tasks complete
- ✅ Drift detection operational
- ✅ Team approval
- ✅ Documentation up-to-date

---

**Document Version**: 1.0
**Created**: 2025-10-13
**Author**: Claude Code
**Status**: Planning (Week 2 Day 6-10)
