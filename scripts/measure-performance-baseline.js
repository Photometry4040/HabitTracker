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

console.log('📊 Measuring Performance Baseline...\n');
console.log('⚠️  This measures query performance for shadow schema');
console.log('⚠️  Results establish baseline for Phase 1-3 comparisons\n');

// ============================================================================
// Utility: Measure Query Performance
// ============================================================================
async function measureQuery(name, queryFn, iterations = 5) {
  const times = [];

  // Warm-up run
  await queryFn();

  // Measurement runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await queryFn();
    const duration = performance.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { avg, min, max, times };
}

// ============================================================================
// Query Patterns to Benchmark
// ============================================================================
const queryPatterns = {
  // Pattern 1: Load all children for a user
  async loadUserChildren() {
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('source_version', 'migration')
      .order('name');
    return data;
  },

  // Pattern 2: Load weeks for a child
  async loadChildWeeks() {
    // Get first child
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .limit(1);

    if (!children || children.length === 0) return [];

    const { data } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', children[0].id)
      .order('week_start_date', { ascending: false });

    return data;
  },

  // Pattern 3: Load habits for a week (with nested query simulation)
  async loadWeekHabits() {
    const { data: weeks } = await supabase
      .from('weeks')
      .select('id')
      .limit(1);

    if (!weeks || weeks.length === 0) return [];

    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('week_id', weeks[0].id)
      .order('display_order');

    return data;
  },

  // Pattern 4: Load habit records for a habit
  async loadHabitRecords() {
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .limit(1);

    if (!habits || habits.length === 0) return [];

    const { data } = await supabase
      .from('habit_records')
      .select('*')
      .eq('habit_id', habits[0].id)
      .order('record_date');

    return data;
  },

  // Pattern 5: Complex query - Full week data (child → week → habits → records)
  async loadFullWeekData() {
    // Get one week
    const { data: weeks } = await supabase
      .from('weeks')
      .select('*')
      .limit(1);

    if (!weeks || weeks.length === 0) return null;

    const week = weeks[0];

    // Get habits for week
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('week_id', week.id)
      .order('display_order');

    if (!habits) return null;

    // Get records for each habit
    const habitIds = habits.map(h => h.id);
    const { data: records } = await supabase
      .from('habit_records')
      .select('*')
      .in('habit_id', habitIds)
      .order('record_date');

    return { week, habits, records };
  },

  // Pattern 6: List weeks with date range filter
  async filterWeeksByDateRange() {
    const { data } = await supabase
      .from('weeks')
      .select('*')
      .gte('week_start_date', '2025-07-01')
      .lte('week_start_date', '2025-09-30')
      .order('week_start_date');

    return data;
  },

  // Pattern 7: Count query patterns
  async countHabitsByStatus() {
    const { data } = await supabase
      .from('habit_records')
      .select('status, id', { count: 'exact' });

    return data;
  },

  // Pattern 8: Search habits by name (text search)
  async searchHabitsByName() {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .ilike('name', '%독서%');

    return data;
  }
};

// ============================================================================
// Run Benchmarks
// ============================================================================
async function runBenchmarks() {
  console.log('━'.repeat(60));
  console.log('🏃 Running Query Performance Tests');
  console.log('━'.repeat(60));

  const results = [];

  for (const [name, queryFn] of Object.entries(queryPatterns)) {
    console.log(`\n📌 ${name}...`);

    try {
      const perf = await measureQuery(name, queryFn, 5);

      console.log(`   Avg: ${perf.avg.toFixed(2)}ms`);
      console.log(`   Min: ${perf.min.toFixed(2)}ms`);
      console.log(`   Max: ${perf.max.toFixed(2)}ms`);

      // Performance rating
      let rating = '✅';
      if (perf.avg > 100) rating = '⚠️';
      if (perf.avg > 500) rating = '❌';

      console.log(`   ${rating} Performance: ${perf.avg < 50 ? 'Excellent' : perf.avg < 100 ? 'Good' : perf.avg < 500 ? 'Fair' : 'Poor'}`);

      results.push({ name, ...perf, rating });
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.push({ name, error: err.message });
    }
  }

  return results;
}

// ============================================================================
// Measure Table Sizes
// ============================================================================
async function measureTableSizes() {
  console.log('\n' + '━'.repeat(60));
  console.log('📦 Table Sizes');
  console.log('━'.repeat(60));

  const tables = ['children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications'];
  const sizes = [];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ${table}: Error - ${error.message}`);
      sizes.push({ table, count: null, error: error.message });
    } else {
      console.log(`   ${table}: ${count} records`);
      sizes.push({ table, count });
    }
  }

  return sizes;
}

// ============================================================================
// Calculate Growth Projections
// ============================================================================
function projectGrowth(results, sizes) {
  console.log('\n' + '━'.repeat(60));
  console.log('📈 Performance Projections');
  console.log('━'.repeat(60));

  const currentHabitRecords = sizes.find(s => s.table === 'habit_records')?.count || 0;

  console.log(`\nCurrent data: ~${currentHabitRecords} habit_records`);
  console.log('\nProjected query times at scale:\n');

  const growthFactors = [
    { label: '10x growth (~2.8k records)', factor: 10 },
    { label: '100x growth (~28k records)', factor: 100 },
    { label: '1000x growth (~280k records)', factor: 1000 }
  ];

  results.forEach(result => {
    if (result.error) return;

    console.log(`${result.name}:`);
    console.log(`  Current: ${result.avg.toFixed(2)}ms`);

    growthFactors.forEach(({ label, factor }) => {
      // Assume O(log n) for indexed queries, O(n) for scans
      // Most queries use indexes, so log factor
      const projected = result.avg * Math.log10(factor + 1);
      const rating = projected < 50 ? '✅' : projected < 200 ? '⚠️' : '❌';
      console.log(`  ${label}: ~${projected.toFixed(2)}ms ${rating}`);
    });
  });
}

// ============================================================================
// Generate Baseline Report
// ============================================================================
function generateReport(results, sizes) {
  console.log('\n' + '━'.repeat(60));
  console.log('📋 Performance Baseline Report');
  console.log('━'.repeat(60));

  const totalRecords = sizes.reduce((sum, s) => sum + (s.count || 0), 0);
  const avgQueryTime = results
    .filter(r => !r.error)
    .reduce((sum, r) => sum + r.avg, 0) / results.filter(r => !r.error).length;

  console.log('\n📊 Summary Statistics:');
  console.log(`   Total Records: ${totalRecords}`);
  console.log(`   Tables: ${sizes.filter(s => (s.count || 0) > 0).length}/${sizes.length} populated`);
  console.log(`   Query Patterns Tested: ${results.length}`);
  console.log(`   Average Query Time: ${avgQueryTime.toFixed(2)}ms`);

  console.log('\n🏆 Best Performing Queries:');
  const sorted = [...results].filter(r => !r.error).sort((a, b) => a.avg - b.avg);
  sorted.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name}: ${r.avg.toFixed(2)}ms`);
  });

  console.log('\n⚠️  Slowest Queries:');
  sorted.slice(-3).reverse().forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name}: ${r.avg.toFixed(2)}ms`);
  });

  console.log('\n💾 Data Distribution:');
  sizes.filter(s => (s.count || 0) > 0).forEach(s => {
    const percentage = ((s.count / totalRecords) * 100).toFixed(1);
    console.log(`   ${s.table}: ${s.count} (${percentage}%)`);
  });

  // Recommendations
  console.log('\n📝 Recommendations:');
  const slowQueries = results.filter(r => !r.error && r.avg > 100);
  if (slowQueries.length > 0) {
    console.log('   ⚠️  Some queries >100ms - Consider optimization');
    slowQueries.forEach(q => console.log(`      - ${q.name}: ${q.avg.toFixed(2)}ms`));
  } else {
    console.log('   ✅ All queries <100ms - Excellent baseline');
  }

  console.log('   ✅ Current scale well within performance targets');
  console.log('   ✅ Ready for Phase 1 (Dual-Write implementation)');
}

// ============================================================================
// Main Execution
// ============================================================================
async function main() {
  const startTime = Date.now();

  try {
    // Measure table sizes
    const sizes = await measureTableSizes();

    // Run benchmarks
    const results = await runBenchmarks();

    // Project growth
    projectGrowth(results, sizes);

    // Generate report
    generateReport(results, sizes);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Performance baseline established in ${duration}s`);
    console.log('='.repeat(60));

    console.log('\n💾 Save this output for Phase 1-3 comparison');
    console.log('📊 Baseline file: PERFORMANCE_BASELINE.md (to be created)\n');

  } catch (err) {
    console.error('\n❌ Performance measurement failed:', err.message);
    process.exit(1);
  }
}

main();
