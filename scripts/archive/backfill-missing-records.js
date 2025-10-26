// scripts/backfill-missing-records.js
// Phase 3 Day 1-2: Backfill missing 4 records to NEW SCHEMA

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
const envPath = join(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
// Use ANON_KEY for now (RLS is disabled, so it works)
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
  console.log('\n   ℹ️  Note: Using ANON_KEY (RLS is disabled)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Target records to backfill (excluding Sunday starts)
const TARGET_RECORDS = [
  { child_name: '이은지', week_start_date: '2025-07-22' },
  { child_name: '이영신', week_start_date: '2025-07-22' },
  { child_name: '이은지', week_start_date: '2025-07-29' },
  { child_name: '아빠', week_start_date: '2025-08-26' }
]

async function backfillSingleRecord(childName, weekStartDate) {
  console.log(`\n📦 Backfilling: ${childName} - ${weekStartDate}`)

  try {
    // 1. Get OLD SCHEMA data
    const { data: oldRecord, error: oldError } = await supabase
      .from('habit_tracker')
      .select('*')
      .eq('child_name', childName)
      .eq('week_start_date', weekStartDate)
      .single()

    if (oldError || !oldRecord) {
      console.error(`   ❌ Old record not found:`, oldError?.message)
      return { success: false, error: 'Old record not found' }
    }

    console.log(`   ✓ Found old record (id: ${oldRecord.id})`)
    console.log(`   ✓ Theme: ${oldRecord.theme || '(empty)'}`)
    console.log(`   ✓ Habits: ${oldRecord.habits?.length || 0}`)

    // 2. Get or create child in NEW SCHEMA
    let { data: child, error: childError } = await supabase
      .from('children')
      .select('id, user_id')
      .eq('name', childName)
      .maybeSingle()

    if (childError) {
      console.error(`   ❌ Error fetching child:`, childError.message)
      return { success: false, error: childError.message }
    }

    if (!child) {
      // Create child
      console.log(`   ℹ️  Creating child: ${childName}`)
      const { data: newChild, error: createError } = await supabase
        .from('children')
        .insert({
          name: childName,
          user_id: oldRecord.user_id || '00000000-0000-0000-0000-000000000000',
          created_at: oldRecord.created_at
        })
        .select()
        .single()

      if (createError) {
        console.error(`   ❌ Failed to create child:`, createError.message)
        return { success: false, error: createError.message }
      }

      child = newChild
      console.log(`   ✓ Created child (id: ${child.id})`)
    } else {
      console.log(`   ✓ Child exists (id: ${child.id})`)
    }

    // 3. Check if week already exists
    const { data: existingWeek } = await supabase
      .from('weeks')
      .select('id')
      .eq('child_id', child.id)
      .eq('week_start_date', weekStartDate)
      .maybeSingle()

    if (existingWeek) {
      console.log(`   ⚠️  Week already exists (id: ${existingWeek.id}) - skipping`)
      return { success: true, skipped: true, weekId: existingWeek.id }
    }

    // 4. Create week in NEW SCHEMA
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)

    const { data: newWeek, error: weekError } = await supabase
      .from('weeks')
      .insert({
        child_id: child.id,
        user_id: child.user_id,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate.toISOString().split('T')[0],
        theme: oldRecord.theme,
        reflection: oldRecord.reflection || {},
        reward: oldRecord.reward,
        source_version: 'backfill',
        created_at: oldRecord.created_at
      })
      .select()
      .single()

    if (weekError) {
      console.error(`   ❌ Failed to create week:`, weekError.message)
      return { success: false, error: weekError.message }
    }

    console.log(`   ✓ Created week (id: ${newWeek.id})`)

    // 5. Create habits
    const oldHabits = oldRecord.habits || []
    let habitsCreated = 0

    for (const [index, habit] of oldHabits.entries()) {
      const { data: habitRow, error: habitError } = await supabase
        .from('habits')
        .insert({
          week_id: newWeek.id,
          name: habit.name,
          time_period: habit.name.match(/^([^)]+\))/)?.[1] || null,
          display_order: index,
          created_at: oldRecord.created_at
        })
        .select()
        .single()

      if (habitError) {
        console.error(`   ❌ Failed to create habit "${habit.name}":`, habitError.message)
        continue
      }

      habitsCreated++
      console.log(`   ✓ Created habit: ${habit.name} (id: ${habitRow.id})`)

      // 6. Create habit_records (7 days)
      const times = habit.times || []
      const records = times.map((status, dayIndex) => {
        const recordDate = new Date(weekStartDate)
        recordDate.setDate(recordDate.getDate() + dayIndex)

        return {
          habit_id: habitRow.id,
          record_date: recordDate.toISOString().split('T')[0],
          status: status || 'none',
          created_at: oldRecord.created_at
        }
      })

      const { error: recordsError } = await supabase
        .from('habit_records')
        .insert(records)

      if (recordsError) {
        console.error(`   ❌ Failed to create habit_records:`, recordsError.message)
      } else {
        console.log(`   ✓ Created ${records.length} habit records`)
      }
    }

    console.log(`\n   ✅ Backfill complete!`)
    console.log(`      Week ID: ${newWeek.id}`)
    console.log(`      Habits created: ${habitsCreated}/${oldHabits.length}`)

    return {
      success: true,
      weekId: newWeek.id,
      habitsCreated,
      totalHabits: oldHabits.length
    }

  } catch (error) {
    console.error(`   ❌ Unexpected error:`, error)
    return { success: false, error: error.message }
  }
}

async function runBackfill() {
  console.log('🚀 Phase 3 Day 1-2: Backfill Missing Records\n')
  console.log('📋 Target: 4 records (excluding Sunday starts)\n')
  console.log('================================================================================\n')

  const results = []

  for (const record of TARGET_RECORDS) {
    const result = await backfillSingleRecord(record.child_name, record.week_start_date)
    results.push({ ...record, ...result })

    // Wait 500ms between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n================================================================================')
  console.log('\n📊 Backfill Summary:\n')

  const successful = results.filter(r => r.success && !r.skipped)
  const skipped = results.filter(r => r.skipped)
  const failed = results.filter(r => !r.success)

  console.log(`   ✅ Successfully backfilled: ${successful.length}`)
  console.log(`   ⏭️  Skipped (already exists): ${skipped.length}`)
  console.log(`   ❌ Failed: ${failed.length}`)

  if (successful.length > 0) {
    console.log('\n   Backfilled records:')
    successful.forEach(r => {
      console.log(`      - ${r.child_name} (${r.week_start_date}): ${r.habitsCreated} habits`)
    })
  }

  if (failed.length > 0) {
    console.log('\n   Failed records:')
    failed.forEach(r => {
      console.log(`      - ${r.child_name} (${r.week_start_date}): ${r.error}`)
    })
  }

  console.log('\n================================================================================')

  // Verify drift
  console.log('\n🔍 Verifying drift after backfill...\n')

  const { count: oldCount } = await supabase
    .from('habit_tracker')
    .select('*', { count: 'exact', head: true })

  const { count: newCount } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true })

  const drift = ((oldCount - newCount) / oldCount * 100).toFixed(1)

  console.log(`   OLD SCHEMA: ${oldCount} weeks`)
  console.log(`   NEW SCHEMA: ${newCount} weeks`)
  console.log(`   Drift: ${drift}% (${oldCount - newCount} missing)`)

  if (drift <= 15) {
    console.log('\n   ✅ Drift within acceptable range (<15%)')
  } else {
    console.log('\n   ⚠️  Drift still high (>15%)')
  }

  console.log('\n✅ Backfill complete!\n')
}

runBackfill().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
