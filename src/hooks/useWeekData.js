import { useQuery } from '@tanstack/react-query'
import { loadWeekDataNew as loadChildData } from '@/lib/database-new.js'

export const weekDataKeys = {
  all: ['weekData'],
  detail: (childName, weekStartDate) => ['weekData', childName, weekStartDate],
}

/**
 * React Query hook for fetching week data.
 * Returns raw data from the database; state population is handled by the consumer.
 */
export function useWeekData(childName, weekStartDate) {
  return useQuery({
    queryKey: weekDataKeys.detail(childName, weekStartDate),
    queryFn: () => loadChildData(childName, weekStartDate),
    staleTime: 2 * 60 * 1000,
    enabled: !!childName && !!weekStartDate,
    retry: 1,
  })
}
