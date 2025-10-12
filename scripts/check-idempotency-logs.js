#!/usr/bin/env node

/**
 * Check Idempotency Logs
 * Displays recent Edge Function operations tracked for idempotency
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env
let supabaseUrl, supabaseAnonKey;
try {
  const envFile = readFileSync('.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('📝 Checking Idempotency Logs\n')

async function checkLogs() {
  try {
    // Fetch recent logs
    const { data: logs, error } = await supabase
      .from('idempotency_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ Error fetching logs:', error.message)
      return
    }

    if (!logs || logs.length === 0) {
      console.log('📭 No idempotency logs found')
      console.log('💡 This is normal if no Edge Function operations have been performed yet')
      return
    }

    console.log(`✅ Found ${logs.length} recent logs\n`)

    // Group by operation
    const byOperation = logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1
      return acc
    }, {})

    console.log('📊 Operations Summary:')
    Object.entries(byOperation).forEach(([op, count]) => {
      console.log(`  - ${op}: ${count}`)
    })
    console.log()

    // Show recent logs
    console.log('📋 Recent Logs (latest 10):')
    console.log('─'.repeat(80))

    logs.slice(0, 10).forEach((log, index) => {
      const timeAgo = getTimeAgo(new Date(log.created_at))
      const expiresIn = getTimeUntil(new Date(log.expires_at))

      console.log(`\n${index + 1}. ${log.operation}`)
      console.log(`   Key: ${log.key.substring(0, 40)}...`)
      console.log(`   Status: ${log.status}`)
      console.log(`   Created: ${timeAgo} ago`)
      console.log(`   Expires: in ${expiresIn}`)

      if (log.request_data) {
        console.log(`   Request:`, {
          child_name: log.request_data.child_name,
          week_start_date: log.request_data.week_start_date,
          habit_name: log.request_data.habit_name || '(N/A)'
        })
      }
    })

    console.log('\n' + '─'.repeat(80))

    // Check for errors
    const errors = logs.filter(log => log.status === 'failed')
    if (errors.length > 0) {
      console.log(`\n⚠️  Found ${errors.length} failed operations:`)
      errors.forEach(log => {
        console.log(`  - ${log.operation} (${log.key}):`, log.response_data?.error)
      })
    }

    // Expiration check
    const expiringSoon = logs.filter(log => {
      const expiresAt = new Date(log.expires_at)
      const now = new Date()
      const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60)
      return hoursUntilExpiry < 1
    })

    if (expiringSoon.length > 0) {
      console.log(`\n⏰ ${expiringSoon.length} logs expiring within 1 hour`)
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

function getTimeAgo(date) {
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return `${seconds} seconds`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`
  return `${Math.floor(seconds / 86400)} days`
}

function getTimeUntil(date) {
  const now = new Date()
  const seconds = Math.floor((date - now) / 1000)

  if (seconds < 0) return 'EXPIRED'
  if (seconds < 60) return `${seconds} seconds`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`
  return `${Math.floor(seconds / 86400)} days`
}

checkLogs()
