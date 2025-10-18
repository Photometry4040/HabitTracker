#!/usr/bin/env node

/**
 * Enable RLS on all 6 tables programmatically
 * Phase 2 Day 4
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const SUPABASE_URL = envVars.VITE_SUPABASE_URL
const SUPABASE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_KEY.includes('service_role')) {
  console.error('❌ ERROR: SERVICE_ROLE_KEY required for RLS activation')
  console.error('   Please set VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
  console.error('   Get it from: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/settings/api')
  process.exit(1)
}

// Import Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🔒 Phase 2 Day 4: RLS Activation\n')

const tables = [
  'children',
  'weeks',
  'habits',
  'habit_records',
  'habit_templates',
  'notifications'
]

console.log('📋 Tables to enable RLS:')
tables.forEach((table, i) => {
  console.log(`  ${i + 1}. ${table}`)
})
console.log()

// Function to execute SQL
async function executeSql(sql, description) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.log(`  ❌ ${description}: ${error.message}`)
      return false
    }

    console.log(`  ✅ ${description}`)
    return true
  } catch (e) {
    console.log(`  ❌ ${description}: ${e.message}`)
    return false
  }
}

console.log('⚠️  IMPORTANT: This script will enable RLS on all tables!')
console.log('   Web app MUST use authenticated user sessions.')
console.log('   Edge Functions use SERVICE_ROLE_KEY (bypass RLS).')
console.log()

console.log('📊 Step 1: Check current RLS status\n')

for (const table of tables) {
  const { data, error } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', table)
    .single()

  if (data) {
    const status = data.rowsecurity ? '🔒 ENABLED' : '🔓 DISABLED'
    console.log(`  ${table}: ${status}`)
  }
}

console.log()
console.log('━'.repeat(80))
console.log('🚀 Starting RLS Activation...')
console.log('━'.repeat(80))
console.log()

let successCount = 0

for (const table of tables) {
  console.log(`Activating RLS on: ${table}`)

  const sql = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`

  const success = await executeSql(sql, `RLS enabled`)

  if (success) {
    successCount++

    // Verify policies exist
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', table)

    console.log(`  📝 Policies: ${policies?.length || 0} found`)
  }

  console.log()
}

console.log('━'.repeat(80))
console.log(`✅ RLS Activation Complete: ${successCount}/${tables.length} tables`)
console.log('━'.repeat(80))
console.log()

// Final verification
console.log('📊 Final Verification:\n')

for (const table of tables) {
  const { data } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', table)
    .single()

  if (data) {
    const icon = data.rowsecurity ? '✅' : '❌'
    const status = data.rowsecurity ? 'ENABLED' : 'DISABLED'
    console.log(`  ${icon} ${table}: ${status}`)
  }
}

console.log()
console.log('🎯 Next Steps:')
console.log('  1. Test web app: http://localhost:5173')
console.log('  2. Verify data loads correctly (authenticated users)')
console.log('  3. Run performance test: node scripts/test-rls-performance.js')
console.log('  4. Document results in: docs/02-active/PHASE_2_DAY_4_COMPLETE.md')
