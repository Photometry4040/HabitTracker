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

console.log('🔍 Verifying backfill data integrity...\n');

async function verifyBackfill() {
  const results = {
    success: true,
    errors: [],
    warnings: []
  };

  try {
    // 1. Count records in old schema
    console.log('📊 Step 1: Counting records in habit_tracker (old schema)...');
    const { count: oldCount, error: oldError } = await supabase
      .from('habit_tracker')
      .select('*', { count: 'exact', head: true });

    if (oldError) {
      console.log('  ℹ️  habit_tracker not accessible (expected if no existing data)');
    } else {
      console.log(`  ✅ habit_tracker: ${oldCount || 0} records\n`);
    }

    // 2. Count records in new schema
    console.log('📊 Step 2: Counting records in new schema...');

    const { count: childrenCount } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true });

    const { count: weeksCount } = await supabase
      .from('weeks')
      .select('*', { count: 'exact', head: true });

    const { count: habitsCount } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true });

    const { count: recordsCount } = await supabase
      .from('habit_records')
      .select('*', { count: 'exact', head: true });

    console.log(`  children: ${childrenCount || 0} records`);
    console.log(`  weeks: ${weeksCount || 0} records`);
    console.log(`  habits: ${habitsCount || 0} records`);
    console.log(`  habit_records: ${recordsCount || 0} records\n`);

    // 3. Verify data consistency
    console.log('📊 Step 3: Verifying data consistency...');

    // Check if weeks count matches habit_tracker count
    if (oldCount && weeksCount !== oldCount) {
      results.warnings.push(`Week count mismatch: expected ${oldCount}, got ${weeksCount}`);
      console.log(`  ⚠️  Week count mismatch: ${oldCount} vs ${weeksCount}`);
    } else if (oldCount) {
      console.log(`  ✅ Week count matches habit_tracker: ${weeksCount}`);
    }

    // Check foreign key integrity
    const { data: orphanedWeeks } = await supabase
      .from('weeks')
      .select('id, child_id')
      .is('child_id', null);

    if (orphanedWeeks && orphanedWeeks.length > 0) {
      results.errors.push(`Found ${orphanedWeeks.length} weeks with null child_id`);
      console.log(`  ❌ Found ${orphanedWeeks.length} weeks with null child_id`);
      results.success = false;
    } else {
      console.log(`  ✅ All weeks have valid child_id`);
    }

    // Check habits integrity
    const { data: orphanedHabits } = await supabase
      .from('habits')
      .select('id, week_id')
      .is('week_id', null);

    if (orphanedHabits && orphanedHabits.length > 0) {
      results.errors.push(`Found ${orphanedHabits.length} habits with null week_id`);
      console.log(`  ❌ Found ${orphanedHabits.length} habits with null week_id`);
      results.success = false;
    } else {
      console.log(`  ✅ All habits have valid week_id`);
    }

    // 4. Sample data verification
    console.log('\n📊 Step 4: Sample data verification...');

    // Get a sample child
    const { data: sampleChildren } = await supabase
      .from('children')
      .select('*')
      .limit(1);

    if (sampleChildren && sampleChildren.length > 0) {
      const sampleChild = sampleChildren[0];
      console.log(`  Sample child: "${sampleChild.name}" (source: ${sampleChild.source_version})`);

      // Get weeks for this child
      const { count: childWeeksCount } = await supabase
        .from('weeks')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', sampleChild.id);

      console.log(`  → Weeks: ${childWeeksCount || 0}`);

      // Get habits for first week
      const { data: sampleWeeks } = await supabase
        .from('weeks')
        .select('id')
        .eq('child_id', sampleChild.id)
        .limit(1);

      if (sampleWeeks && sampleWeeks.length > 0) {
        const { count: weekHabitsCount } = await supabase
          .from('habits')
          .select('*', { count: 'exact', head: true })
          .eq('week_id', sampleWeeks[0].id);

        console.log(`  → Habits in first week: ${weekHabitsCount || 0}`);

        // Get habit records for first habit
        const { data: sampleHabits } = await supabase
          .from('habits')
          .select('id, name')
          .eq('week_id', sampleWeeks[0].id)
          .limit(1);

        if (sampleHabits && sampleHabits.length > 0) {
          const { count: habitRecordsCount } = await supabase
            .from('habit_records')
            .select('*', { count: 'exact', head: true })
            .eq('habit_id', sampleHabits[0].id);

          console.log(`  → Records for "${sampleHabits[0].name}": ${habitRecordsCount || 0}`);
        }
      }
    } else {
      console.log('  ℹ️  No children found for sample verification');
    }

    // 5. Source version distribution
    console.log('\n📊 Step 5: Source version distribution...');

    const tables = ['children', 'weeks', 'habits', 'habit_records'];
    for (const table of tables) {
      const { data: versionCounts } = await supabase
        .from(table)
        .select('source_version')
        .eq('source_version', 'migration');

      const migrationCount = versionCounts ? versionCounts.length : 0;
      console.log(`  ${table.padEnd(20)}: ${migrationCount} migration records`);
    }

  } catch (err) {
    results.errors.push(err.message);
    results.success = false;
    console.error(`\n❌ Verification error: ${err.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Summary');
  console.log('='.repeat(60));

  if (results.success && results.warnings.length === 0) {
    console.log('✅ All checks passed!');
    console.log('\n🎉 Backfill data integrity verified successfully!');
  } else if (results.success && results.warnings.length > 0) {
    console.log('⚠️  Passed with warnings:');
    results.warnings.forEach(w => console.log(`  - ${w}`));
    console.log('\n✅ Backfill completed but please review warnings');
  } else {
    console.log('❌ Verification failed:');
    results.errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n🔴 Please fix errors before proceeding');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('\n🚀 Next steps:');
  console.log('1. Review verification results above');
  console.log('2. Update PHASE_0_PROGRESS.md with Day 3 completion');
  console.log('3. Proceed to Phase 0 Day 4 (Constraint validation)\n');

  return results.success;
}

verifyBackfill();
