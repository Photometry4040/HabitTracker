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
 * Note: This is a simplified version. In production, you would:
 * 1. Fetch records from database for specific habit
 * 2. Include records from multiple weeks if needed
 * 3. Cache results for performance
 *
 * @param {string} habitId - Habit ID
 * @returns {Promise<Array>} Array of habit records
 */
export async function getHabitRecordsForStreak(habitId) {
  // TODO: Implement database query
  // For now, return empty array (streak checking will be disabled)
  console.warn('[Streak Calculator] getHabitRecordsForStreak not yet implemented')
  return []
}
