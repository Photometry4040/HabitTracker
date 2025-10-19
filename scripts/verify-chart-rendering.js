#!/usr/bin/env node

/**
 * Script to verify chart rendering data for '이영준' child
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

async function verifyChartData() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CHART DATA VERIFICATION FOR 이영준');
  console.log('='.repeat(60) + '\n');

  try {
    // Find child ID for 이영준
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('name', '이영준')
      .single();

    if (childError || !children) {
      console.error('❌ Child 이영준 not found');
      return;
    }

    console.log('✅ Found child: 이영준 (ID: ' + children.id + ')');

    // Get all weeks for this child
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, week_start_date')
      .eq('child_id', children.id)
      .order('week_start_date', { ascending: true });

    if (weeksError) {
      console.error('❌ Error fetching weeks:', weeksError.message);
      return;
    }

    console.log(`\n📅 Found ${weeks ? weeks.length : 0} weeks in database:\n`);

    if (!weeks || weeks.length === 0) {
      console.log('❌ No weeks found for this child');
      return;
    }

    // Check each week for data
    const weekDataSummary = [];
    for (const week of weeks) {
      const isoWeek = getISOWeekNumber(week.week_start_date);

      // Get habits and records
      const { data: habits } = await supabase
        .from('habits')
        .select(`
          id,
          name,
          habit_records (
            status,
            record_date
          )
        `)
        .eq('week_id', week.id);

      const allRecords = habits?.flatMap(h => h.habit_records) || [];
      const greenCount = allRecords.filter(r => r.status === 'green').length;
      const totalCount = allRecords.length;
      const completionRate = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;

      weekDataSummary.push({
        week: isoWeek,
        date: week.week_start_date,
        hasData: totalCount > 0,
        completionRate: completionRate,
        greenCount: greenCount,
        totalCount: totalCount
      });

      const statusIcon = totalCount > 0 ? '✅' : '⚪';
      console.log(`  Week ${isoWeek} (${week.week_start_date}): ${statusIcon} ${completionRate}% (${greenCount}/${totalCount})`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));

    const weeksWithData = weekDataSummary.filter(w => w.hasData);
    console.log(`\n✅ Weeks with data: ${weeksWithData.length}`);
    weeksWithData.forEach(w => {
      console.log(`  • Week ${w.week} (${w.date}): ${w.completionRate}%`);
    });

    console.log(`\n⚪ Empty weeks: ${weekDataSummary.filter(w => !w.hasData).length}`);

    // Check specifically for Week 33
    const week33 = weekDataSummary.find(w => w.week === 33);
    if (week33) {
      console.log(`\n🎯 Week 33 Status:`);
      console.log(`  • Date: ${week33.date}`);
      console.log(`  • Has Data: ${week33.hasData ? 'YES' : 'NO'}`);
      console.log(`  • Completion Rate: ${week33.completionRate}%`);
      console.log(`  • Should appear in chart: ${week33.hasData ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`\n⚠️ Week 33 not found in database`);
    }

    console.log('\n💡 CHART RENDERING NOTES:');
    console.log('  • Chart should show dots for all weeks with data');
    console.log('  • Empty weeks should have no dots');
    console.log('  • Lines connect only consecutive data points');
    console.log('  • Isolated data points (like Week 33) need special handling');
    console.log('  • ComposedChart with explicit dot rendering ensures visibility');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

// Run verification
verifyChartData();