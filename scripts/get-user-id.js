#!/usr/bin/env node

/**
 * Get User ID Helper Script
 * Helps identify which user_id to use for data migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 User ID Helper\n');

async function listAllUsers() {
  console.log('📋 Checking for existing users...\n');

  // Try to list users (requires service role, will fail with anon key)
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.log('⚠️  Cannot list users with anon key (this is normal)\n');
    console.log('📌 To get your User ID:\n');
    console.log('Option 1: From Web App');
    console.log('  1. Open http://localhost:5173/');
    console.log('  2. Login with your email/password');
    console.log('  3. Open browser console (F12)');
    console.log('  4. Run this command:');
    console.log('     const { data: { user } } = await window.supabase.auth.getUser();');
    console.log('     console.log("User ID:", user.id);');
    console.log('');
    console.log('Option 2: Create New User');
    console.log('  1. Open http://localhost:5173/');
    console.log('  2. Click "회원가입" (Sign up)');
    console.log('  3. Enter email: test@example.com');
    console.log('  4. Enter password: testpassword123');
    console.log('  5. After signup, follow Option 1 to get User ID');
    console.log('');
    console.log('Option 3: Check Supabase Dashboard');
    console.log('  1. Go to https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/auth/users');
    console.log('  2. Find your user in the list');
    console.log('  3. Click on the user to see their UUID');
    console.log('');
    return;
  }

  if (users && users.length > 0) {
    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email || 'No email'}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });
    console.log('💡 Copy one of the User IDs above to use with:');
    console.log('   node scripts/add-user-id-to-existing-data.js <USER_ID>');
  } else {
    console.log('⚠️  No users found. Create one first:\n');
    console.log('1. Open http://localhost:5173/');
    console.log('2. Click "회원가입" (Sign up)');
    console.log('3. Enter email and password');
    console.log('4. Run this script again');
  }
}

async function checkCurrentSession() {
  console.log('🔐 Checking current session...\n');

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('⚠️  No active session (expected - this script uses anon key)\n');
    return null;
  }

  console.log('✅ Active session found:');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Email: ${user.email || 'No email'}\n`);
  return user;
}

async function suggestNextSteps() {
  console.log('═'.repeat(60));
  console.log('NEXT STEPS');
  console.log('═'.repeat(60));
  console.log('');
  console.log('1. Get your User ID using one of the options above');
  console.log('2. Run: node scripts/add-user-id-to-existing-data.js <USER_ID>');
  console.log('3. Verify: node scripts/check-database-status.js');
  console.log('4. Test web app: http://localhost:5173/');
  console.log('');
}

async function main() {
  await checkCurrentSession();
  await listAllUsers();
  await suggestNextSteps();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
