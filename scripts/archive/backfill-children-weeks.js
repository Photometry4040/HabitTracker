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
// Set via: MIGRATION_USER_ID=xxx node scripts/backfill-children-weeks.js
// Or:      node scripts/backfill-children-weeks.js xxx-user-id-xxx
let MIGRATION_USER_ID = process.env.MIGRATION_USER_ID || process.argv[2] || null;

console.log('🚀 Starting backfill for children and weeks tables...\n');
console.log('⚠️  This script will migrate data from habit_tracker to new schema');
console.log('⚠️  Source version will be marked as "migration"');
console.log('⚠️  Note: user_id field is currently not used in habit_tracker (commented out)\n');

// Get or validate migration user_id
async function getMigrationUserId() {
  // Check if any children already exist
  const { data: existingChildren } = await supabase
    .from('children')
    .select('user_id')
    .limit(1);

  if (existingChildren && existingChildren.length > 0 && !MIGRATION_USER_ID) {
    MIGRATION_USER_ID = existingChildren[0].user_id;
    console.log(`✅ Using existing user_id from children table: ${MIGRATION_USER_ID}\n`);
    return;
  }

  if (!MIGRATION_USER_ID) {
    console.log('❌ No user_id provided and no existing children found.\n');
    console.log('📋 Please provide a user_id from auth.users table:\n');
    console.log('Method 1 - Environment variable:');
    console.log('  MIGRATION_USER_ID=your-user-id node scripts/backfill-children-weeks.js\n');
    console.log('Method 2 - Command line argument:');
    console.log('  node scripts/backfill-children-weeks.js your-user-id\n');
    console.log('Method 3 - Get user_id from Supabase Dashboard:');
    console.log('  Dashboard → Authentication → Users → Copy any user ID\n');
    console.log('Method 4 - Create user via web app:');
    console.log('  1. npm run dev');
    console.log('  2. Open http://localhost:5173 and log in');
    console.log('  3. Run: node scripts/get-user-id.js\n');
    console.log('📖 See MIGRATION_USER_SETUP.md for detailed instructions\n');
    process.exit(1);
  }

  console.log(`✅ Using provided user_id: ${MIGRATION_USER_ID}\n`);
}

// ============================================================================
// Backfill Children Table
// ============================================================================
async function backfillChildren() {
  console.log('📦 Step 1: Backfilling children table...');

  try {
    // Note: user_id field may not exist in current schema (commented out in code)
    // Fetch all unique children from habit_tracker
    const { data: oldData, error: fetchError } = await supabase
      .from('habit_tracker')
      .select('child_name, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch habit_tracker data: ${fetchError.message}`);
    }

    if (!oldData || oldData.length === 0) {
      console.log('  ℹ️  No data found in habit_tracker table');
      return { total: 0, inserted: 0 };
    }

    console.log(`  📊 Found ${oldData.length} records in habit_tracker`);

    // Remove duplicates - keep first occurrence of each child name
    const uniqueChildren = new Map();
    for (const row of oldData) {
      const childName = row.child_name;
      if (!uniqueChildren.has(childName)) {
        uniqueChildren.set(childName, {
          user_id: MIGRATION_USER_ID,
          name: childName,
          source_version: 'migration',
          created_at: row.created_at
        });
      }
    }

    const childrenArray = Array.from(uniqueChildren.values());
    console.log(`  📊 Unique children: ${childrenArray.length}`);

    // Check which children already exist
    const { data: existingChildren } = await supabase
      .from('children')
      .select('name, user_id')
      .eq('user_id', MIGRATION_USER_ID);

    const existingNames = new Set(
      (existingChildren || []).map(c => c.name)
    );

    // Filter out existing children
    const newChildren = childrenArray.filter(
      child => !existingNames.has(child.name)
    );

    console.log(`  📊 New children to insert: ${newChildren.length} (${existingNames.size} already exist)`);

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < newChildren.length; i += BATCH_SIZE) {
      const batch = newChildren.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('children')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Error inserting batch: ${error.message}`);
        continue;
      }

      totalInserted += (data || []).length;
      console.log(`  ✅ Processed ${totalInserted}/${newChildren.length} children`);
    }

    console.log(`  🎉 Children backfill complete: ${totalInserted} records\n`);
    return { total: childrenArray.length, inserted: totalInserted };

  } catch (err) {
    console.error(`  ❌ Children backfill failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// Backfill Weeks Table
// ============================================================================
async function backfillWeeks() {
  console.log('📦 Step 2: Backfilling weeks table...');

  try {
    // Fetch all habit_tracker records with child mapping
    const { data: oldData, error: fetchError } = await supabase
      .from('habit_tracker')
      .select('*')
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch habit_tracker data: ${fetchError.message}`);
    }

    if (!oldData || oldData.length === 0) {
      console.log('  ℹ️  No data found in habit_tracker table');
      return { total: 0, inserted: 0 };
    }

    console.log(`  📊 Found ${oldData.length} records to process`);

    // Get all children to create mapping
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name, user_id');

    if (childError) {
      throw new Error(`Failed to fetch children: ${childError.message}`);
    }

    // Create name -> id mapping (use currentUserId for all children)
    const childMap = new Map();
    for (const child of children) {
      // Map by name only since all children belong to currentUserId
      childMap.set(child.name, child.id);
    }

    console.log(`  📊 Child mapping created: ${childMap.size} children`);

    // Transform data
    const weeksData = [];
    let skipped = 0;

    for (const row of oldData) {
      const childId = childMap.get(row.child_name);

      if (!childId) {
        console.warn(`  ⚠️  Child not found for: ${row.child_name}`);
        skipped++;
        continue;
      }

      // Check if week_start_date is Monday (DOW = 1)
      const startDate = new Date(row.week_start_date);
      const dayOfWeek = startDate.getUTCDay();

      if (dayOfWeek !== 1) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.warn(`  ⚠️  Skipping non-Monday date: ${row.week_start_date} (${dayNames[dayOfWeek]}) for child: ${row.child_name}`);
        skipped++;
        continue;
      }

      // Calculate week_end_date (6 days after start)
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      weeksData.push({
        user_id: MIGRATION_USER_ID,
        child_id: childId,
        week_start_date: row.week_start_date,
        week_end_date: endDate.toISOString().split('T')[0],
        theme: row.theme || null,
        reflection: row.reflection || {},
        reward: row.reward || null,
        source_version: 'migration',
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }

    console.log(`  📊 Transformed ${weeksData.length} weeks (skipped: ${skipped})`);

    // Check which weeks already exist
    const { data: existingWeeks } = await supabase
      .from('weeks')
      .select('child_id, week_start_date');

    const existingWeekKeys = new Set(
      (existingWeeks || []).map(w => `${w.child_id}_${w.week_start_date}`)
    );

    // Filter out existing weeks
    const newWeeks = weeksData.filter(
      week => !existingWeekKeys.has(`${week.child_id}_${week.week_start_date}`)
    );

    console.log(`  📊 New weeks to insert: ${newWeeks.length} (${existingWeekKeys.size} already exist)`);

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < newWeeks.length; i += BATCH_SIZE) {
      const batch = newWeeks.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('weeks')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Error inserting batch: ${error.message}`);
        continue;
      }

      totalInserted += (data || []).length;
      console.log(`  ✅ Processed ${totalInserted}/${newWeeks.length} weeks`);
    }

    console.log(`  🎉 Weeks backfill complete: ${totalInserted} records\n`);
    return { total: weeksData.length, inserted: totalInserted, skipped };

  } catch (err) {
    console.error(`  ❌ Weeks backfill failed: ${err.message}`);
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

    // Check if habit_tracker table exists
    const { data: tables, error: tableError } = await supabase
      .from('habit_tracker')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ habit_tracker table not accessible:', tableError.message);
      console.log('ℹ️  This is expected if you have no existing data to migrate');
      process.exit(0);
    }

    // Execute backfill
    const childrenResult = await backfillChildren();
    const weeksResult = await backfillWeeks();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(60));
    console.log('📊 Backfill Summary');
    console.log('='.repeat(60));
    console.log(`Children: ${childrenResult.inserted}/${childrenResult.total} inserted`);
    console.log(`Weeks: ${weeksResult.inserted}/${weeksResult.total} inserted (${weeksResult.skipped} skipped)`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(60));

    console.log('\n✅ Backfill completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: node scripts/backfill-habits-records.js');
    console.log('2. Verify data integrity');
    console.log('3. Proceed to Phase 0 Day 4\n');

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    process.exit(1);
  }
}

main();
