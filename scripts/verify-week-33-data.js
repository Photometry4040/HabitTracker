#!/usr/bin/env node

/**
 * Script to verify Week 33 (8/11) data is being properly included
 * This script checks if the data exists in DB and if it would be included in trend analysis
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

// Simple ISO week number calculation
function getISOWeekNumber(dateStr) {
  const date = new Date(dateStr);
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

async function verifyWeek33Data() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 WEEK 33 (8/11) DATA VERIFICATION');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Check if Week 33 exists in DB
    console.log('📚 Step 1: Checking if week 2025-08-11 exists in database...');
    const { data: weekData, error: weekError } = await supabase
      .from('weeks')
      .select('id, child_id, week_start_date')
      .eq('week_start_date', '2025-08-11')
      .single();

    if (weekError || !weekData) {
      console.log('❌ Week 2025-08-11 NOT found in database');
      console.log('   Error:', weekError?.message || 'No data');
      return;
    }

    console.log('✅ Week 2025-08-11 found in database:');
    console.log('  • Week ID:', weekData.id);
    console.log('  • Child ID:', weekData.child_id);
    console.log('  • ISO Week Number:', getISOWeekNumber('2025-08-11'));

    // Step 2: Check habit records for this week
    console.log('\n📊 Step 2: Checking habit records...');
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select(`
        id,
        name,
        habit_records (
          status,
          record_date
        )
      `)
      .eq('week_id', weekData.id);

    if (habitsError || !habits || habits.length === 0) {
      console.log('❌ No habits found for this week');
      return;
    }

    const allRecords = habits.flatMap(h => h.habit_records);
    const greenCount = allRecords.filter(r => r.status === 'green').length;
    const totalCount = allRecords.length;
    const completionRate = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;

    console.log('✅ Habit data found:');
    console.log('  • Total habits:', habits.length);
    console.log('  • Total records:', totalCount);
    console.log('  • Green records:', greenCount);
    console.log('  • Completion rate:', completionRate + '%');

    // Step 3: Simulate trend data generation logic
    console.log('\n🔧 Step 3: Simulating trend data generation...');

    // Get current Monday
    const today = new Date();
    const currentMonday = new Date(today);
    const dayOfWeek = currentMonday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentMonday.setDate(currentMonday.getDate() + diffToMonday);

    console.log('  • Current Monday:', currentMonday.toISOString().split('T')[0]);

    // Calculate if Week 33 would be included in 8-week view
    const week33Date = new Date('2025-08-11');
    const weeksDiff = Math.floor((currentMonday - week33Date) / (7 * 24 * 60 * 60 * 1000));

    console.log('  • Weeks from Week 33 to current:', weeksDiff);

    // Check all child's weeks
    const { data: allChildWeeks, error: allWeeksError } = await supabase
      .from('weeks')
      .select('week_start_date')
      .eq('child_id', weekData.child_id)
      .order('week_start_date', { ascending: true });

    if (!allWeeksError && allChildWeeks && allChildWeeks.length > 0) {
      const oldestWeek = allChildWeeks[0].week_start_date;
      const newestWeek = allChildWeeks[allChildWeeks.length - 1].week_start_date;

      console.log('\n📅 Step 4: Child\'s data range:');
      console.log('  • Oldest week:', oldestWeek);
      console.log('  • Newest week:', newestWeek);
      console.log('  • Total weeks in DB:', allChildWeeks.length);

      // Check if Week 33 is within range
      const isInRange = week33Date >= new Date(oldestWeek) && week33Date <= new Date(newestWeek);
      console.log('  • Week 33 is within child\'s data range:', isInRange ? '✅ YES' : '❌ NO');

      // For 8-week view
      const eightWeeksAgo = new Date(currentMonday);
      eightWeeksAgo.setDate(currentMonday.getDate() - (7 * 7)); // 7 weeks back + current week = 8 weeks

      console.log('\n📊 For 8-week view:');
      console.log('  • Would normally start from:', eightWeeksAgo.toISOString().split('T')[0]);
      console.log('  • DB oldest week is:', oldestWeek);

      // With our new logic, we use the older of the two dates
      const viewStart = new Date(oldestWeek) < eightWeeksAgo ? new Date(oldestWeek) : eightWeeksAgo;
      console.log('  • So view actually starts from:', viewStart.toISOString().split('T')[0]);

      const wouldBeIncluded = week33Date >= viewStart && week33Date <= currentMonday;

      console.log('\n✨ RESULT:');
      console.log('  Week 33 (2025-08-11) would be included in 8-week view:', wouldBeIncluded ? '✅ YES' : '❌ NO');

      if (wouldBeIncluded) {
        console.log('\n💡 Week 33 SHOULD appear in the chart with our new logic!');
        console.log('  The fix ensures all DB weeks are included when they fall before the requested range.');
      } else {
        console.log('\n⚠️ Week 33 is outside the range.');
        console.log('  You may need to select a longer period (e.g., 12 weeks, 6 months, or YTD).');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }

  process.exit(0);
}

// Run verification
verifyWeek33Data();