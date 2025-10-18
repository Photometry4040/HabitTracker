#!/usr/bin/env node

/**
 * Test habit insert to find the issue
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
const { createClient} = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🧪 Testing habit insert...\n')

// Get the latest week for "test" child
const { data: child } = await supabase
  .from('children')
  .select('id')
  .eq('name', 'test')
  .single()

if (!child) {
  console.error('❌ Child "test" not found')
  process.exit(1)
}

const { data: week } = await supabase
  .from('weeks')
  .select('id, week_start_date')
  .eq('child_id', child.id)
  .eq('week_start_date', '2025-10-20')
  .single()

if (!week) {
  console.error('❌ Week 2025-10-20 not found')
  process.exit(1)
}

console.log(`✅ Found week: ${week.id}`)
console.log(`   Week start: ${week.week_start_date}`)

// Try to insert a habit
console.log(`\n🧪 Attempting to insert a test habit...`)

const { data: habit, error } = await supabase
  .from('habits')
  .insert({
    week_id: week.id,
    name: '테스트 습관',
    display_order: 0,
    source_version: 'dual_write'
  })
  .select()
  .single()

if (error) {
  console.error('❌ Failed to insert habit:')
  console.error(JSON.stringify(error, null, 2))
} else {
  console.log('✅ Successfully inserted habit:')
  console.log(JSON.stringify(habit, null, 2))

  // Clean up - delete the test habit
  const { error: deleteError } = await supabase
    .from('habits')
    .delete()
    .eq('id', habit.id)

  if (deleteError) {
    console.warn('⚠️  Failed to delete test habit:', deleteError.message)
  } else {
    console.log('✅ Test habit deleted')
  }
}

console.log('\n✅ Test complete')
