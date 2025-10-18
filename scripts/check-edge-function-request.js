#!/usr/bin/env node

/**
 * Check the request data sent to Edge Function for the latest create_week operation
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

console.log('🔍 Checking Edge Function request data...\n')

// Get latest create_week operation
const { data: logs, error } = await supabase
  .from('idempotency_log')
  .select('*')
  .eq('operation', 'create_week')
  .order('created_at', { ascending: false })
  .limit(1)

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

if (!logs || logs.length === 0) {
  console.log('❌ No create_week operations found')
  process.exit(0)
}

const log = logs[0]

console.log('📋 Latest create_week operation:\n')
console.log(`Key: ${log.key}`)
console.log(`Status: ${log.status}`)
console.log(`Created: ${new Date(log.created_at).toLocaleString()}`)
console.log(`\n📦 Request Data:`)
console.log(JSON.stringify(log.request_data, null, 2))
console.log(`\n✅ Response Data:`)
console.log(JSON.stringify(log.response_data, null, 2))

// Analyze the request
const req = log.request_data
console.log(`\n🔍 Analysis:`)
console.log(`  Child name: ${req.child_name}`)
console.log(`  Week start: ${req.week_start_date}`)
console.log(`  Theme: ${req.theme || '(empty)'}`)
console.log(`  Habits count: ${req.habits?.length || 0}`)

if (req.habits && req.habits.length > 0) {
  console.log(`\n  Habits:`)
  req.habits.forEach((habit, i) => {
    console.log(`    ${i + 1}. ${habit.name}`)
    console.log(`       ID: ${habit.id}`)
    console.log(`       Times: [${habit.times?.join(', ') || 'none'}]`)
  })
} else {
  console.log(`\n  ⚠️  No habits in request data!`)
}

console.log('\n✅ Check complete')
