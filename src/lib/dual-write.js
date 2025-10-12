/**
 * Dual-Write API Wrapper
 * Calls Edge Function for dual-write operations
 */

import { supabase } from './supabase.js'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dual-write-habit`

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(operation) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `webapp-${operation}-${timestamp}-${random}`
}

/**
 * Call Edge Function with idempotency
 */
async function callEdgeFunction(operation, data) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('인증되지 않은 사용자입니다.')
  }

  const idempotencyKey = generateIdempotencyKey(operation)
  
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      operation,
      data
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Edge Function call failed')
  }

  return await response.json()
}

/**
 * Create week with dual-write
 */
export async function createWeekDualWrite(childName, weekStartDate, habits, theme, reflection, reward) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('인증되지 않은 사용자입니다.')
  }

  const result = await callEdgeFunction('create_week', {
    user_id: user.id,
    child_name: childName,
    week_start_date: weekStartDate,
    habits: habits || [],
    theme: theme || '',
    reflection: reflection || {},
    reward: reward || ''
  })

  return result
}

/**
 * Update habit record with dual-write
 */
export async function updateHabitRecordDualWrite(childName, weekStartDate, habitName, dayIndex, status) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('인증되지 않은 사용자입니다.')
  }

  const result = await callEdgeFunction('update_habit_record', {
    user_id: user.id,
    child_name: childName,
    week_start_date: weekStartDate,
    habit_name: habitName,
    day_index: dayIndex,
    status
  })

  return result
}

/**
 * Delete week with dual-write
 */
export async function deleteWeekDualWrite(childName, weekStartDate) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('인증되지 않은 사용자입니다.')
  }

  const result = await callEdgeFunction('delete_week', {
    user_id: user.id,
    child_name: childName,
    week_start_date: weekStartDate
  })

  return result
}

/**
 * Verify data consistency
 */
export async function verifyConsistency() {
  const result = await callEdgeFunction('verify_consistency', {})
  return result
}
