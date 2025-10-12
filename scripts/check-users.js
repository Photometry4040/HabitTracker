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

async function checkUsers() {
  // Try to get users from auth.users (this may not work with anon key)
  const { data, error } = await supabase
    .from('habit_tracker')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    console.log('Sample habit_tracker record:', data[0]);
  }
  
  // Check if we can query auth schema (usually not possible with anon key)
  const { data: authData, error: authError } = await supabase
    .rpc('auth.users');
  
  console.log('Auth query:', { authData, authError });
}

checkUsers();
