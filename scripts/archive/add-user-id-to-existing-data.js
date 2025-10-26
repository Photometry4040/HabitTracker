#!/usr/bin/env node

/**
 * Add user_id to existing habit_tracker records
 * This script updates all records without user_id
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables
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

  userId = process.env.USER_ID || process.argv[2];

  if (!userId) {
    console.error('❌ USER_ID required');
    console.log('\nUsage:');
    console.log('  USER_ID=your-uuid node scripts/add-user-id-to-existing-data.js');
    console.log('  OR');
    console.log('  node scripts/add-user-id-to-existing-data.js your-uuid');
    console.log('\nExample:');
    console.log('  node scripts/add-user-id-to-existing-data.js fc24adf2-a7af-4fbf-abe0-c332bb48b02b');
    process.exit(1);
  }

} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔧 Adding user_id to existing habit_tracker records\n');
console.log(`User ID: ${userId}\n`);

async function addUserIdToRecords() {
  try {
    // 1. Check how many records need updating
    const { data: recordsWithoutUser, error: checkError } = await supabase
      .from('habit_tracker')
      .select('id, child_name, week_period')
      .is('user_id', null);

    if (checkError) {
      console.error('❌ Error checking records:', checkError.message);
      return;
    }

    const totalRecords = recordsWithoutUser?.length || 0;

    if (totalRecords === 0) {
      console.log('✅ All records already have user_id!');
      return;
    }

    console.log(`Found ${totalRecords} records without user_id\n`);

    // Show sample records
    console.log('Sample records to update:');
    recordsWithoutUser.slice(0, 5).forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.child_name} - ${record.week_period}`);
    });
    console.log('');

    // 2. Update all records
    console.log('⏳ Updating records...\n');

    const { data: updated, error: updateError } = await supabase
      .from('habit_tracker')
      .update({ user_id: userId })
      .is('user_id', null)
      .select();

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }

    console.log(`✅ Successfully updated ${updated?.length || 0} records\n`);

    // 3. Verify update
    const { count: remainingCount } = await supabase
      .from('habit_tracker')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    console.log('📊 Verification:');
    console.log(`  Records without user_id: ${remainingCount || 0}`);
    console.log(`  Records updated: ${updated?.length || 0}`);

    if (remainingCount === 0) {
      console.log('\n✅ All records now have user_id!');
    } else {
      console.log(`\n⚠️  ${remainingCount} records still missing user_id`);
    }

    // 4. Show sample updated records
    const { data: sampleUpdated } = await supabase
      .from('habit_tracker')
      .select('id, child_name, week_period, user_id')
      .eq('user_id', userId)
      .limit(5);

    if (sampleUpdated && sampleUpdated.length > 0) {
      console.log('\nSample updated records:');
      sampleUpdated.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.child_name} - user_id: ${record.user_id.substring(0, 8)}...`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function main() {
  console.log('⚠️  WARNING: This will update ALL habit_tracker records without user_id');
  console.log(`They will be assigned to user: ${userId}\n`);

  await addUserIdToRecords();

  console.log('\n✅ Done!');
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your web app (http://localhost:5173)');
  console.log('   2. Login with the user ID above');
  console.log('   3. You should now see your data!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
