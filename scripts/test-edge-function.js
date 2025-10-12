#!/usr/bin/env node

/**
 * Edge Function Test Script
 * Tests all dual-write operations: create, update, delete, verify
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Read environment variables from .env
let supabaseUrl, supabaseAnonKey, userId;
try {
  const envFile = readFileSync('.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }

  // User ID for testing (replace with your actual user ID)
  userId = process.env.USER_ID || 'fc24adf2-a7af-4fbf-abe0-c332bb48b02b';
} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

const edgeFunctionUrl = `${supabaseUrl}/functions/v1/dual-write-habit`;

console.log('🧪 Edge Function Test Suite\n');
console.log(`URL: ${edgeFunctionUrl}`);
console.log(`User ID: ${userId}\n`);

// Test data
const testChildName = 'EdgeFunction테스트';
const testWeekStart = '2025-10-27'; // Monday (corrected)

/**
 * Call Edge Function
 */
async function callEdgeFunction(operation, data) {
  const idempotencyKey = `test-${operation}-${randomUUID()}`;

  console.log(`\n📤 Calling: ${operation}`);
  console.log(`Idempotency Key: ${idempotencyKey}`);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ operation, data })
  });

  const result = await response.json();

  if (response.ok) {
    console.log(`✅ Success (${response.status})`);
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } else {
    console.error(`❌ Failed (${response.status})`);
    console.error('Error:', JSON.stringify(result, null, 2));
    throw new Error(`Operation failed: ${result.error || 'Unknown error'}`);
  }
}

/**
 * Test 1: Create Week
 */
async function testCreateWeek() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Create Week');
  console.log('='.repeat(60));

  const data = {
    user_id: userId,
    child_name: testChildName,
    week_start_date: testWeekStart,
    habits: [
      {
        id: 1,
        name: '양치하기',
        times: ['green', 'yellow', '', '', '', '', '']
      },
      {
        id: 2,
        name: '책읽기',
        times: ['green', 'green', 'red', '', '', '', '']
      }
    ],
    theme: '테스트 주간',
    reflection: null,
    reward: null
  };

  const result = await callEdgeFunction('create_week', data);

  console.log('\n📊 Verification:');
  console.log(`  Old ID: ${result.result.old_id}`);
  console.log(`  New Week ID: ${result.result.new_week_id}`);
  console.log(`  Child ID: ${result.result.child_id}`);
  console.log(`  Habits Created: ${result.result.habits_created}`);

  return result;
}

/**
 * Test 2: Update Habit Record
 */
async function testUpdateHabitRecord() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Update Habit Record');
  console.log('='.repeat(60));

  const data = {
    child_name: testChildName,
    week_start_date: testWeekStart,
    habit_name: '양치하기',
    day_index: 2, // Tuesday (3rd day)
    status: 'green'
  };

  const result = await callEdgeFunction('update_habit_record', data);

  console.log('\n📊 Verification:');
  console.log(`  Old Updated: ${result.result.old_updated}`);
  console.log(`  New Updated: ${result.result.new_updated}`);
  console.log(`  Record ID: ${result.result.record_id}`);

  return result;
}

/**
 * Test 3: Verify Consistency
 */
async function testVerifyConsistency() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Verify Consistency');
  console.log('='.repeat(60));

  const result = await callEdgeFunction('verify_consistency', {});

  console.log('\n📊 Consistency Report:');
  console.log(`  Consistent: ${result.result.consistent ? '✅ YES' : '❌ NO'}`);
  console.log(`  Drift Rate: ${(result.result.drift_rate * 100).toFixed(2)}%`);
  console.log(`  Old Weeks: ${result.result.stats.old_weeks}`);
  console.log(`  New Weeks: ${result.result.stats.new_weeks}`);
  console.log(`  Sample Checked: ${result.result.stats.checked}`);
  console.log(`  Mismatches: ${result.result.stats.mismatches}`);

  if (result.result.issues.length > 0) {
    console.log(`\n⚠️  Issues Found: ${result.result.issues.length}`);
    result.result.issues.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity}] ${issue.type}`);
    });
  }

  console.log('\nSource Versions:');
  for (const [version, count] of Object.entries(result.result.source_versions)) {
    console.log(`  ${version}: ${count}`);
  }

  return result;
}

/**
 * Test 4: Delete Week (Cleanup)
 */
async function testDeleteWeek() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Delete Week (Cleanup)');
  console.log('='.repeat(60));

  const data = {
    child_name: testChildName,
    week_start_date: testWeekStart
  };

  const result = await callEdgeFunction('delete_week', data);

  console.log('\n📊 Deletion Report:');
  console.log(`  Old Deleted: ${result.result.old_deleted ? '✅ YES' : '❌ NO'}`);
  console.log(`  New Deleted: ${result.result.new_deleted ? '✅ YES' : '❌ NO'}`);
  console.log(`  Cascaded Records: ${result.result.cascade_count}`);

  return result;
}

/**
 * Test 5: Idempotency Test
 */
async function testIdempotency() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Idempotency Test');
  console.log('='.repeat(60));

  const idempotencyKey = `test-idempotency-${randomUUID()}`;

  const data = {
    user_id: userId,
    child_name: 'Idempotency테스트',
    week_start_date: '2025-11-04', // Next Monday
    habits: [{ id: 1, name: '테스트습관', times: ['green', '', '', '', '', '', ''] }]
  };

  console.log('\n📤 Request 1 (original):');
  const response1 = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ operation: 'create_week', data })
  });

  const result1 = await response1.json();
  console.log(`✅ Response 1: ${response1.status}`, result1.success ? 'SUCCESS' : 'FAILED');

  console.log('\n📤 Request 2 (duplicate with same key):');
  const response2 = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey // Same key!
    },
    body: JSON.stringify({ operation: 'create_week', data })
  });

  const result2 = await response2.json();
  console.log(`✅ Response 2: ${response2.status}`, result2.cached ? 'CACHED (Idempotent)' : 'NEW');

  if (result2.cached) {
    console.log('\n✅ Idempotency test PASSED: Duplicate request was cached');
  } else {
    console.error('\n❌ Idempotency test FAILED: Duplicate request was not cached');
  }

  // Cleanup
  await callEdgeFunction('delete_week', {
    child_name: 'Idempotency테스트',
    week_start_date: '2025-11-04'
  });
}

/**
 * Main Test Runner
 */
async function runTests() {
  const startTime = Date.now();
  let passedTests = 0;
  const totalTests = 5;

  try {
    // Test 1: Create
    await testCreateWeek();
    passedTests++;

    // Test 2: Update
    await testUpdateHabitRecord();
    passedTests++;

    // Test 3: Verify
    await testVerifyConsistency();
    passedTests++;

    // Test 4: Delete
    await testDeleteWeek();
    passedTests++;

    // Test 5: Idempotency
    await testIdempotency();
    passedTests++;

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Status: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(60));

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
