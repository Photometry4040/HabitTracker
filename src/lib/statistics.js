/**
 * Statistics Library for Habit Tracker
 * Agent 2: Statistics Engineer
 *
 * This library provides advanced statistical analysis for habit tracking data
 * including weekly, monthly, and yearly metrics with trend analysis.
 */

import { supabase } from './supabase.js'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate success rate from habit records
 * green = 100%, yellow = 50%, red = 0%, none = 0%
 */
function calculateSuccessRate(records) {
  if (!records || records.length === 0) return 0

  const total = records.length
  const weighted = records.reduce((sum, record) => {
    if (record.status === 'green') return sum + 1.0
    if (record.status === 'yellow') return sum + 0.5
    return sum + 0.0 // red or none
  }, 0)

  return Math.round((weighted / total) * 100)
}

/**
 * Get color distribution from records
 */
function getColorDistribution(records) {
  const dist = { green: 0, yellow: 0, red: 0, none: 0 }

  records.forEach(record => {
    if (record.status in dist) {
      dist[record.status]++
    }
  })

  return dist
}

/**
 * Calculate trend: returns 'improving', 'declining', or 'stable'
 */
function calculateTrend(dataPoints) {
  if (dataPoints.length < 2) return 'stable'

  const recentHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))
  const olderHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))

  const recentAvg = recentHalf.reduce((sum, val) => sum + val, 0) / recentHalf.length
  const olderAvg = olderHalf.reduce((sum, val) => sum + val, 0) / olderHalf.length

  const diff = recentAvg - olderAvg

  if (diff > 5) return 'improving'  // More than 5% improvement
  if (diff < -5) return 'declining' // More than 5% decline
  return 'stable'
}

/**
 * Adjust date to nearest Monday
 */
function adjustToMonday(date) {
  const adjusted = new Date(date)
  const dayOfWeek = adjusted.getDay() // 0 = Sunday, 1 = Monday

  if (dayOfWeek === 1) return adjusted

  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  adjusted.setDate(adjusted.getDate() - daysToSubtract)

  return adjusted
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]
}

// ============================================================================
// Week Statistics
// ============================================================================

/**
 * Calculate comprehensive weekly statistics
 *
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
 * @returns {Object} Weekly statistics object
 */
export async function calculateWeekStats(childName, weekStartDate) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Adjust to Monday
    const adjustedDate = adjustToMonday(new Date(weekStartDate))
    const adjustedDateStr = formatDate(adjustedDate)

    // Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .single()

    if (childError || !child) {
      throw new Error('Child not found')
    }

    // Find week
    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .eq('week_start_date', adjustedDateStr)
      .single()

    if (weekError || !week) {
      // Return empty stats if week doesn't exist
      return {
        childName,
        weekStartDate: adjustedDateStr,
        exists: false,
        totalHabits: 0,
        totalRecords: 0,
        successRate: 0,
        distribution: { green: 0, yellow: 0, red: 0, none: 0 },
        dailyStats: [],
        habitStats: [],
        bestDay: null,
        worstDay: null,
        streak: 0
      }
    }

    // Load habits for this week
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, display_order')
      .eq('week_id', week.id)
      .order('display_order')

    if (habitsError) {
      throw new Error('Failed to load habits')
    }

    // Load all habit records for this week
    const habitIds = habits.map(h => h.id)
    const { data: allRecords, error: recordsError } = await supabase
      .from('habit_records')
      .select('habit_id, record_date, status')
      .in('habit_id', habitIds)
      .order('record_date')

    if (recordsError) {
      throw new Error('Failed to load habit records')
    }

    // Calculate overall statistics
    const totalHabits = habits.length
    const totalRecords = allRecords.length
    const successRate = calculateSuccessRate(allRecords)
    const distribution = getColorDistribution(allRecords)

    // Daily statistics (7 days)
    const dailyStats = []
    const days = ['월', '화', '수', '목', '금', '토', '일']

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(adjustedDateStr)
      currentDate.setDate(currentDate.getDate() + i)
      const dateStr = formatDate(currentDate)

      const dayRecords = allRecords.filter(r => r.record_date === dateStr)
      const daySuccessRate = calculateSuccessRate(dayRecords)
      const dayDist = getColorDistribution(dayRecords)

      dailyStats.push({
        dayOfWeek: days[i],
        date: dateStr,
        totalHabits,
        completedCount: dayRecords.length,
        successRate: daySuccessRate,
        distribution: dayDist
      })
    }

    // Find best and worst days
    const sortedDays = [...dailyStats].sort((a, b) => b.successRate - a.successRate)
    const bestDay = sortedDays[0]
    const worstDay = sortedDays[sortedDays.length - 1]

    // Habit-level statistics
    const habitStats = habits.map(habit => {
      const habitRecords = allRecords.filter(r => r.habit_id === habit.id)
      const habitSuccessRate = calculateSuccessRate(habitRecords)
      const habitDist = getColorDistribution(habitRecords)

      return {
        habitId: habit.id,
        habitName: habit.name,
        displayOrder: habit.display_order,
        totalRecords: habitRecords.length,
        successRate: habitSuccessRate,
        distribution: habitDist
      }
    })

    // Calculate streak (consecutive days above 70% success rate)
    let streak = 0
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].successRate >= 70) {
        streak++
      } else {
        break
      }
    }

    return {
      childName,
      weekStartDate: adjustedDateStr,
      exists: true,
      totalHabits,
      totalRecords,
      successRate,
      distribution,
      dailyStats,
      habitStats,
      bestDay,
      worstDay,
      streak,
      theme: week.theme || '',
      reward: week.reward || ''
    }
  } catch (error) {
    console.error('Error calculating week stats:', error)
    throw error
  }
}

// ============================================================================
// Month Statistics
// ============================================================================

/**
 * Calculate comprehensive monthly statistics
 *
 * @param {string} childName - Name of the child
 * @param {string} month - Month in YYYY-MM format
 * @returns {Object} Monthly statistics object
 */
export async function calculateMonthStats(childName, month) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Parse month (YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0) // Last day of month

    // Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .single()

    if (childError || !child) {
      throw new Error('Child not found')
    }

    // Find all weeks in this month
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .gte('week_start_date', formatDate(monthStart))
      .lte('week_start_date', formatDate(monthEnd))
      .order('week_start_date')

    if (weeksError) {
      throw new Error('Failed to load weeks')
    }

    if (weeks.length === 0) {
      return {
        childName,
        month,
        exists: false,
        totalWeeks: 0,
        avgSuccessRate: 0,
        weeklyStats: [],
        trend: 'stable',
        totalHabits: 0,
        totalRecords: 0,
        distribution: { green: 0, yellow: 0, red: 0, none: 0 }
      }
    }

    // Calculate stats for each week
    const weeklyStats = []
    let allRecords = []
    let allHabitsCount = 0

    for (const week of weeks) {
      // Load habits for this week
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('week_id', week.id)

      if (!habits || habits.length === 0) continue

      allHabitsCount += habits.length

      // Load records for this week
      const habitIds = habits.map(h => h.id)
      const { data: records } = await supabase
        .from('habit_records')
        .select('*')
        .in('habit_id', habitIds)

      if (records && records.length > 0) {
        allRecords = allRecords.concat(records)

        const weekSuccessRate = calculateSuccessRate(records)
        const weekDist = getColorDistribution(records)

        weeklyStats.push({
          weekStartDate: week.week_start_date,
          successRate: weekSuccessRate,
          distribution: weekDist,
          totalRecords: records.length,
          theme: week.theme
        })
      }
    }

    // Calculate overall monthly stats
    const avgSuccessRate = weeklyStats.length > 0
      ? Math.round(weeklyStats.reduce((sum, w) => sum + w.successRate, 0) / weeklyStats.length)
      : 0

    const distribution = getColorDistribution(allRecords)
    const trend = calculateTrend(weeklyStats.map(w => w.successRate))

    // Find best and worst weeks
    const sortedWeeks = [...weeklyStats].sort((a, b) => b.successRate - a.successRate)
    const bestWeek = sortedWeeks[0] || null
    const worstWeek = sortedWeeks[sortedWeeks.length - 1] || null

    return {
      childName,
      month,
      exists: true,
      totalWeeks: weeks.length,
      avgSuccessRate,
      weeklyStats,
      trend,
      totalHabits: allHabitsCount,
      totalRecords: allRecords.length,
      distribution,
      bestWeek,
      worstWeek
    }
  } catch (error) {
    console.error('Error calculating month stats:', error)
    throw error
  }
}

// ============================================================================
// Year Statistics
// ============================================================================

/**
 * Calculate comprehensive yearly statistics
 *
 * @param {string} childName - Name of the child
 * @param {number} year - Year (YYYY)
 * @returns {Object} Yearly statistics object
 */
export async function calculateYearStats(childName, year) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Year range
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    // Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .single()

    if (childError || !child) {
      throw new Error('Child not found')
    }

    // Find all weeks in this year
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .gte('week_start_date', formatDate(yearStart))
      .lte('week_start_date', formatDate(yearEnd))
      .order('week_start_date')

    if (weeksError) {
      throw new Error('Failed to load weeks')
    }

    if (weeks.length === 0) {
      return {
        childName,
        year,
        exists: false,
        totalWeeks: 0,
        avgSuccessRate: 0,
        monthlyStats: [],
        trend: 'stable',
        longestStreak: 0,
        totalHabits: 0,
        totalRecords: 0,
        distribution: { green: 0, yellow: 0, red: 0, none: 0 }
      }
    }

    // Group weeks by month and calculate monthly stats
    const monthlyStatsMap = new Map()
    let allRecords = []
    let allHabitsCount = 0

    for (const week of weeks) {
      const weekMonth = week.week_start_date.substring(0, 7) // YYYY-MM

      // Load habits for this week
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('week_id', week.id)

      if (!habits || habits.length === 0) continue

      allHabitsCount += habits.length

      // Load records for this week
      const habitIds = habits.map(h => h.id)
      const { data: records } = await supabase
        .from('habit_records')
        .select('*')
        .in('habit_id', habitIds)

      if (records && records.length > 0) {
        allRecords = allRecords.concat(records)

        if (!monthlyStatsMap.has(weekMonth)) {
          monthlyStatsMap.set(weekMonth, {
            month: weekMonth,
            weeks: [],
            totalRecords: 0,
            allRecords: []
          })
        }

        const monthData = monthlyStatsMap.get(weekMonth)
        monthData.weeks.push(week)
        monthData.totalRecords += records.length
        monthData.allRecords = monthData.allRecords.concat(records)
      }
    }

    // Calculate monthly aggregates
    const monthlyStats = Array.from(monthlyStatsMap.values()).map(monthData => {
      const successRate = calculateSuccessRate(monthData.allRecords)
      const distribution = getColorDistribution(monthData.allRecords)

      return {
        month: monthData.month,
        totalWeeks: monthData.weeks.length,
        successRate,
        distribution,
        totalRecords: monthData.totalRecords
      }
    }).sort((a, b) => a.month.localeCompare(b.month))

    // Calculate overall yearly stats
    const avgSuccessRate = monthlyStats.length > 0
      ? Math.round(monthlyStats.reduce((sum, m) => sum + m.successRate, 0) / monthlyStats.length)
      : 0

    const distribution = getColorDistribution(allRecords)
    const trend = calculateTrend(monthlyStats.map(m => m.successRate))

    // Calculate longest streak (consecutive weeks above 70%)
    let longestStreak = 0
    let currentStreak = 0

    for (const week of weeks) {
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('week_id', week.id)

      if (!habits || habits.length === 0) continue

      const habitIds = habits.map(h => h.id)
      const { data: records } = await supabase
        .from('habit_records')
        .select('*')
        .in('habit_id', habitIds)

      const weekSuccessRate = calculateSuccessRate(records || [])

      if (weekSuccessRate >= 70) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    // Find best and worst months
    const sortedMonths = [...monthlyStats].sort((a, b) => b.successRate - a.successRate)
    const bestMonth = sortedMonths[0] || null
    const worstMonth = sortedMonths[sortedMonths.length - 1] || null

    return {
      childName,
      year,
      exists: true,
      totalWeeks: weeks.length,
      avgSuccessRate,
      monthlyStats,
      trend,
      longestStreak,
      totalHabits: allHabitsCount,
      totalRecords: allRecords.length,
      distribution,
      bestMonth,
      worstMonth
    }
  } catch (error) {
    console.error('Error calculating year stats:', error)
    throw error
  }
}

// ============================================================================
// Comparison Statistics
// ============================================================================

/**
 * Compare statistics between two periods
 *
 * @param {Object} period1Stats - Statistics from first period
 * @param {Object} period2Stats - Statistics from second period
 * @returns {Object} Comparison object
 */
export function compareStats(period1Stats, period2Stats) {
  const diff = period2Stats.successRate - period1Stats.successRate
  const percentChange = period1Stats.successRate !== 0
    ? ((diff / period1Stats.successRate) * 100).toFixed(1)
    : 0

  return {
    successRateDiff: diff,
    percentChange: parseFloat(percentChange),
    improving: diff > 0,
    change: diff > 5 ? 'significant_improvement' :
            diff < -5 ? 'significant_decline' :
            'stable',
    period1: {
      successRate: period1Stats.successRate,
      totalRecords: period1Stats.totalRecords
    },
    period2: {
      successRate: period2Stats.successRate,
      totalRecords: period2Stats.totalRecords
    }
  }
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  calculateWeekStats,
  calculateMonthStats,
  calculateYearStats,
  compareStats,
  calculateSuccessRate,
  getColorDistribution,
  calculateTrend
}
