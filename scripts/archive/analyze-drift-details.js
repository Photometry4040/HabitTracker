#!/usr/bin/env node

/**
 * Analyze drift details - find exactly which records are missing
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE credentials in .env')
  process.exit(1)
}

// Import Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🔍 Analyzing Drift Details...\n')

// Fetch all old schema records
const { data: oldRecords, error: oldError } = await supabase
  .from('habit_tracker')
  .select('*')
  .order('week_start_date', { ascending: true })

if (oldError) {
  console.error('❌ Failed to fetch old schema:', oldError)
  process.exit(1)
}

console.log(`📊 Old schema: ${oldRecords.length} records\n`)

// Fetch all children
const { data: children, error: childrenError } = await supabase
  .from('children')
  .select('*')

if (childrenError) {
  console.error('❌ Failed to fetch children:', childrenError)
  process.exit(1)
}

// Create child name to ID map
const childMap = {}
children.forEach(child => {
  childMap[child.name] = child.id
})

// Fetch all new schema weeks
const { data: newWeeks, error: weeksError } = await supabase
  .from('weeks')
  .select('*')
  .order('week_start_date', { ascending: true })

if (weeksError) {
  console.error('❌ Failed to fetch new schema weeks:', weeksError)
  process.exit(1)
}

console.log(`📊 New schema: ${newWeeks.length} weeks\n`)

// Create lookup map for new weeks
const newWeeksMap = {}
newWeeks.forEach(week => {
  const childName = children.find(c => c.id === week.child_id)?.name
  if (childName) {
    const key = `${childName}-${week.week_start_date}`
    newWeeksMap[key] = week
  }
})

// Find missing records
console.log('🔍 Analyzing missing records...\n')
console.log('=' .repeat(80))

const missing = []
const present = []

oldRecords.forEach(oldRecord => {
  const key = `${oldRecord.child_name}-${oldRecord.week_start_date}`
  const newWeek = newWeeksMap[key]

  const startDate = new Date(oldRecord.week_start_date)
  const dayOfWeek = startDate.getDay() // 0 = Sunday, 1 = Monday
  const isSunday = dayOfWeek === 0

  if (!newWeek) {
    missing.push({
      child: oldRecord.child_name,
      date: oldRecord.week_start_date,
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      isSunday,
      theme: oldRecord.theme || '(empty)',
      habits: oldRecord.habits?.length || 0
    })
  } else {
    present.push({
      child: oldRecord.child_name,
      date: oldRecord.week_start_date,
      source: newWeek.source_version
    })
  }
})

console.log(`\n📊 Summary:`)
console.log(`  ✅ Present in new schema: ${present.length}`)
console.log(`  ❌ Missing in new schema: ${missing.length}`)

if (missing.length > 0) {
  console.log(`\n❌ Missing Records (${missing.length} total):\n`)
  console.log('┌────────┬────────────┬──────────────┬─────┬────────────────┬────────┐')
  console.log('│ Index  │ Child      │ Week Start   │ Day │ Theme          │ Habits │')
  console.log('├────────┼────────────┼──────────────┼─────┼────────────────┼────────┤')

  missing.forEach((record, i) => {
    const child = record.child.padEnd(10).substring(0, 10)
    const date = record.date.padEnd(12)
    const day = record.day.padEnd(3)
    const theme = record.theme.padEnd(14).substring(0, 14)
    const habits = String(record.habits).padStart(6)
    const dayMarker = record.isSunday ? '⚠️ ' : '   '

    console.log(`│ ${String(i + 1).padStart(6)} │ ${child} │ ${date} │ ${dayMarker}${day} │ ${theme} │ ${habits} │`)
  })
  console.log('└────────┴────────────┴──────────────┴─────┴────────────────┴────────┘')

  // Count by reason
  const sundayCount = missing.filter(r => r.isSunday).length
  const nonSundayCount = missing.filter(r => !r.isSunday).length

  console.log(`\n📊 Missing record breakdown:`)
  console.log(`  ⚠️  Sunday starts: ${sundayCount} (expected - Monday constraint)`)
  console.log(`  ❌ Non-Sunday missing: ${nonSundayCount} (unexpected!)`)
}

console.log(`\n✅ Present Records by Source:\n`)
const sourceCount = {}
present.forEach(r => {
  sourceCount[r.source] = (sourceCount[r.source] || 0) + 1
})

Object.entries(sourceCount).forEach(([source, count]) => {
  console.log(`  ${source}: ${count} records`)
})

console.log('\n' + '='.repeat(80))
console.log('✅ Analysis complete')
