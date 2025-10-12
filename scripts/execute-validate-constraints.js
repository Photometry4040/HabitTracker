import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
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
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Constraints to validate (from validate-constraints.js results)
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
    // We cannot use RPC to execute raw SQL with anon key
    // Instead, we'll use the PostgreSQL REST API approach
    // Note: This requires service role key for DDL operations

    // For now, generate SQL for manual execution
    const sql = `ALTER TABLE ${table} VALIDATE CONSTRAINT ${constraint};`;

    console.log(`   SQL: ${sql}`);
    console.log('   ⚠️  Note: VALIDATE CONSTRAINT requires service role or manual execution via Dashboard');

    return {
      table,
      constraint,
      type,
      sql,
      status: 'sql_generated',
      note: 'Execute manually via Supabase Dashboard SQL Editor'
    };

  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    return { table, constraint, status: 'error', error: err.message };
  }
}

async function main() {
  console.log('🚀 Starting constraint validation...\n');
  console.log('⚠️  This script generates SQL commands for manual execution');
  console.log('⚠️  VALIDATE CONSTRAINT is a DDL operation requiring elevated privileges\n');
  console.log('📋 Background:');
  console.log('   - All constraints were created with NOT VALID flag in Phase 0');
  console.log('   - Data has been validated by validate-constraints.js (0 violations found)');
  console.log('   - Now we can safely execute VALIDATE CONSTRAINT\n');

  const results = [];
  const sqlCommands = [];

  console.log('=' + '='.repeat(79));
  console.log(' Generating VALIDATE CONSTRAINT SQL Commands');
  console.log('=' + '='.repeat(79));

  for (const { table, constraint, type } of constraints) {
    const result = await validateConstraint(table, constraint, type);
    results.push(result);

    if (result.sql) {
      sqlCommands.push(result.sql);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Validation Summary');
  console.log('='.repeat(80));

  console.log(`\n📝 Total constraints: ${constraints.length}`);
  console.log('   - Foreign Keys: 5');
  console.log('   - Check Constraints: 4');

  console.log('\n✅ All constraints pre-validated (0 violations found in validate-constraints.js)');
  console.log('📋 SQL commands generated for manual execution\n');

  // Output SQL script
  console.log('=' + '='.repeat(79));
  console.log(' SQL Script for Supabase Dashboard (Copy & Paste)');
  console.log('=' + '='.repeat(79));
  console.log('\n-- Phase 0 Day 6: Validate NOT VALID Constraints');
  console.log('-- All constraints have been pre-validated (0 violations)');
  console.log('-- Safe to execute\n');
  console.log('BEGIN;');
  console.log('');

  sqlCommands.forEach((sql, index) => {
    console.log(`-- ${index + 1}/${sqlCommands.length}: ${constraints[index].type} constraint`);
    console.log(sql);
    console.log('');
  });

  console.log('COMMIT;');
  console.log('');

  console.log('=' + '='.repeat(79));
  console.log(' Execution Instructions');
  console.log('='.repeat(80));
  console.log('\n1. Open Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT');
  console.log('2. Navigate to: SQL Editor');
  console.log('3. Copy the SQL script above');
  console.log('4. Paste into SQL Editor');
  console.log('5. Click "Run"');
  console.log('6. Expected execution time: 1-5 seconds (current data size: 424 records)');
  console.log('7. Expected result: "Success. No rows returned"');
  console.log('\n🎉 After execution, all constraints will be enforced!');
  console.log('✅ Data integrity will be guaranteed at the database level');

  // Save SQL to file
  const sqlScript = `-- Phase 0 Day 6: Validate NOT VALID Constraints
-- Generated: ${new Date().toISOString()}
-- Pre-validation: 0 violations found
-- Safe to execute

BEGIN;

${sqlCommands.map((sql, index) => `-- ${index + 1}/${sqlCommands.length}: ${constraints[index].type} constraint on ${constraints[index].table}.${constraints[index].constraint}\n${sql}`).join('\n\n')}

COMMIT;

-- Verification query (run after COMMIT)
-- Check constraint validation status
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  CASE
    WHEN convalidated THEN 'VALIDATED ✅'
    ELSE 'NOT VALID ⚠️'
  END AS status
FROM pg_constraint
WHERE conname IN (${constraints.map(c => `'${c.constraint}'`).join(', ')})
ORDER BY conrelid::regclass, conname;

-- Expected result: All constraints should show 'VALIDATED ✅'
`;

  const fs = await import('fs/promises');
  await fs.writeFile('scripts/validate-constraints.sql', sqlScript, 'utf8');
  console.log('\n📁 SQL script saved to: scripts/validate-constraints.sql');
  console.log('   You can also execute this file directly via Dashboard\n');
}

main().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});
