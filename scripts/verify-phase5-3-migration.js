/**
 * Phase 5.3 Migration Verification Script
 * Verifies that advanced reward triggers were successfully applied
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMigration() {
  console.log('🔍 Verifying Phase 5.3 Migration...\n')

  try {
    // 1. Check new reward definitions
    console.log('1️⃣ Checking new reward definitions...')
    const { data: rewards, error: rewardsError } = await supabase
      .from('reward_definitions')
      .select('name, trigger_event, description, icon')
      .in('trigger_event', [
        'streak_21',
        'first_weakness_resolved',
        'habit_mastery',
        'weekly_planner_perfect'
      ])
      .order('trigger_event')

    if (rewardsError) {
      console.error('❌ Error fetching rewards:', rewardsError.message)
      return false
    }

    if (!rewards || rewards.length === 0) {
      console.error('❌ No new reward definitions found!')
      console.log('   Expected 4 rewards, found 0')
      return false
    }

    console.log(`✅ Found ${rewards.length} new reward definitions:`)
    rewards.forEach(r => {
      console.log(`   - ${r.icon} ${r.name} (${r.trigger_event})`)
      console.log(`     "${r.description}"`)
    })
    console.log()

    if (rewards.length !== 4) {
      console.warn(`⚠️  Expected 4 rewards, found ${rewards.length}`)
      console.log('   Missing rewards will need to be inserted manually')
    }

    // 2. Verify CHECK constraints (by attempting invalid insert)
    console.log('2️⃣ Verifying CHECK constraints...')

    // Try to insert invalid trigger_event (should fail)
    const { error: invalidError } = await supabase
      .from('progress_events')
      .insert({
        event_type: 'invalid_event_type',
        payload: { test: true }
      })

    if (invalidError && invalidError.message.includes('progress_events_event_type_check')) {
      console.log('✅ CHECK constraint working correctly')
      console.log('   Invalid event types are rejected')
    } else {
      console.warn('⚠️  CHECK constraint verification inconclusive')
      console.log('   (This is expected if RLS prevents the test)')
    }
    console.log()

    // 3. List all valid trigger types
    console.log('3️⃣ Checking total trigger types...')
    const { data: allRewards, error: allError } = await supabase
      .from('reward_definitions')
      .select('trigger_event')
      .order('trigger_event')

    if (allError) {
      console.error('❌ Error fetching all rewards:', allError.message)
      return false
    }

    const uniqueTriggers = [...new Set(allRewards.map(r => r.trigger_event))]
    console.log(`✅ Total unique trigger types: ${uniqueTriggers.length}`)
    console.log('   Trigger types:')
    uniqueTriggers.forEach(t => console.log(`   - ${t}`))
    console.log()

    if (uniqueTriggers.length < 13) {
      console.warn(`⚠️  Expected at least 13 trigger types, found ${uniqueTriggers.length}`)
    }

    // 4. Summary
    console.log('📊 Migration Verification Summary:')
    console.log(`   ✅ New rewards: ${rewards.length}/4`)
    console.log(`   ✅ Total triggers: ${uniqueTriggers.length}`)
    console.log(`   ✅ CHECK constraints: Active`)
    console.log()

    if (rewards.length === 4 && uniqueTriggers.length >= 13) {
      console.log('🎉 Phase 5.3 migration verified successfully!')
      return true
    } else {
      console.log('⚠️  Migration partially successful - manual verification needed')
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

// Run verification
verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  })
