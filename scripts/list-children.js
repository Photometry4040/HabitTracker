#!/usr/bin/env node

/**
 * List all children in the database
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

async function listChildren() {
  console.log('\n' + '='.repeat(60));
  console.log('👶 ALL CHILDREN IN DATABASE');
  console.log('='.repeat(60) + '\n');

  try {
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, user_id, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching children:', error.message);
      return;
    }

    if (!children || children.length === 0) {
      console.log('❌ No children found in database');
      return;
    }

    console.log(`✅ Found ${children.length} children:\n`);

    for (const child of children) {
      console.log(`👤 Name: "${child.name}"`);
      console.log(`  • ID: ${child.id}`);
      console.log(`  • User ID: ${child.user_id}`);
      console.log(`  • Created: ${new Date(child.created_at).toLocaleDateString()}`);

      // Count weeks for this child
      const { data: weeks, error: weeksError } = await supabase
        .from('weeks')
        .select('id')
        .eq('child_id', child.id);

      if (!weeksError && weeks) {
        console.log(`  • Weeks recorded: ${weeks.length}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('='.repeat(60) + '\n');
  process.exit(0);
}

// Run
listChildren();