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
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Drift Detection Script
 *
 * Purpose: Continuously monitor for data inconsistencies between old and new schemas
 * Frequency: Run every 6 hours via GitHub Actions
 * Alert: Discord webhook notification on drift detection
 */

async function detectDrift() {
  console.log('🔍 Starting Drift Detection...\n');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🎯 Purpose: Detect data inconsistencies between old and new schemas\n');

  const startTime = Date.now();
  const issues = [];

  // ============================================================================
  // Test 1: Record Count Comparison
  // ============================================================================
  console.log('=' + '='.repeat(79));
  console.log(' Test 1: Record Count Comparison');
  console.log('=' + '='.repeat(79) + '\n');

  try {
    // Old schema: habit_tracker table
    const { count: oldWeeksCount, error: oldError } = await supabase
      .from('habit_tracker')
      .select('*', { count: 'exact', head: true });

    if (oldError) throw oldError;

    // New schema: weeks table
    const { count: newWeeksCount, error: newError } = await supabase
      .from('weeks')
      .select('*', { count: 'exact', head: true });

    if (newError) throw newError;

    console.log(`📊 Old schema (habit_tracker): ${oldWeeksCount} weeks`);
    console.log(`📊 New schema (weeks): ${newWeeksCount} weeks`);

    // Known acceptable difference (6 weeks skipped due to Monday constraint)
    const expectedDiff = 6;
    const actualDiff = Math.abs(oldWeeksCount - newWeeksCount);

    if (actualDiff === expectedDiff) {
      console.log(`✅ Count difference: ${actualDiff} (expected: ${expectedDiff})`);
      console.log('   (6 weeks skipped due to Monday constraint - known and acceptable)');
    } else if (actualDiff < expectedDiff) {
      console.log(`⚠️  Count difference: ${actualDiff} (expected: ${expectedDiff})`);
      console.log('   Possible new data in new schema');
      issues.push({
        severity: 'LOW',
        type: 'COUNT_IMPROVEMENT',
        table: 'weeks',
        old_count: oldWeeksCount,
        new_count: newWeeksCount,
        diff: newWeeksCount - oldWeeksCount,
        note: 'More data in new schema than expected (possibly good)'
      });
    } else {
      console.log(`❌ Count difference: ${actualDiff} (expected: ${expectedDiff})`);
      issues.push({
        severity: 'HIGH',
        type: 'COUNT_MISMATCH',
        table: 'weeks',
        old_count: oldWeeksCount,
        new_count: newWeeksCount,
        diff: newWeeksCount - oldWeeksCount,
        expected_diff: expectedDiff,
        note: 'Unexpected count difference'
      });
    }
  } catch (err) {
    console.error('❌ Count comparison failed:', err.message);
    issues.push({
      severity: 'CRITICAL',
      type: 'COUNT_CHECK_FAILED',
      error: err.message
    });
  }

  // ============================================================================
  // Test 2: Sample Data Verification (10 random records)
  // ============================================================================
  console.log('\n' + '=' + '='.repeat(79));
  console.log(' Test 2: Sample Data Verification (10 records)');
  console.log('=' + '='.repeat(79) + '\n');

  try {
    // Get 10 random samples from old schema
    const { data: oldSamples, error: sampleError } = await supabase
      .from('habit_tracker')
      .select('*')
      .limit(10);

    if (sampleError) throw sampleError;

    console.log(`📊 Checking ${oldSamples.length} sample records...\n`);

    let matchCount = 0;
    let mismatchCount = 0;

    for (const oldRow of oldSamples) {
      // Find corresponding child in new schema
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id')
        .eq('name', oldRow.child_name)
        .single();

      if (childError || !child) {
        console.log(`❌ Missing child: ${oldRow.child_name}`);
        issues.push({
          severity: 'CRITICAL',
          type: 'MISSING_CHILD',
          child_name: oldRow.child_name,
          note: 'Child exists in old schema but not in new schema'
        });
        mismatchCount++;
        continue;
      }

      // Find corresponding week in new schema
      const { data: week, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('child_id', child.id)
        .eq('week_start_date', oldRow.week_start_date)
        .maybeSingle();

      if (weekError) {
        console.log(`⚠️  Error checking week for ${oldRow.child_name} on ${oldRow.week_start_date}`);
        issues.push({
          severity: 'MEDIUM',
          type: 'WEEK_CHECK_ERROR',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          error: weekError.message
        });
        mismatchCount++;
        continue;
      }

      if (!week) {
        // Check if this is one of the 6 skipped weeks (non-Monday)
        const startDate = new Date(oldRow.week_start_date);
        const dayOfWeek = startDate.getUTCDay();

        if (dayOfWeek !== 1) {
          console.log(`⚠️  Skipped week (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}): ${oldRow.child_name} on ${oldRow.week_start_date}`);
          matchCount++; // This is expected, count as match
          continue;
        }

        console.log(`❌ Missing week: ${oldRow.child_name} on ${oldRow.week_start_date} (Monday)`);
        issues.push({
          severity: 'CRITICAL',
          type: 'MISSING_WEEK',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          note: 'Week exists in old schema but not in new schema (Monday - should exist!)'
        });
        mismatchCount++;
        continue;
      }

      // Verify theme matches
      if (oldRow.theme !== week.theme) {
        console.log(`⚠️  Theme mismatch: ${oldRow.child_name} on ${oldRow.week_start_date}`);
        console.log(`   Old: "${oldRow.theme}"`);
        console.log(`   New: "${week.theme}"`);
        issues.push({
          severity: 'MEDIUM',
          type: 'DATA_MISMATCH',
          field: 'theme',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          old_value: oldRow.theme,
          new_value: week.theme
        });
        mismatchCount++;
        continue;
      }

      matchCount++;
    }

    console.log(`\n✅ Matching records: ${matchCount}/${oldSamples.length}`);
    console.log(`${mismatchCount > 0 ? '❌' : '✅'} Mismatches: ${mismatchCount}/${oldSamples.length}`);

  } catch (err) {
    console.error('❌ Sample verification failed:', err.message);
    issues.push({
      severity: 'CRITICAL',
      type: 'SAMPLE_CHECK_FAILED',
      error: err.message
    });
  }

  // ============================================================================
  // Test 3: Source Version Distribution
  // ============================================================================
  console.log('\n' + '=' + '='.repeat(79));
  console.log(' Test 3: Source Version Tracking');
  console.log('=' + '='.repeat(79) + '\n');

  try {
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('source_version');

    if (weeksError) throw weeksError;

    const versionCounts = {};
    for (const row of weeks) {
      const version = row.source_version || 'unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    }

    console.log('📊 Source version distribution:');
    for (const [version, count] of Object.entries(versionCounts)) {
      const percentage = ((count / weeks.length) * 100).toFixed(1);
      console.log(`   ${version.padEnd(15)}: ${count.toString().padStart(3)} records (${percentage}%)`);
    }

    // All should be 'migration' in Phase 0
    if (versionCounts['migration'] === weeks.length) {
      console.log('\n✅ All records marked as "migration" (correct for Phase 0)');
    } else {
      console.log('\n⚠️  Not all records are marked as "migration"');
      issues.push({
        severity: 'LOW',
        type: 'SOURCE_VERSION_MIX',
        distribution: versionCounts,
        note: 'Expected all records to have source_version = "migration" in Phase 0'
      });
    }

  } catch (err) {
    console.error('❌ Source version check failed:', err.message);
    issues.push({
      severity: 'MEDIUM',
      type: 'SOURCE_VERSION_CHECK_FAILED',
      error: err.message
    });
  }

  // ============================================================================
  // Test 4: Foreign Key Integrity (Quick Check)
  // ============================================================================
  console.log('\n' + '=' + '='.repeat(79));
  console.log(' Test 4: Foreign Key Integrity Check');
  console.log('=' + '='.repeat(79) + '\n');

  try {
    // Check for orphaned weeks (child_id not in children)
    const { data: weeks } = await supabase
      .from('weeks')
      .select('id, child_id');

    const { data: children } = await supabase
      .from('children')
      .select('id');

    const childIds = new Set(children.map(c => c.id));
    const orphanedWeeks = weeks.filter(w => !childIds.has(w.child_id));

    if (orphanedWeeks.length === 0) {
      console.log('✅ No orphaned weeks (all child_id references valid)');
    } else {
      console.log(`❌ Found ${orphanedWeeks.length} orphaned weeks`);
      issues.push({
        severity: 'CRITICAL',
        type: 'ORPHANED_RECORDS',
        table: 'weeks',
        count: orphanedWeeks.length,
        orphaned_ids: orphanedWeeks.slice(0, 5).map(w => w.id),
        note: 'Weeks with invalid child_id references'
      });
    }

    // Check for orphaned habits (week_id not in weeks)
    const { data: habits } = await supabase
      .from('habits')
      .select('id, week_id');

    const weekIds = new Set(weeks.map(w => w.id));
    const orphanedHabits = habits.filter(h => !weekIds.has(h.week_id));

    if (orphanedHabits.length === 0) {
      console.log('✅ No orphaned habits (all week_id references valid)');
    } else {
      console.log(`❌ Found ${orphanedHabits.length} orphaned habits`);
      issues.push({
        severity: 'CRITICAL',
        type: 'ORPHANED_RECORDS',
        table: 'habits',
        count: orphanedHabits.length,
        orphaned_ids: orphanedHabits.slice(0, 5).map(h => h.id),
        note: 'Habits with invalid week_id references'
      });
    }

  } catch (err) {
    console.error('❌ FK integrity check failed:', err.message);
    issues.push({
      severity: 'MEDIUM',
      type: 'FK_CHECK_FAILED',
      error: err.message
    });
  }

  // ============================================================================
  // Summary Report
  // ============================================================================
  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log(' 📊 Drift Detection Summary');
  console.log('='.repeat(80));
  console.log(`\n⏱️  Duration: ${duration}ms`);
  console.log(`📊 Issues found: ${issues.length}`);

  if (issues.length === 0) {
    console.log('\n✅ No drift detected - schemas are in sync!');
    console.log('   Old and new schemas are consistent');
    console.log('   All foreign keys valid');
    console.log('   All source versions correct\n');
    return { status: 'success', issues: [], duration };
  }

  // Categorize issues by severity
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  const low = issues.filter(i => i.severity === 'LOW');

  console.log('\n⚠️  Drift Detected:');
  if (critical.length > 0) console.log(`   🔴 CRITICAL: ${critical.length} issues`);
  if (high.length > 0) console.log(`   🟠 HIGH: ${high.length} issues`);
  if (medium.length > 0) console.log(`   🟡 MEDIUM: ${medium.length} issues`);
  if (low.length > 0) console.log(`   🟢 LOW: ${low.length} issues`);

  console.log('\n📋 Issue Details:');
  console.table(issues);

  // Send alert if issues found
  await sendAlert(issues, duration);

  console.log('\n🔧 Recommended Actions:');
  if (critical.length > 0 || high.length > 0) {
    console.log('   1. ⚠️  URGENT: Review critical/high severity issues immediately');
    console.log('   2. Run backfill scripts if data is missing');
    console.log('   3. Check for recent changes to old schema (habit_tracker)');
    console.log('   4. Re-run verification: node scripts/verify-backfill.js');
  } else {
    console.log('   1. Review medium/low severity issues when convenient');
    console.log('   2. Monitor for pattern in next drift detection run');
  }

  return { status: 'drift_detected', issues, duration };
}

/**
 * Send alert via Discord webhook
 */
async function sendAlert(issues, duration) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('\n⚠️  Discord webhook not configured (DISCORD_WEBHOOK_URL)');
    console.log('   Add webhook URL to .env to enable alerts\n');
    return;
  }

  console.log('\n📢 Sending Discord alert...');

  const critical = issues.filter(i => i.severity === 'CRITICAL').length;
  const high = issues.filter(i => i.severity === 'HIGH').length;
  const medium = issues.filter(i => i.severity === 'MEDIUM').length;
  const low = issues.filter(i => i.severity === 'LOW').length;

  const color = critical > 0 ? 0xFF0000 : high > 0 ? 0xFF9900 : medium > 0 ? 0xFFFF00 : 0x00FF00;

  const embed = {
    title: '🚨 Schema Drift Detected',
    description: `Found ${issues.length} data inconsistencies between old and new schemas`,
    color: color,
    fields: [
      {
        name: '📊 Summary',
        value: `🔴 Critical: ${critical}\n🟠 High: ${high}\n🟡 Medium: ${medium}\n🟢 Low: ${low}`,
        inline: true
      },
      {
        name: '⏱️ Detection Time',
        value: `${duration}ms`,
        inline: true
      },
      {
        name: '📅 Timestamp',
        value: new Date().toISOString(),
        inline: false
      }
    ],
    timestamp: new Date().toISOString()
  };

  // Add top 5 issues
  const topIssues = issues.slice(0, 5);
  for (const issue of topIssues) {
    embed.fields.push({
      name: `${issue.severity}: ${issue.type}`,
      value: JSON.stringify(issue, null, 2).substring(0, 1000),
      inline: false
    });
  }

  if (issues.length > 5) {
    embed.fields.push({
      name: '⚠️  More Issues',
      value: `${issues.length - 5} more issues not shown. Check logs for details.`,
      inline: false
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (response.ok) {
      console.log('✅ Discord alert sent successfully\n');
    } else {
      console.error('❌ Failed to send Discord alert:', response.status, response.statusText);
    }
  } catch (err) {
    console.error('❌ Discord alert error:', err.message);
  }
}

// Main execution
detectDrift()
  .then(result => {
    if (result.status === 'success') {
      console.log('✅ Drift detection completed successfully');
      process.exit(0);
    } else {
      console.log('⚠️  Drift detection completed with issues');
      process.exit(1); // Exit with error code to trigger GitHub Actions alert
    }
  })
  .catch(err => {
    console.error('\n❌ Drift detection failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
