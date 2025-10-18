#!/usr/bin/env node

/**
 * Check RLS status for all tables
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
const SUPABASE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY

// Import Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('🔒 Checking RLS status...\n')

// Query to check RLS status
const query = `
  SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
  ORDER BY tablename;
`

const { data, error } = await supabase.rpc('exec_sql', { sql_query: query })

if (error) {
  // Try direct query
  console.log('Trying alternative method...')

  const tables = ['children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications', 'habit_tracker']

  for (const table of tables) {
    try {
      // Try to query the table
      const { data: testData, error: testError } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      console.log(`${table}: ${testError ? '❌ Error - ' + testError.message : '✅ Accessible'}`)
    } catch (e) {
      console.log(`${table}: ❌ ${e.message}`)
    }
  }
} else {
  console.log('RLS Status:')
  console.log(data)
}

console.log('\n✅ Check complete')
