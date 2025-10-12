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

console.log('🔍 Verifying Phase 0 Schema Deployment...\n');

const tables = [
  'children',
  'weeks',
  'habits',
  'habit_records',
  'habit_templates',
  'notifications'
];

let allTablesExist = true;
const results = [];

for (const table of tables) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ Table "${table}" does not exist`);
        results.push({ table, status: '❌ NOT FOUND', count: 0 });
        allTablesExist = false;
      } else {
        console.log(`⚠️  Table "${table}" - Error: ${error.message}`);
        results.push({ table, status: '⚠️  ERROR', count: 0 });
        allTablesExist = false;
      }
    } else {
      // Get count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`✅ Table "${table}" exists - ${count || 0} records`);
      results.push({ table, status: '✅ EXISTS', count: count || 0 });
    }
  } catch (err) {
    console.log(`❌ Table "${table}" - Unexpected error: ${err.message}`);
    results.push({ table, status: '❌ ERROR', count: 0 });
    allTablesExist = false;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Verification Summary');
console.log('='.repeat(60));

results.forEach(({ table, status, count }) => {
  console.log(`${status.padEnd(15)} ${table.padEnd(20)} (${count} records)`);
});

console.log('='.repeat(60));

if (allTablesExist) {
  console.log('\n🎉 SUCCESS! All 6 tables are deployed and accessible!');
  console.log('\n📋 Deployment Checklist:');
  console.log('✅ 6 tables created (children, weeks, habits, habit_records, habit_templates, notifications)');
  console.log('✅ All tables accessible via Supabase client');
  console.log('✅ Ready for Phase 0 - Day 3 (Backfill scripts)');
  console.log('\n🚀 Next Steps:');
  console.log('1. Begin backfill script development (Day 3)');
  console.log('2. Update PHASE_0_PROGRESS.md with deployment confirmation');
  process.exit(0);
} else {
  console.log('\n⚠️  INCOMPLETE! Some tables are missing or inaccessible.');
  console.log('\n📝 Action Required:');
  console.log('1. Check Supabase Dashboard SQL Editor for errors');
  console.log('2. Re-run failed migration files');
  console.log('3. Verify deployment order (001-012 in sequence)');
  console.log('4. See: MANUAL_DEPLOYMENT_REQUIRED.md for detailed guide');
  process.exit(1);
}
