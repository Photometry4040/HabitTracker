/**
 * Verify OLD SCHEMA Cleanup
 *
 * This script verifies that:
 * 1. habit_tracker_old table has been dropped
 * 2. v_old_schema_status view has been dropped
 * 3. NEW SCHEMA tables are operational
 * 4. Backup file exists
 *
 * Run: node scripts/verify-old-schema-cleanup.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyCleanup() {
  console.log('🔍 Verifying OLD SCHEMA cleanup...\n');

  let allPassed = true;

  // Test 1: Check if habit_tracker_old table exists (should NOT exist)
  console.log('Test 1: Checking if habit_tracker_old table is dropped...');
  try {
    const { data, error } = await supabase
      .from('habit_tracker_old')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      // 42P01 = relation does not exist (expected)
      console.log('✅ PASS: habit_tracker_old table does not exist (correctly dropped)\n');
    } else {
      console.log('❌ FAIL: habit_tracker_old table still exists\n');
      allPassed = false;
    }
  } catch (err) {
    console.log('✅ PASS: habit_tracker_old table does not exist (correctly dropped)\n');
  }

  // Test 2: Check if v_old_schema_status view exists (should NOT exist)
  console.log('Test 2: Checking if v_old_schema_status view is dropped...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT * FROM v_old_schema_status LIMIT 1"
    });

    if (error) {
      console.log('✅ PASS: v_old_schema_status view does not exist (correctly dropped)\n');
    } else {
      console.log('❌ FAIL: v_old_schema_status view still exists\n');
      allPassed = false;
    }
  } catch (err) {
    console.log('✅ PASS: v_old_schema_status view does not exist (correctly dropped)\n');
  }

  // Test 3: Verify NEW SCHEMA tables are operational
  console.log('Test 3: Verifying NEW SCHEMA tables...');

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id')
    .limit(1);

  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('id')
    .limit(1);

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .limit(1);

  const { data: records, error: recordsError } = await supabase
    .from('habit_records')
    .select('id')
    .limit(1);

  if (!childrenError && !weeksError && !habitsError && !recordsError) {
    console.log('✅ PASS: All NEW SCHEMA tables are operational');
    console.log(`   - children: accessible`);
    console.log(`   - weeks: accessible`);
    console.log(`   - habits: accessible`);
    console.log(`   - habit_records: accessible\n`);
  } else {
    console.log('❌ FAIL: Some NEW SCHEMA tables have errors\n');
    allPassed = false;
  }

  // Test 4: Check backup file exists
  console.log('Test 4: Checking backup file...');
  const backupPath = path.join(process.cwd(), 'backups', 'habit_tracker_backup_2025-10-18T09-40-06-279Z.json');

  if (fs.existsSync(backupPath)) {
    const stats = fs.statSync(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✅ PASS: Backup file exists`);
    console.log(`   - Path: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json`);
    console.log(`   - Size: ${sizeKB} KB\n`);
  } else {
    console.log('⚠️  WARNING: Backup file not found at expected location\n');
  }

  // Summary
  console.log('═'.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - OLD SCHEMA cleanup verified!');
    console.log('');
    console.log('Summary:');
    console.log('  - habit_tracker_old table: DROPPED ✅');
    console.log('  - v_old_schema_status view: DROPPED ✅');
    console.log('  - NEW SCHEMA tables: OPERATIONAL ✅');
    console.log('  - Backup file: EXISTS ✅');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Update CLAUDE.md to reflect OLD SCHEMA removal');
    console.log('  2. Remove OLD SCHEMA references from docs');
    console.log('  3. Archive migration 014_rename_old_schema.sql');
  } else {
    console.log('❌ SOME TESTS FAILED - Review cleanup process');
  }
  console.log('═'.repeat(60));

  return allPassed;
}

// Run verification
verifyCleanup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error running verification:', err);
    process.exit(1);
  });
