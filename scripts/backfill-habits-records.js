import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync('.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('❌ Could not read .env file');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 100;

// Migration user_id from environment variable or command line
// Set via: MIGRATION_USER_ID=xxx node scripts/backfill-habits-records.js
// Or:      node scripts/backfill-habits-records.js xxx-user-id-xxx
let MIGRATION_USER_ID = process.env.MIGRATION_USER_ID || process.argv[2] || null;

console.log('🚀 Starting backfill for habits and habit_records tables...\n');
console.log('⚠️  This script will migrate JSONB habits data to normalized tables');
console.log('⚠️  Source version will be marked as "migration"');
console.log('⚠️  Note: user_id field is currently not used in habit_tracker (commented out)\n');

// Get or validate migration user_id
async function getMigrationUserId() {
  // Check if children exist (should exist from previous script)
  const { data: existingChildren } = await supabase
    .from('children')
    .select('user_id')
    .limit(1);

  if (existingChildren && existingChildren.length > 0 && !MIGRATION_USER_ID) {
    MIGRATION_USER_ID = existingChildren[0].user_id;
    console.log(`✅ Using user_id from children table: ${MIGRATION_USER_ID}\n`);
    return;
  }

  if (!MIGRATION_USER_ID) {
    console.log('❌ No user_id provided.\n');
    console.log('📋 Please run backfill-children-weeks.js first, or provide user_id:\n');
    console.log('  MIGRATION_USER_ID=your-user-id node scripts/backfill-habits-records.js\n');
    console.log('  OR\n');
    console.log('  node scripts/backfill-habits-records.js your-user-id\n');
    console.log('📖 See MIGRATION_USER_SETUP.md for detailed instructions\n');
    process.exit(1);
  }

  console.log(`✅ Using provided user_id: ${MIGRATION_USER_ID}\n`);
}

// ============================================================================
// Backfill Habits Table
// ============================================================================
async function backfillHabits() {
  console.log('📦 Step 1: Backfilling habits table...');

  try {
    // Fetch all habit_tracker records with their JSONB habits
    const { data: oldData, error: fetchError } = await supabase
      .from('habit_tracker')
      .select('id, child_name, week_start_date, habits, created_at')
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch habit_tracker data: ${fetchError.message}`);
    }

    if (!oldData || oldData.length === 0) {
      console.log('  ℹ️  No data found in habit_tracker table');
      return { total: 0, inserted: 0 };
    }

    console.log(`  📊 Found ${oldData.length} records with habits`);

    // Get weeks mapping (child_name + week_start_date -> week_id)
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, child_id, week_start_date')
      .order('week_start_date', { ascending: true });

    if (weeksError) {
      throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
    }

    // Get children mapping
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name, user_id');

    if (childError) {
      throw new Error(`Failed to fetch children: ${childError.message}`);
    }

    // Create child mapping: name -> child_id (all children belong to currentUserId)
    const childMap = new Map();
    for (const child of children) {
      childMap.set(child.name, child.id);
    }

    // Create week mapping: child_id_date -> week_id
    const weekMap = new Map();
    for (const week of weeks) {
      const key = `${week.child_id}_${week.week_start_date}`;
      weekMap.set(key, week.id);
    }

    console.log(`  📊 Weeks mapping: ${weekMap.size} weeks`);

    // Transform habits data
    const habitsData = [];
    let skipped = 0;
    let habitCount = 0;

    for (const row of oldData) {
      const childId = childMap.get(row.child_name);

      if (!childId) {
        console.warn(`  ⚠️  Child not found: ${row.child_name}`);
        skipped++;
        continue;
      }

      const weekKey = `${childId}_${row.week_start_date}`;
      const weekId = weekMap.get(weekKey);

      if (!weekId) {
        console.warn(`  ⚠️  Week not found for child ${row.child_name} on ${row.week_start_date}`);
        skipped++;
        continue;
      }

      // Parse JSONB habits array
      let habitsArray = [];
      try {
        habitsArray = typeof row.habits === 'string'
          ? JSON.parse(row.habits)
          : row.habits || [];
      } catch (e) {
        console.warn(`  ⚠️  Invalid JSON for habits in row ${row.id}`);
        continue;
      }

      // Create habit records
      for (const habit of habitsArray) {
        // Use habit.id if it's a small integer, otherwise use habitCount
        // PostgreSQL INTEGER max is 2147483647
        let displayOrder = habitCount;
        if (typeof habit.id === 'number' && habit.id >= 1 && habit.id <= 1000) {
          displayOrder = habit.id;
        }

        habitsData.push({
          week_id: weekId,
          name: habit.name || '이름 없음',
          time_period: habit.time_period || null,
          display_order: displayOrder,
          source_version: 'migration',
          created_at: row.created_at
        });
        habitCount++;
      }
    }

    console.log(`  📊 Transformed ${habitsData.length} habits from ${oldData.length} weeks (skipped: ${skipped})`);

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < habitsData.length; i += BATCH_SIZE) {
      const batch = habitsData.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('habits')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Error inserting batch: ${error.message}`);
        continue;
      }

      totalInserted += batch.length;
      console.log(`  ✅ Processed ${totalInserted}/${habitsData.length} habits`);
    }

    console.log(`  🎉 Habits backfill complete: ${totalInserted} records\n`);
    return { total: habitsData.length, inserted: totalInserted, skipped };

  } catch (err) {
    console.error(`  ❌ Habits backfill failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// Backfill Habit Records Table
// ============================================================================
async function backfillHabitRecords() {
  console.log('📦 Step 2: Backfilling habit_records table...');

  try {
    // Fetch all habit_tracker records
    const { data: oldData, error: fetchError } = await supabase
      .from('habit_tracker')
      .select('id, child_name, week_start_date, habits, created_at')
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch habit_tracker data: ${fetchError.message}`);
    }

    if (!oldData || oldData.length === 0) {
      console.log('  ℹ️  No data found in habit_tracker table');
      return { total: 0, inserted: 0 };
    }

    console.log(`  📊 Found ${oldData.length} records with habit completion data`);

    // Get children mapping
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name, user_id');

    if (childError) {
      throw new Error(`Failed to fetch children: ${childError.message}`);
    }

    const childMap = new Map();
    for (const child of children) {
      childMap.set(child.name, child.id);
    }

    // Get weeks mapping
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, child_id, week_start_date');

    if (weeksError) {
      throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
    }

    const weekMap = new Map();
    for (const week of weeks) {
      const key = `${week.child_id}_${week.week_start_date}`;
      weekMap.set(key, week.id);
    }

    // Get habits mapping (week_id + habit_name -> habit_id)
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, week_id, name, display_order');

    if (habitsError) {
      throw new Error(`Failed to fetch habits: ${habitsError.message}`);
    }

    // Create habit mapping: week_id_order -> habit_id
    const habitMap = new Map();
    for (const habit of habits) {
      const key = `${habit.week_id}_${habit.display_order}`;
      habitMap.set(key, habit.id);
    }

    console.log(`  📊 Habits mapping: ${habitMap.size} habits`);

    // Transform habit records data
    const recordsData = [];
    let skipped = 0;
    let recordCount = 0;

    for (const row of oldData) {
      const childId = childMap.get(row.child_name);

      if (!childId) {
        skipped++;
        continue;
      }

      const weekKey = `${childId}_${row.week_start_date}`;
      const weekId = weekMap.get(weekKey);

      if (!weekId) {
        skipped++;
        continue;
      }

      // Parse JSONB habits array
      let habitsArray = [];
      try {
        habitsArray = typeof row.habits === 'string'
          ? JSON.parse(row.habits)
          : row.habits || [];
      } catch (e) {
        continue;
      }

      // Process each habit's completion times
      for (const habit of habitsArray) {
        const habitKey = `${weekId}_${habit.id}`;
        const habitId = habitMap.get(habitKey);

        if (!habitId) {
          continue;
        }

        // times is an array of 7 days: ['green', 'yellow', 'red', '', ...]
        const times = habit.times || [];
        const startDate = new Date(row.week_start_date);

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const status = times[dayIndex] || 'none';

          // Skip empty records
          if (status === '' || status === 'none') {
            continue;
          }

          const recordDate = new Date(startDate);
          recordDate.setDate(recordDate.getDate() + dayIndex);

          recordsData.push({
            habit_id: habitId,
            record_date: recordDate.toISOString().split('T')[0],
            status: status,
            note: null,
            source_version: 'migration',
            created_at: row.created_at
          });
          recordCount++;
        }
      }
    }

    console.log(`  📊 Transformed ${recordsData.length} habit records (skipped: ${skipped})`);

    // Check which records already exist
    const { data: existingRecords } = await supabase
      .from('habit_records')
      .select('habit_id, record_date');

    const existingRecordKeys = new Set(
      (existingRecords || []).map(r => `${r.habit_id}_${r.record_date}`)
    );

    // Filter out existing records
    const newRecords = recordsData.filter(
      record => !existingRecordKeys.has(`${record.habit_id}_${record.record_date}`)
    );

    console.log(`  📊 New records to insert: ${newRecords.length} (${existingRecordKeys.size} already exist)`);

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
      const batch = newRecords.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('habit_records')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Error inserting batch: ${error.message}`);
        continue;
      }

      totalInserted += (data || []).length;
      console.log(`  ✅ Processed ${totalInserted}/${newRecords.length} records`);
    }

    console.log(`  🎉 Habit records backfill complete: ${totalInserted} records\n`);
    return { total: recordsData.length, inserted: totalInserted, skipped };

  } catch (err) {
    console.error(`  ❌ Habit records backfill failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// Main Execution
// ============================================================================
async function main() {
  const startTime = Date.now();

  try {
    // Get migration user_id first
    await getMigrationUserId();

    // Check prerequisites
    const { data: weeks } = await supabase
      .from('weeks')
      .select('id')
      .limit(1);

    if (!weeks || weeks.length === 0) {
      console.error('❌ No weeks found. Please run backfill-children-weeks.js first');
      process.exit(1);
    }

    // Execute backfill
    const habitsResult = await backfillHabits();
    const recordsResult = await backfillHabitRecords();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(60));
    console.log('📊 Backfill Summary');
    console.log('='.repeat(60));
    console.log(`Habits: ${habitsResult.inserted}/${habitsResult.total} inserted (${habitsResult.skipped} skipped)`);
    console.log(`Records: ${recordsResult.inserted}/${recordsResult.total} inserted (${recordsResult.skipped} skipped)`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(60));

    console.log('\n✅ Backfill completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Verify data integrity with: node scripts/verify-backfill.js');
    console.log('2. Update PHASE_0_PROGRESS.md');
    console.log('3. Proceed to Phase 0 Day 4\n');

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    process.exit(1);
  }
}

main();
