#!/usr/bin/env node

/**
 * Check all August 2025 weeks in database
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

async function checkAugustWeeks() {
  console.log('\n' + '='.repeat(60));
  console.log('📅 AUGUST 2025 WEEKS CHECK');
  console.log('='.repeat(60) + '\n');

  try {
    // Get all weeks in August 2025
    const { data: weeks, error } = await supabase
      .from('weeks')
      .select('week_start_date, child_id, id')
      .gte('week_start_date', '2025-08-01')
      .lte('week_start_date', '2025-08-31')
      .order('week_start_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching weeks:', error.message);
      return;
    }

    if (!weeks || weeks.length === 0) {
      console.log('❌ No weeks found in August 2025');
      return;
    }

    console.log(`✅ Found ${weeks.length} weeks in August 2025:\n`);

    for (const week of weeks) {
      const isoWeek = getISOWeekNumber(week.week_start_date);
      console.log(`  • Week ${isoWeek}: ${week.week_start_date}`);
      console.log(`    - Child ID: ${week.child_id}`);
      console.log(`    - Week ID: ${week.id}`);

      // Check if this has any habit records
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('week_id', week.id);

      if (habits && habits.length > 0) {
        console.log(`    - Has ${habits.length} habits`);
      }
      console.log('');
    }

    // Check specifically for Week 33 (ISO week starting August 11, 2025)
    console.log('🔍 Checking for ISO Week 33 (should be August 11, 2025):');
    const aug11 = weeks.find(w => w.week_start_date === '2025-08-11');
    if (aug11) {
      console.log('  ✅ Found Week 33 (2025-08-11)!');
    } else {
      console.log('  ❌ Week 33 (2025-08-11) not found in database');
      console.log('  Available August weeks are:', weeks.map(w => w.week_start_date).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

// Run check
checkAugustWeeks();