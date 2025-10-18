#!/usr/bin/env node

/**
 * Check current RLS status for all tables
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

// Import Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🔒 Checking RLS Status for Phase 2 Tables...\n')

const tables = [
  'children',
  'weeks',
  'habits',
  'habit_records',
  'habit_templates',
  'notifications'
]

console.log('📊 Target Tables:')
tables.forEach((table, i) => {
  console.log(`  ${i + 1}. ${table}`)
})
console.log()

// Check RLS status by attempting to query each table
console.log('🔍 Testing RLS Status:\n')

for (const table of tables) {
  try {
    // Try to query the table
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`${table}:`)
      console.log(`  ❌ Error: ${error.message}`)
      console.log(`  🔒 RLS Status: LIKELY ENABLED (query failed)`)
    } else {
      console.log(`${table}:`)
      console.log(`  ✅ Query successful`)
      console.log(`  📊 Record count: ${count || 0}`)
      console.log(`  🔓 RLS Status: DISABLED or PERMISSIVE POLICIES`)
    }
    console.log()
  } catch (e) {
    console.log(`${table}:`)
    console.log(`  ❌ Exception: ${e.message}`)
    console.log()
  }
}

console.log('━'.repeat(80))
console.log('💡 Interpretation:')
console.log('  ✅ Query successful → RLS disabled OR permissive policies (allow all)')
console.log('  ❌ Query failed → RLS enabled with restrictive policies')
console.log('━'.repeat(80))

console.log('\n📝 Next Step: Run RLS activation script if needed')
console.log('   File: scripts/phase2-rls-activation.sql')
