#!/usr/bin/env node

/**
 * Database Status Check Script
 * Verifies Supabase connection and data availability
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env
let supabaseUrl, supabaseAnonKey;
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
} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Supabase Database Status Check\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

async function checkConnection() {
  console.log('📡 Testing connection...');

  try {
    const { data, error } = await supabase
      .from('habit_tracker')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Connection successful\n');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function checkOldSchema() {
  console.log('📊 Checking OLD SCHEMA (habit_tracker)...\n');

  try {
    // Count records
    const { count, error: countError } = await supabase
      .from('habit_tracker')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting records:', countError.message);
      return;
    }

    console.log(`  Total records: ${count}`);

    // Get sample records
    const { data, error } = await supabase
      .from('habit_tracker')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching records:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log(`  Sample records: ${data.length}\n`);

      data.forEach((record, i) => {
        console.log(`  Record ${i + 1}:`);
        console.log(`    ID: ${record.id}`);
        console.log(`    Child: ${record.child_name}`);
        console.log(`    Week: ${record.week_period}`);
        console.log(`    Week Start: ${record.week_start_date}`);
        console.log(`    Has user_id: ${record.user_id ? 'YES (' + record.user_id + ')' : 'NO'}`);
        console.log(`    Habits: ${record.habits ? record.habits.length : 0}`);
        console.log('');
      });
    } else {
      console.log('  ⚠️  No records found\n');
    }

  } catch (err) {
    console.error('❌ Error checking old schema:', err.message);
  }
}

async function checkNewSchema() {
  console.log('📊 Checking NEW SCHEMA...\n');

  try {
    // Check each table
    const tables = ['children', 'weeks', 'habits', 'habit_records'];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} records`);
      }
    }

    console.log('');

    // Get sample children
    const { data: children } = await supabase
      .from('children')
      .select('*')
      .limit(5);

    if (children && children.length > 0) {
      console.log('  Sample children:');
      children.forEach(child => {
        console.log(`    - ${child.name} (ID: ${child.id.substring(0, 8)}...)`);
      });
      console.log('');
    }

  } catch (err) {
    console.error('❌ Error checking new schema:', err.message);
  }
}

async function checkAuth() {
  console.log('🔐 Checking authentication...\n');

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('  ⚠️  No user logged in (this is normal for anon key)');
      console.log('  💡 App requires user login to load data\n');
      return null;
    }

    console.log(`  ✅ User logged in: ${user.email || user.id}`);
    console.log('');
    return user;

  } catch (err) {
    console.log('  ⚠️  Auth check failed (expected with anon key)\n');
    return null;
  }
}

async function checkIdempotencyLog() {
  console.log('📝 Checking idempotency_log...\n');

  try {
    const { count, error: countError } = await supabase
      .from('idempotency_log')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`  ⚠️  Table may not exist yet: ${countError.message}`);
      console.log('  💡 Deploy migration 013 to create this table\n');
      return;
    }

    console.log(`  Total logs: ${count}`);

    // Get recent logs
    const { data, error } = await supabase
      .from('idempotency_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log(`  ❌ Error fetching logs: ${error.message}\n`);
      return;
    }

    if (data && data.length > 0) {
      console.log(`  Recent operations:\n`);
      data.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.operation} - ${log.status}`);
        console.log(`     Key: ${log.key}`);
        console.log(`     Time: ${new Date(log.created_at).toLocaleString()}`);
      });
      console.log('');
    } else {
      console.log('  No operations logged yet\n');
    }

  } catch (err) {
    console.error('  ❌ Error checking idempotency log:', err.message, '\n');
  }
}

async function main() {
  const connected = await checkConnection();

  if (!connected) {
    console.log('\n❌ Cannot proceed - connection failed');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.log('   2. Verify Supabase project is active');
    console.log('   3. Check network connection');
    process.exit(1);
  }

  await checkAuth();
  await checkOldSchema();
  await checkNewSchema();
  await checkIdempotencyLog();

  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log('✅ Connection: Working');
  console.log('📊 Old Schema: Check output above');
  console.log('📊 New Schema: Check output above');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. If old schema has 0 records: Run backfill scripts');
  console.log('   2. If auth shows no user: Login via web app first');
  console.log('   3. To test Edge Function: npx supabase functions deploy dual-write-habit');
  console.log('   4. To run tests: node scripts/test-edge-function.js');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
