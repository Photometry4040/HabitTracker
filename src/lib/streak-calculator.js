/**
 * Streak Calculator for Habit Tracking
 * Calculates consecutive days and green days for reward triggers
 */

/**
 * Calculate consecutive days for a habit (any non-null status)
 * @param {Array} records - Array of habit_records sorted by date DESC
 * @returns {number} Current streak count
 */
export function calculateStreak(records) {
  if (!records || records.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sort records by date descending
  const sortedRecords = [...records].sort((a, b) =>
    new Date(b.record_date) - new Date(a.record_date)
  )

  // Start from most recent date
  let checkDate = new Date(today)

  for (const record of sortedRecords) {
    const recordDate = new Date(record.record_date)
    recordDate.setHours(0, 0, 0, 0)

    // Check if this record is for the expected date
    if (recordDate.getTime() === checkDate.getTime() && record.status) {
      streak++
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (recordDate.getTime() < checkDate.getTime()) {
      // Gap found, stop counting
      break
    }
  }

  return streak
}

/**
 * Calculate consecutive green days for a habit
 * @param {Array} records - Array of habit_records sorted by date DESC
 * @returns {number} Current green streak count
 */
export function calculateGreenStreak(records) {
  if (!records || records.length === 0) return 0

  let greenStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sort records by date descending
  const sortedRecords = [...records].sort((a, b) =>
    new Date(b.record_date) - new Date(a.record_date)
  )

  // Start from most recent date
  let checkDate = new Date(today)

  for (const record of sortedRecords) {
    const recordDate = new Date(record.record_date)
    recordDate.setHours(0, 0, 0, 0)

    // Check if this record is for the expected date AND is green
    if (recordDate.getTime() === checkDate.getTime() && record.status === 'green') {
      greenStreak++
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (recordDate.getTime() <= checkDate.getTime()) {
      // Non-green or gap found, stop counting
      break
    }
  }

  return greenStreak
}

/**
 * Get habit records for streak calculation
 * Fetches records from current and previous weeks for a specific habit
 *
 * Strategy:
 * 1. Get habit details (to find week_id and habit name)
 * 2. Get child_id from week
 * 3. Find all weeks for this child
 * 4. Find all habits with same name across weeks
 * 5. Fetch all records for these habits (last 60 days for performance)
 *
 * @param {string} habitId - Current habit ID
 * @returns {Promise<Array>} Array of habit records sorted by date DESC
 */
export async function getHabitRecordsForStreak(habitId) {
  try {
    const { supabase } = await import('./supabase.js')
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Streak Calculator] User not authenticated')
      return []
    }

    // Step 1: Get habit details (week_id, name)
    const { data: currentHabit, error: habitError } = await supabase
      .from('habits')
      .select('id, name, week_id')
      .eq('id', habitId)
      .maybeSingle()

    if (habitError || !currentHabit) {
      console.error('[Streak Calculator] Failed to fetch habit:', habitError)
      return []
    }

    // Step 2: Get child_id from week
    const { data: currentWeek, error: weekError } = await supabase
      .from('weeks')
      .select('id, child_id, user_id')
      .eq('id', currentHabit.week_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (weekError || !currentWeek) {
      console.error('[Streak Calculator] Failed to fetch week:', weekError)
      return []
    }

    // Step 3: Find all habits with same name for this child (last 60 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const cutoffDate = sixtyDaysAgo.toISOString().split('T')[0]

    const { data: allWeeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id')
      .eq('child_id', currentWeek.child_id)
      .eq('user_id', user.id)
      .gte('week_start_date', cutoffDate)

    if (weeksError || !allWeeks || allWeeks.length === 0) {
      console.error('[Streak Calculator] Failed to fetch weeks:', weeksError)
      return []
    }

    const weekIds = allWeeks.map(w => w.id)

    // Step 4: Find all habits with same name across these weeks
    const { data: matchingHabits, error: habitsError } = await supabase
      .from('habits')
      .select('id')
      .in('week_id', weekIds)
      .eq('name', currentHabit.name)

    if (habitsError || !matchingHabits || matchingHabits.length === 0) {
      console.warn('[Streak Calculator] No matching habits found')
      return []
    }

    const habitIds = matchingHabits.map(h => h.id)

    // Step 5: Fetch all records for these habits
    const { data: records, error: recordsError } = await supabase
      .from('habit_records')
      .select('id, habit_id, record_date, status')
      .in('habit_id', habitIds)
      .gte('record_date', cutoffDate)
      .order('record_date', { ascending: false })

    if (recordsError) {
      console.error('[Streak Calculator] Failed to fetch records:', recordsError)
      return []
    }

    console.log(`[Streak Calculator] Found ${records?.length || 0} records for habit "${currentHabit.name}"`)
    return records || []

  } catch (error) {
    console.error('[Streak Calculator] Unexpected error:', error)
    return []
  }
}
