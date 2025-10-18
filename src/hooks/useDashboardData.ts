import { useQuery, UseQueryResult } from 'react-query';
import { supabase } from '@/lib/supabase';

const DASHBOARD_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-aggregation`;

/**
 * Fetch comparison data for all children
 */
export function useComparisonData(userId: string): UseQueryResult<any> {
  return useQuery(
    ['comparison', userId],
    async () => {
      if (!userId) return null;

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(DASHBOARD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          operation: 'comparison',
          data: { userId },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const result = await response.json();
      return result.result;
    },
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
      refetchInterval: 30 * 1000, // 30초마다 새로고침
    }
  );
}

/**
 * Fetch trend data for a specific child
 */
export function useTrendData(
  childId: string,
  weeks: number = 8
): UseQueryResult<any> {
  return useQuery(
    ['trend', childId, weeks],
    async () => {
      if (!childId) return null;

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(DASHBOARD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          operation: 'trends',
          data: { childId, weeks },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }

      const result = await response.json();
      return result.result;
    },
    {
      enabled: !!childId,
      staleTime: 10 * 60 * 1000, // 10분
      cacheTime: 15 * 60 * 1000, // 15분
    }
  );
}

/**
 * Fetch insights for a specific child
 */
export function useInsights(
  childId: string,
  weeks: number = 4
): UseQueryResult<any> {
  return useQuery(
    ['insights', childId, weeks],
    async () => {
      if (!childId) return null;

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(DASHBOARD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          operation: 'insights',
          data: { childId, weeks },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const result = await response.json();
      return result.result;
    },
    {
      enabled: !!childId,
      staleTime: 10 * 60 * 1000, // 10분
      cacheTime: 15 * 60 * 1000, // 15분
    }
  );
}

/**
 * Fetch monthly statistics for a specific child
 */
export function useMonthlyStats(
  childId: string,
  year: number,
  month: number
): UseQueryResult<any> {
  return useQuery(
    ['monthly', childId, year, month],
    async () => {
      if (!childId) return null;

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(DASHBOARD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          operation: 'monthly',
          data: { childId, year, month },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch monthly stats');
      }

      const result = await response.json();
      return result.result;
    },
    {
      enabled: !!childId && !!year && !!month,
      staleTime: 15 * 60 * 1000, // 15분
      cacheTime: 30 * 60 * 1000, // 30분
    }
  );
}

/**
 * Invalidate all dashboard queries
 */
export function useInvalidateDashboardQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateComparison: (userId: string) =>
      queryClient.invalidateQueries(['comparison', userId]),
    invalidateTrend: (childId: string) =>
      queryClient.invalidateQueries(['trend', childId]),
    invalidateInsights: (childId: string) =>
      queryClient.invalidateQueries(['insights', childId]),
    invalidateMonthly: (childId: string) =>
      queryClient.invalidateQueries(['monthly', childId]),
    invalidateAll: () => queryClient.invalidateQueries(['comparison', 'trend', 'insights', 'monthly']),
  };
}
