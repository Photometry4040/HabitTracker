/**
 * Database New Schema API
 * Read operations for new normalized schema (children, weeks, habits, habit_records)
 * Phase 2: Replaces database.js read functions
 */

import { supabase } from './supabase.js'

/**
 * Adjust date to the nearest Monday (start of week)
 * Matches Edge Function logic
 */
function adjustToMonday(date) {
  const adjusted = new Date(date);
  const dayOfWeek = adjusted.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (dayOfWeek === 1) {
    // Already Monday
    return adjusted;
  }

  // Calculate days to subtract to get to Monday
  // Sunday (0) -> -6, Tuesday (2) -> -1, Wednesday (3) -> -2, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  adjusted.setDate(adjusted.getDate() - daysToSubtract);

  return adjusted;
}

/**
 * Load week data from NEW SCHEMA
 * Replaces: loadChildData(childName, weekPeriod)
 * 
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
 * @returns {Object|null} Week data with habits array
 */
export const loadWeekDataNew = async (childName, weekStartDate) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Adjust date to Monday (same as Edge Function)
    const adjustedDate = adjustToMonday(new Date(weekStartDate));
    const adjustedDateStr = adjustedDate.toISOString().split('T')[0];

    console.log(`loadWeekDataNew: ${weekStartDate} → ${adjustedDateStr}`);

    // Step 1: Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .single()

    if (childError || !child) {
      console.log('Child not found in new schema:', childName)
      return null
    }

    // Step 2: Find week (use adjusted Monday date)
    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .eq('week_start_date', adjustedDateStr) // Use adjusted date
      .single()

    if (weekError || !week) {
      console.log('Week not found in new schema:', weekStartDate)
      return null
    }

    // Step 3: Load habits for this week
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('week_id', week.id)
      .order('display_order')

    if (habitsError) {
      console.error('Error loading habits:', habitsError)
      return null
    }

    // Step 4: Load habit_records for each habit
    const habitsWithRecords = await Promise.all(
      habits.map(async (habit) => {
        const { data: records } = await supabase
          .from('habit_records')
          .select('record_date, status')
          .eq('habit_id', habit.id)
          .order('record_date')

        // Convert records to times array (7-day format)
        // Use adjusted Monday date for calculation
        const times = Array(7).fill('')
        records.forEach(record => {
          const recordDate = new Date(record.record_date)
          const weekStart = new Date(adjustedDateStr) // Use adjusted date
          const dayIndex = Math.floor((recordDate - weekStart) / (1000 * 60 * 60 * 24))
          if (dayIndex >= 0 && dayIndex < 7) {
            times[dayIndex] = record.status
          }
        })

        return {
          id: habit.display_order,
          name: habit.name,
          times
        }
      })
    )

    // Format week_period for compatibility (use adjusted Monday date)
    const weekEnd = new Date(adjustedDateStr)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}년 ${month}월 ${day}일`
    }
    const weekPeriod = `${formatDate(new Date(adjustedDateStr))} ~ ${formatDate(weekEnd)}`

    // Return in old schema format for compatibility
    return {
      id: week.id,
      child_name: childName,
      week_period: weekPeriod,
      week_start_date: adjustedDateStr, // Return adjusted date
      theme: week.theme || '',
      habits: habitsWithRecords,
      reflection: week.reflection || {},
      reward: week.reward || '',
      created_at: week.created_at,
      updated_at: week.updated_at
    }
  } catch (error) {
    console.error('데이터 로드 오류 (new schema):', error)
    return null
  }
}

/**
 * Load all children with date ranges from NEW SCHEMA
 * Replaces: loadAllChildren()
 * 
 * @returns {Array} Array of child names with date ranges
 */
export const loadAllChildrenNew = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Load all children for this user
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name')
      .eq('user_id', user.id)

    if (childrenError) {
      console.error('Error loading children:', childrenError)
      return []
    }

    // For each child, get first and last week dates
    const childrenWithDates = await Promise.all(
      children.map(async (child) => {
        const { data: weeks, error: weeksError } = await supabase
          .from('weeks')
          .select('week_start_date')
          .eq('child_id', child.id)
          .order('week_start_date')

        if (weeksError || !weeks || weeks.length === 0) {
          return {
            child_name: child.name,
            periods: [],
            firstDate: null,
            lastDate: null
          }
        }

        // Format week periods
        const periods = weeks.map(w => {
          const weekStart = new Date(w.week_start_date)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          
          const formatDate = (date) => {
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            return `${year}년 ${month}월 ${day}일`
          }
          
          return `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`
        })

        return {
          child_name: child.name,
          periods,
          firstDate: weeks[0].week_start_date,
          lastDate: weeks[weeks.length - 1].week_start_date
        }
      })
    )

    // Group by child_name and aggregate periods
    const childMap = new Map()
    childrenWithDates.forEach(item => {
      if (!childMap.has(item.child_name)) {
        childMap.set(item.child_name, {
          child_name: item.child_name,
          periods: item.periods,
          dates: {
            first: item.firstDate,
            last: item.lastDate
          }
        })
      } else {
        const existing = childMap.get(item.child_name)
        existing.periods.push(...item.periods)
      }
    })

    return Array.from(childMap.values())
  } catch (error) {
    console.error('전체 아이 데이터 로드 오류 (new schema):', error)
    return []
  }
}

/**
 * Load all weeks for a specific child from NEW SCHEMA
 * Replaces: loadChildWeeks(childName)
 * 
 * @param {string} childName - Name of the child
 * @returns {Array} Array of week periods
 */
export const loadChildWeeksNew = async (childName) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .single()

    if (childError || !child) {
      console.log('Child not found:', childName)
      return []
    }

    // Load all weeks for this child
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('week_start_date')
      .eq('child_id', child.id)
      .order('week_start_date')

    if (weeksError) {
      console.error('Error loading weeks:', weeksError)
      return []
    }

    // Convert to week_period format
    return weeks.map(week => {
      const weekStart = new Date(week.week_start_date)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const formatDate = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${year}년 ${month}월 ${day}일`
      }
      
      return `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`
    })
  } catch (error) {
    console.error('아이별 주차 로드 오류 (new schema):', error)
    return []
  }
}
