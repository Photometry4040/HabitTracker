/**
 * Supabase Helper Functions for Discord Bot
 *
 * This module provides helper functions to query habit data from Supabase.
 * Uses the new normalized schema: children, weeks, habits, habit_records.
 * Falls back to stats_weekly materialized view when available.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get child's weekly habit data using the new schema
 *
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date in ISO format (YYYY-MM-DD)
 * @returns {Promise<Object|null>} Weekly habit data or null if not found
 */
export async function getChildWeekData(childName, weekStartDate) {
  try {
    // Step 1: Find child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('name', childName)
      .single();

    if (childError || !child) {
      console.error('Child not found:', childError);
      return null;
    }

    // Step 2: Find week
    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .eq('week_start_date', weekStartDate)
      .single();

    if (weekError || !week) {
      console.error('Week not found:', weekError);
      return null;
    }

    // Step 3: Get habits for this week
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, display_order')
      .eq('week_id', week.id)
      .order('display_order', { ascending: true });

    if (habitsError) {
      console.error('Error fetching habits:', habitsError);
      return null;
    }

    // Step 4: Get habit records (7 days per habit)
    const habitIds = habits.map(h => h.id);
    const { data: records, error: recordsError } = await supabase
      .from('habit_records')
      .select('habit_id, day_of_week, status')
      .in('habit_id', habitIds)
      .order('day_of_week', { ascending: true });

    if (recordsError) {
      console.error('Error fetching habit records:', recordsError);
      return null;
    }

    // Step 5: Organize data structure
    const habitsWithRecords = habits.map(habit => {
      const habitRecords = records.filter(r => r.habit_id === habit.id);

      // Create 7-day array (0=Monday, 6=Sunday)
      const times = Array(7).fill('none');
      habitRecords.forEach(record => {
        times[record.day_of_week] = record.status;
      });

      return {
        id: habit.id,
        name: habit.name,
        times: times
      };
    });

    return {
      childName: child.name,
      weekStartDate: week.week_start_date,
      weekEndDate: week.week_end_date,
      weekPeriod: formatWeekPeriod(week.week_start_date, week.week_end_date),
      theme: week.theme,
      reward: week.reward,
      habits: habitsWithRecords,
      weekId: week.id
    };

  } catch (error) {
    console.error('Error in getChildWeekData:', error);
    return null;
  }
}

/**
 * Get weekly statistics from materialized view (faster)
 * Falls back to live calculation if view is not available
 *
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date in ISO format
 * @returns {Promise<Object|null>} Weekly statistics or null
 */
export async function getWeeklyStats(childName, weekStartDate) {
  try {
    // Try materialized view first (created by Agent 2)
    const { data: stats, error: statsError } = await supabase
      .from('stats_weekly')
      .select('*')
      .eq('child_name', childName)
      .eq('week_start_date', weekStartDate)
      .single();

    if (!statsError && stats) {
      return {
        childName: stats.child_name,
        weekStartDate: stats.week_start_date,
        weekEndDate: stats.week_end_date,
        totalHabits: stats.total_habits,
        greenCount: stats.green_count,
        yellowCount: stats.yellow_count,
        redCount: stats.red_count,
        noneCount: stats.none_count,
        successRate: stats.success_rate,
        completionRate: stats.completion_rate,
        theme: stats.theme,
        reward: stats.reward
      };
    }

    // Fallback: Calculate stats manually from raw data
    const weekData = await getChildWeekData(childName, weekStartDate);
    if (!weekData) return null;

    return calculateStats(weekData);

  } catch (error) {
    console.error('Error in getWeeklyStats:', error);
    return null;
  }
}

/**
 * Calculate statistics from habit data
 *
 * @param {Object} weekData - Week data from getChildWeekData
 * @returns {Object} Calculated statistics
 */
function calculateStats(weekData) {
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let noneCount = 0;

  weekData.habits.forEach(habit => {
    habit.times.forEach(status => {
      if (status === 'green') greenCount++;
      else if (status === 'yellow') yellowCount++;
      else if (status === 'red') redCount++;
      else noneCount++;
    });
  });

  const totalRecords = greenCount + yellowCount + redCount + noneCount;
  const checkedRecords = totalRecords - noneCount;
  const successRate = checkedRecords > 0
    ? Math.round((greenCount / checkedRecords) * 100 * 100) / 100
    : 0;
  const completionRate = checkedRecords > 0
    ? Math.round(((greenCount + yellowCount) / checkedRecords) * 100 * 100) / 100
    : 0;

  return {
    childName: weekData.childName,
    weekStartDate: weekData.weekStartDate,
    weekEndDate: weekData.weekEndDate,
    totalHabits: weekData.habits.length,
    greenCount,
    yellowCount,
    redCount,
    noneCount,
    successRate,
    completionRate,
    theme: weekData.theme,
    reward: weekData.reward
  };
}

/**
 * Get list of all children for a user
 *
 * @returns {Promise<Array>} List of children
 */
export async function getAllChildren() {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching children:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error in getAllChildren:', error);
    return [];
  }
}

/**
 * Get all weeks for a specific child
 *
 * @param {string} childName - Name of the child
 * @returns {Promise<Array>} List of weeks
 */
export async function getChildWeeks(childName) {
  try {
    // Find child first
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('name', childName)
      .single();

    if (childError || !child) {
      console.error('Child not found:', childError);
      return [];
    }

    // Get all weeks for this child
    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, week_start_date, week_end_date, theme, reward, created_at')
      .eq('child_id', child.id)
      .order('week_start_date', { ascending: false });

    if (weeksError) {
      console.error('Error fetching weeks:', weeksError);
      return [];
    }

    return weeks.map(week => ({
      weekId: week.id,
      weekStartDate: week.week_start_date,
      weekEndDate: week.week_end_date,
      weekPeriod: formatWeekPeriod(week.week_start_date, week.week_end_date),
      theme: week.theme,
      reward: week.reward,
      createdAt: week.created_at
    }));

  } catch (error) {
    console.error('Error in getChildWeeks:', error);
    return [];
  }
}

/**
 * Format week period in Korean format
 * Example: "2025년 10월 13일 ~ 2025년 10월 19일"
 *
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {string} Formatted week period
 */
function formatWeekPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export default {
  getChildWeekData,
  getWeeklyStats,
  getAllChildren,
  getChildWeeks
};
