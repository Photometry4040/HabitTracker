#!/usr/bin/env node

/**
 * Verification Script: RLS Status Checker
 * Purpose: Verify that RLS is properly enabled on all core tables
 * Usage: node scripts/verify-rls-status.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables not set');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const coreTables = ['children', 'weeks', 'habits', 'habit_records', 'idempotency_log'];

async function checkRLSStatus() {
  console.log('\n📊 RLS Status Verification Report');
  console.log('=' .repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Query RLS status for each table
    const { data, error } = await supabase.rpc('check_rls_status', {
      table_names: coreTables
    }).catch(() => {
      // If RPC doesn't exist, use direct SQL query
      return null;
    });

    if (data) {
      console.log('✅ RLS Status Summary:\n');
      let allEnabled = true;

      for (const table of coreTables) {
        const tableStatus = data.find(t => t.table === table);
        if (tableStatus && tableStatus.rls_enabled) {
          console.log(`  ✅ ${table.padEnd(20)} - RLS ENABLED`);
        } else {
          console.log(`  ❌ ${table.padEnd(20)} - RLS DISABLED`);
          allEnabled = false;
        }
      }

      console.log('\n' + '='.repeat(60));
      if (allEnabled) {
        console.log('✅ All core tables have RLS properly enabled!\n');
        return true;
      } else {
        console.log('❌ Some tables are missing RLS. Please enable RLS on all tables.\n');
        return false;
      }
    }

    // Fallback: Manual verification via SQL
    console.log('🔍 Checking RLS status via SQL query...\n');

    const { data: rls, error: sqlError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', coreTables)
      .eq('schemaname', 'public');

    if (sqlError) {
      console.error('❌ Error checking RLS status:', sqlError.message);
      return false;
    }

    if (!rls) {
      console.log('⚠️  Direct SQL query not available via REST API');
      console.log('   Please check RLS status in Supabase dashboard → SQL Editor\n');
      return null;
    }

    console.log('✅ RLS Status Summary:\n');
    let allEnabled = true;

    for (const table of coreTables) {
      const found = rls.find(t => t.tablename === table);
      if (found && found.rowsecurity) {
        console.log(`  ✅ ${table.padEnd(20)} - RLS ENABLED`);
      } else {
        console.log(`  ❌ ${table.padEnd(20)} - RLS DISABLED`);
        allEnabled = false;
      }
    }

    console.log('\n' + '='.repeat(60));
    if (allEnabled) {
      console.log('✅ All core tables have RLS properly enabled!\n');
      return true;
    } else {
      console.log('❌ Some tables are missing RLS. Please enable RLS on all tables.\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('\n📝 To verify RLS status manually:');
    console.log('   1. Go to Supabase Dashboard');
    console.log('   2. SQL Editor → New Query');
    console.log('   3. Run:');
    console.log('      SELECT tablename, rowsecurity');
    console.log("      FROM pg_tables");
    console.log("      WHERE tablename IN ('children', 'weeks', 'habits', 'habit_records', 'idempotency_log')");
    console.log("      AND schemaname = 'public';");
    console.log('   4. All should show rowsecurity = true\n');
    return false;
  }
}

async function checkRLSPolicies() {
  console.log('\n📋 RLS Policies Verification');
  console.log('=' .repeat(60));

  try {
    // Check for each table
    for (const table of coreTables) {
      const { data, error } = await supabase
        .from('pg_policies')
        .select('schemaname, tablename, policyname, cmd')
        .eq('tablename', table);

      if (error) {
        console.log(`⚠️  ${table}: Unable to verify policies via REST API`);
        continue;
      }

      const policyCount = data ? data.length : 0;
      if (policyCount > 0) {
        console.log(`  ✅ ${table.padEnd(20)} - ${policyCount} policies defined`);
      } else {
        console.log(`  ⚠️  ${table.padEnd(20)} - No policies found`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.log('⚠️  Policy verification requires manual check in Supabase dashboard\n');
  }
}

async function generateReport() {
  const rls = await checkRLSStatus();
  await checkRLSPolicies();

  console.log('📝 Verification Summary:');
  console.log('=' .repeat(60));

  if (rls === true) {
    console.log('✅ RLS is properly configured and production-ready\n');
    console.log('Next steps:');
    console.log('  1. Monitor idempotency_log for user_id values');
    console.log('  2. Test user isolation with multiple user accounts');
    console.log('  3. Deploy application with RLS enforced\n');
  } else if (rls === false) {
    console.log('❌ RLS configuration incomplete\n');
    console.log('Required actions:');
    console.log('  1. Enable RLS on all core tables via Supabase dashboard');
    console.log('  2. Verify RLS policies are created for each table');
    console.log('  3. Run this script again to confirm\n');
  } else {
    console.log('⚠️  Manual verification needed in Supabase dashboard\n');
  }

  console.log('Documentation:');
  console.log('  - Architecture: docs/01-architecture/CURRENT_ARCHITECTURE.md');
  console.log('  - Security: docs/03-deployment/SECURITY_POLICIES.md');
  console.log('  - RLS Guide: https://supabase.com/docs/guides/auth/row-level-security\n');
}

generateReport().catch(console.error);
