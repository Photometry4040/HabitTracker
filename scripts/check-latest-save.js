#!/usr/bin/env node

/**
 * Check the latest saved week for "test" child
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

console.log('🔍 Checking latest save for "test" child...\n')

// Check OLD SCHEMA
console.log('📊 OLD SCHEMA (habit_tracker):')
const { data: oldRecords, error: oldError } = await supabase
  .from('habit_tracker')
  .select('*')
  .eq('child_name', 'test')
  .order('created_at', { ascending: false })
  .limit(3)

if (oldError) {
  console.error('❌ Error:', oldError)
} else {
  console.log(`  Total records: ${oldRecords.length}`)
  oldRecords.forEach((record, i) => {
    console.log(`\n  Record ${i + 1}:`)
    console.log(`    ID: ${record.id}`)
    console.log(`    Week Start: ${record.week_start_date}`)
    console.log(`    Theme: ${record.theme || '(empty)'}`)
    console.log(`    Habits: ${record.habits?.length || 0}`)
    console.log(`    Created: ${new Date(record.created_at).toLocaleString()}`)
  })
}

// Check NEW SCHEMA
console.log('\n\n📊 NEW SCHEMA (weeks):')

// First get child_id for "test"
const { data: child } = await supabase
  .from('children')
  .select('id, name')
  .eq('name', 'test')
  .single()

if (!child) {
  console.log('  ❌ Child "test" not found')
} else {
  console.log(`  Child ID: ${child.id}`)

  const { data: newWeeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .eq('child_id', child.id)
    .order('created_at', { ascending: false })
    .limit(3)

  if (weeksError) {
    console.error('❌ Error:', weeksError)
  } else {
    console.log(`  Total weeks: ${newWeeks.length}`)

    for (const week of newWeeks) {
      console.log(`\n  Week:`)
      console.log(`    ID: ${week.id}`)
      console.log(`    Week Start: ${week.week_start_date}`)
      console.log(`    Theme: ${week.theme || '(empty)'}`)
      console.log(`    Source: ${week.source_version}`)
      console.log(`    Created: ${new Date(week.created_at).toLocaleString()}`)

      // Get habits for this week
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('week_id', week.id)

      console.log(`    Habits: ${habits?.length || 0}`)
      if (habits && habits.length > 0) {
        habits.forEach(h => console.log(`      - ${h.name}`))
      }
    }
  }
}

console.log('\n✅ Check complete')
