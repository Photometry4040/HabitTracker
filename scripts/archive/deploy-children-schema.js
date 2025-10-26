// Deploy children table schema to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://gqvyzqodyspvwlwfjmfg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxdnl6cW9keXNwdndsd2ZqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTI1NDIsImV4cCI6MjA2NzcyODU0Mn0.qAZp9j0NY_b-NhHDejNoO_NGOQ_602-74gr0cZCJwbk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySchema() {
  console.log('🚀 Deploying children table schema to Supabase...\n');

  try {
    // Read migration files
    const tableDDL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/001_create_children_table.sql'),
      'utf8'
    );

    const indexDDL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/002_create_children_indexes.sql'),
      'utf8'
    );

    console.log('📋 Step 1: Creating children table...');
    // Note: Supabase JS client doesn't support executing raw DDL
    // We need to use RPC or direct SQL execution through the admin API
    console.log('⚠️  Note: DDL execution requires Supabase Admin API or psql connection\n');

    // Alternative: Verify table structure exists
    console.log('📊 Step 2: Verifying existing database structure...');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'children');

    if (tablesError) {
      console.log('ℹ️  Unable to query information_schema (expected - requires elevated permissions)');
    }

    // Test table access
    console.log('📊 Step 3: Testing children table access...');
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "children" does not exist')) {
        console.log('❌ children table does not exist yet');
        console.log('\n📝 Manual deployment required:');
        console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/editor');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Copy and execute: supabase/migrations/001_create_children_table.sql');
        console.log('   4. Copy and execute: supabase/migrations/002_create_children_indexes.sql');
      } else {
        console.log('❌ Error:', error.message);
      }
    } else {
      console.log('✅ children table exists and is accessible!');
      console.log(`   Found ${data.length} records`);
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploySchema();
