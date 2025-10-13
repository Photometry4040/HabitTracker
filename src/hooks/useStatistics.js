/**
 * React Query Hooks for Statistics
 * Agent 2: Statistics Engineer
 *
 * Custom hooks for fetching and caching habit statistics data
 * with optimized cache strategies and automatic refetching.
 */

import { useQuery, useQueries } from '@tanstack/react-query'
import {
  calculateWeekStats,
  calculateMonthStats,
  calculateYearStats,
  compareStats
} from '@/lib/statistics.js'

// ============================================================================
// Query Keys (for consistent cache management)
// ============================================================================

export const statsKeys = {
  all: ['stats'],
  week: (childName, weekStartDate) => ['stats', 'week', childName, weekStartDate],
  month: (childName, month) => ['stats', 'month', childName, month],
  year: (childName, year) => ['stats', 'year', childName, year],
  comparison: (period1, period2) => ['stats', 'comparison', period1, period2]
}

// ============================================================================
// Weekly Statistics Hook
// ============================================================================

/**
 * Fetch weekly statistics for a specific child and week
 *
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with weekly stats
 */
export function useWeekStats(childName, weekStartDate, options = {}) {
  return useQuery({
    queryKey: statsKeys.week(childName, weekStartDate),
    queryFn: () => calculateWeekStats(childName, weekStartDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!childName && !!weekStartDate, // Only run if both params exist
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  })
}

// ============================================================================
// Monthly Statistics Hook
// ============================================================================

/**
 * Fetch monthly statistics for a specific child and month
 *
 * @param {string} childName - Name of the child
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with monthly stats
 */
export function useMonthStats(childName, month, options = {}) {
  return useQuery({
    queryKey: statsKeys.month(childName, month),
    queryFn: () => calculateMonthStats(childName, month),
    staleTime: 30 * 60 * 1000, // 30 minutes (monthly data changes less frequently)
    cacheTime: 60 * 60 * 1000, // 1 hour
    enabled: !!childName && !!month,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  })
}

// ============================================================================
// Yearly Statistics Hook
// ============================================================================

/**
 * Fetch yearly statistics for a specific child and year
 *
 * @param {string} childName - Name of the child
 * @param {number} year - Year (YYYY)
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with yearly stats
 */
export function useYearStats(childName, year, options = {}) {
  return useQuery({
    queryKey: statsKeys.year(childName, year),
    queryFn: () => calculateYearStats(childName, year),
    staleTime: 60 * 60 * 1000, // 1 hour (yearly data is very stable)
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!childName && !!year,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  })
}

// ============================================================================
// Multiple Weeks Statistics Hook
// ============================================================================

/**
 * Fetch statistics for multiple weeks (useful for monthly view with 4 weeks)
 *
 * @param {string} childName - Name of the child
 * @param {Array<string>} weekStartDates - Array of week start dates
 * @param {Object} options - Additional React Query options
 * @returns {Array<Object>} Array of React Query results
 */
export function useMultipleWeeksStats(childName, weekStartDates, options = {}) {
  return useQueries({
    queries: weekStartDates.map(weekStartDate => ({
      queryKey: statsKeys.week(childName, weekStartDate),
      queryFn: () => calculateWeekStats(childName, weekStartDate),
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      enabled: !!childName && !!weekStartDate,
      retry: 2,
      ...options
    }))
  })
}

// ============================================================================
// Comparison Hook
// ============================================================================

/**
 * Compare statistics between two periods
 *
 * @param {Object} period1Query - First period query result
 * @param {Object} period2Query - Second period query result
 * @returns {Object} Comparison statistics
 */
export function useStatsComparison(period1Query, period2Query) {
  return useQuery({
    queryKey: statsKeys.comparison(
      period1Query.data?.weekStartDate || period1Query.data?.month,
      period2Query.data?.weekStartDate || period2Query.data?.month
    ),
    queryFn: () => {
      if (!period1Query.data || !period2Query.data) {
        throw new Error('Both periods must have data for comparison')
      }
      return compareStats(period1Query.data, period2Query.data)
    },
    enabled: !!period1Query.data && !!period2Query.data,
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000
  })
}

// ============================================================================
// Current Week Hook (convenience hook for "today")
// ============================================================================

/**
 * Get statistics for the current week (convenience hook)
 *
 * @param {string} childName - Name of the child
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with current week stats
 */
export function useCurrentWeekStats(childName, options = {}) {
  // Calculate current week's Monday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(monday.getDate() - daysToMonday)
  const weekStartDate = monday.toISOString().split('T')[0]

  return useWeekStats(childName, weekStartDate, options)
}

// ============================================================================
// Current Month Hook (convenience hook)
// ============================================================================

/**
 * Get statistics for the current month (convenience hook)
 *
 * @param {string} childName - Name of the child
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with current month stats
 */
export function useCurrentMonthStats(childName, options = {}) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return useMonthStats(childName, month, options)
}

// ============================================================================
// Current Year Hook (convenience hook)
// ============================================================================

/**
 * Get statistics for the current year (convenience hook)
 *
 * @param {string} childName - Name of the child
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result with current year stats
 */
export function useCurrentYearStats(childName, options = {}) {
  const year = new Date().getFullYear()

  return useYearStats(childName, year, options)
}

// ============================================================================
// Prefetch Helper
// ============================================================================

/**
 * Prefetch statistics data (useful for preloading data before navigation)
 *
 * @param {Object} queryClient - React Query client
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date
 */
export async function prefetchWeekStats(queryClient, childName, weekStartDate) {
  await queryClient.prefetchQuery({
    queryKey: statsKeys.week(childName, weekStartDate),
    queryFn: () => calculateWeekStats(childName, weekStartDate),
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Prefetch monthly statistics
 *
 * @param {Object} queryClient - React Query client
 * @param {string} childName - Name of the child
 * @param {string} month - Month in YYYY-MM format
 */
export async function prefetchMonthStats(queryClient, childName, month) {
  await queryClient.prefetchQuery({
    queryKey: statsKeys.month(childName, month),
    queryFn: () => calculateMonthStats(childName, month),
    staleTime: 30 * 60 * 1000
  })
}

// ============================================================================
// Invalidation Helpers
// ============================================================================

/**
 * Invalidate all statistics for a child (useful after data updates)
 *
 * @param {Object} queryClient - React Query client
 * @param {string} childName - Name of the child
 */
export async function invalidateChildStats(queryClient, childName) {
  await queryClient.invalidateQueries({
    queryKey: ['stats'],
    predicate: (query) => {
      const [, , queryChildName] = query.queryKey
      return queryChildName === childName
    }
  })
}

/**
 * Invalidate specific week statistics
 *
 * @param {Object} queryClient - React Query client
 * @param {string} childName - Name of the child
 * @param {string} weekStartDate - Week start date
 */
export async function invalidateWeekStats(queryClient, childName, weekStartDate) {
  await queryClient.invalidateQueries({
    queryKey: statsKeys.week(childName, weekStartDate)
  })
}

// ============================================================================
// Export all hooks
// ============================================================================

export default {
  useWeekStats,
  useMonthStats,
  useYearStats,
  useMultipleWeeksStats,
  useStatsComparison,
  useCurrentWeekStats,
  useCurrentMonthStats,
  useCurrentYearStats,
  prefetchWeekStats,
  prefetchMonthStats,
  invalidateChildStats,
  invalidateWeekStats,
  statsKeys
}
