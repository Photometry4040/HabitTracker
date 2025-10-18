#!/usr/bin/env node

/**
 * Verify table rename: habit_tracker → habit_tracker_old
 *
 * This script checks if the migration was successful
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
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🔍 Verifying table rename: habit_tracker → habit_tracker_old\n')
console.log('================================================================================\n')

// Check 1: habit_tracker should NOT exist
console.log('📊 Check 1: Verifying habit_tracker does NOT exist...\n')

const { data: oldTableCheck, error: oldTableError } = await supabase
  .from('habit_tracker')
  .select('id')
  .limit(1)

if (oldTableError) {
  if (oldTableError.message.includes('relation "public.habit_tracker" does not exist')) {
    console.log('   ✅ habit_tracker table does NOT exist (expected after rename)\n')
  } else {
    console.log(`   ⚠️  Unexpected error: ${oldTableError.message}\n`)
  }
} else {
  console.log('   ❌ habit_tracker table still EXISTS (migration not run yet)\n')
  console.log('   ℹ️  Please run the SQL migration in Supabase Dashboard\n')
  process.exit(0)
}

// Check 2: v_old_schema_status view should exist
console.log('📊 Check 2: Checking monitoring view...\n')

const { data: viewData, error: viewError } = await supabase
  .from('v_old_schema_status')
  .select('*')

if (viewError) {
  console.log(`   ❌ View does not exist or error: ${viewError.message}\n`)
  console.log('   ℹ️  Migration may not have been run yet\n')
  process.exit(0)
} else if (viewData && viewData.length > 0) {
  console.log('   ✅ Monitoring view exists\n')

  const status = viewData[0]
  console.log('   📊 Archive Status:')
  console.log(`      Table: ${status.table_name}`)
  console.log(`      Records: ${status.record_count}`)
  console.log(`      Children: ${status.unique_children}`)
  console.log(`      Total Habits: ${status.total_habits}`)
  console.log(`      Date Range: ${status.earliest_week} ~ ${status.latest_week}`)
  console.log(`      Checked At: ${new Date(status.checked_at).toLocaleString('ko-KR')}\n`)

  // Verify counts
  if (status.record_count === 34) {
    console.log('   ✅ Record count matches backup (34)\n')
  } else {
    console.log(`   ⚠️  Record count mismatch: expected 34, got ${status.record_count}\n`)
  }

  if (status.unique_children === 6) {
    console.log('   ✅ Children count matches backup (6)\n')
  } else {
    console.log(`   ⚠️  Children count mismatch: expected 6, got ${status.unique_children}\n`)
  }
}

// Check 3: NEW SCHEMA should still work
console.log('📊 Check 3: Verifying NEW SCHEMA still works...\n')

const { data: weeks, error: weeksError } = await supabase
  .from('weeks')
  .select('id')
  .limit(1)

if (weeksError) {
  console.log(`   ❌ Error accessing weeks table: ${weeksError.message}\n`)
} else {
  console.log('   ✅ NEW SCHEMA (weeks table) is accessible\n')
}

const { count: weeksCount } = await supabase
  .from('weeks')
  .select('*', { count: 'exact', head: true })

console.log(`   ℹ️  Current weeks count: ${weeksCount}\n`)

// Final summary
console.log('================================================================================\n')
console.log('📋 Verification Summary:\n')

const migrationComplete = oldTableError && viewData && viewData.length > 0
const countsMatch = viewData && viewData[0]?.record_count === 34 && viewData[0]?.unique_children === 6
const newSchemaWorks = !weeksError

console.log(`   1. Migration complete: ${migrationComplete ? '✅' : '❌ (not run yet)'}`);
console.log(`   2. Archive counts correct: ${countsMatch ? '✅' : '⚠️ '}`);
console.log(`   3. NEW SCHEMA works: ${newSchemaWorks ? '✅' : '❌'}`);

if (migrationComplete && countsMatch && newSchemaWorks) {
  console.log('\n🎉 Table rename verified successfully!')
  console.log('   - habit_tracker renamed to habit_tracker_old')
  console.log('   - Monitoring view created')
  console.log('   - NEW SCHEMA still functional')
  console.log('\n📋 Next Steps:')
  console.log('   1. Test web app (http://localhost:5173)')
  console.log('   2. Start 1-week monitoring period')
  console.log('   3. Daily checks using: SELECT * FROM v_old_schema_status;\n')
} else if (!migrationComplete) {
  console.log('\n⏳ Migration not run yet')
  console.log('\n📋 To execute migration:')
  console.log('   1. Go to: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql')
  console.log('   2. Copy SQL from: supabase/migrations/014_rename_old_schema.sql')
  console.log('   3. Execute and verify\n')
} else {
  console.log('\n⚠️  Verification incomplete - please check the issues above\n')
}

console.log('✅ Verification script complete\n')
