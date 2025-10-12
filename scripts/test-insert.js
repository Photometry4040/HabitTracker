import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('children')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Child',
      source_version: 'migration'
    })
    .select();
  
  console.log('Insert result:', { data, error });
  
  // Clean up
  if (data && data.length > 0) {
    await supabase
      .from('children')
      .delete()
      .eq('id', data[0].id);
    console.log('Cleaned up test record');
  }
}

testInsert();
