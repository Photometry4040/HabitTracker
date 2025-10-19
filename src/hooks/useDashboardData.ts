import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getISOWeekNumber } from '@/lib/weekNumber.js';

const DASHBOARD_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-aggregation`;

/**
 * 실제 데이터베이스 기반 Mock 데이터 생성
 */
async function generateMockComparisonData(userId: string) {
  try {
    // 사용자의 모든 아이 정보 가져오기
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name')
      .eq('user_id', userId);

    if (error || !children || children.length === 0) {
      console.warn('No children found, using default mock data');
      return getDefaultMockComparisonData();
    }

    // 각 아이별로 완료율 시뮬레이션
    const completionRates = [95, 78, 65, 82, 71, 88];
    const lastWeekRates = [87, 82, 60, 75, 68, 85];

    const childrenData = children.map((child, index) => {
      const currentRate = completionRates[index % completionRates.length];
      const lastWeekRate = lastWeekRates[index % lastWeekRates.length];
      const trend = currentRate > lastWeekRate ? 'up' : currentRate < lastWeekRate ? 'down' : 'stable';

      return {
        child_id: child.id,
        child_name: child.name,
        current_rate: currentRate,
        last_week_rate: lastWeekRate,
        trend,
        trend_value: Math.abs(currentRate - lastWeekRate),
        total_habits: 5,
        completed_habits: Math.round((currentRate / 100) * 5),
      };
    });

    // 완료율 기준으로 정렬 및 순위 매기기
    childrenData.sort((a, b) => b.current_rate - a.current_rate);
    const rankedData = childrenData.map((child, index) => ({
      ...child,
      rank: index + 1,
      rank_emoji: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐',
    }));

    const today = new Date();
    const month = today.getMonth() + 1;

    return {
      children: rankedData,
      week: `${today.getFullYear()}년 ${month}월`,
    };
  } catch (error) {
    console.error('Error generating mock comparison data:', error);
    return getDefaultMockComparisonData();
  }
}

/**
 * 기본 Mock 데이터 (아이가 없을 경우)
 */
function getDefaultMockComparisonData() {
  return {
    children: [
      { child_id: '1', child_name: '지우', current_rate: 95, last_week_rate: 87, trend: 'up', trend_value: 8, total_habits: 5, completed_habits: 5, rank: 1, rank_emoji: '🥇' },
      { child_id: '2', child_name: '민준', current_rate: 78, last_week_rate: 82, trend: 'down', trend_value: 4, total_habits: 5, completed_habits: 4, rank: 2, rank_emoji: '🥈' },
      { child_id: '3', child_name: '수아', current_rate: 65, last_week_rate: 60, trend: 'up', trend_value: 5, total_habits: 5, completed_habits: 3, rank: 3, rank_emoji: '🥉' },
    ],
    week: '2025년 10월',
  };
}

/**
 * 실제 데이터베이스 기반 Trend 데이터 생성 (빈 주차 제외)
 * 실제로 기록된 주차만 반환 (최신 weeksCount개)
 */
async function generateMockTrendData(childId: string, weeksCount: number) {
  try {
    console.log(`[Trend] Fetching recent ${weeksCount} weeks for child: ${childId}`);

    // 해당 아이의 주 데이터 가져오기 (모든 주 조회)
    let weeks;
    let error;

    // 정확한 child_id로 조회
    const result1 = await supabase
      .from('weeks')
      .select('id, week_start_date, child_id')
      .eq('child_id', childId)
      .order('week_start_date', { ascending: true });

    weeks = result1.data;
    error = result1.error;

    // 아이의 weeks가 없으면, 모든 weeks에서 선택 (폴백)
    if (!weeks || weeks.length === 0) {
      console.warn(`[Trend] No weeks found for specific child, trying all weeks...`);

      const allWeeksResult = await supabase
        .from('weeks')
        .select('id, week_start_date, child_id')
        .order('week_start_date', { ascending: true });

      weeks = allWeeksResult.data || [];
      console.log(`[Trend] Found ${weeks.length} weeks from all children`);

      if (weeks.length > 0) {
        console.warn(`[Trend] Using weeks from other children - child_ids:`,
          [...new Set(weeks.map(w => w.child_id))]);
      }
    }

    if (error) {
      console.error('[Trend] Error fetching weeks:', error.message, error.details);
      return getDefaultMockTrendData();
    }

    if (!weeks || weeks.length === 0) {
      console.warn(`[Trend] No weeks found at all, using default mock data`);

      const { data: childCheck } = await supabase
        .from('children')
        .select('id, name, user_id')
        .eq('id', childId)
        .single();

      console.log('[Trend] Child info:', childCheck);
      return getDefaultMockTrendData();
    }

    console.log(`[Trend] Found ${weeks.length} actual weeks for child: ${childId}`);

    // 실제 데이터 주 로깅
    console.log('[Trend] All weeks from DB:');
    weeks.forEach((w, idx) => {
      console.log(`  ${idx + 1}. ${w.week_start_date} (ID: ${w.id})`);
    });

    // ✨ 핵심 로직: 최신 N개만 선택 (빈 주차 제외!)
    const recentWeeks = weeks.slice(-Math.min(weeksCount, weeks.length));

    console.log(`[Trend] Selected ${recentWeeks.length} recent weeks (requested: ${weeksCount})`);
    console.log('[Trend] Selected weeks:');
    recentWeeks.forEach((w, idx) => {
      const isoWeek = getISOWeekNumber(w.week_start_date);
      console.log(`  ${idx + 1}. ${w.week_start_date} (${isoWeek}주차)`);
    });

    // 각 주별 완료율 시뮬레이션 (Mock 데이터)
    const completionRates = [72, 68, 75, 82, 88, 95, 80, 85];

    // 실제 데이터만 변환 (has_data는 항상 true)
    const trendData = recentWeeks.map((weekData, index) => {
      const startDate = new Date(weekData.week_start_date);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      const completionRate = completionRates[index % completionRates.length];

      return {
        week_id: weekData.id,
        week_start_date: weekData.week_start_date,
        week_end_date: endDate.toISOString().split('T')[0],
        completion_rate: completionRate,
        total_habits: 5,
        completed_habits: Math.round((completionRate / 100) * 5),
        has_data: true, // 항상 true (빈 주차 없음)
      };
    });

    console.log(`[Trend] Generated ${trendData.length} trend data points (all with actual data)`);
    return trendData;
  } catch (error) {
    console.error('Error generating mock trend data:', error);
    return getDefaultMockTrendData();
  }
}

/**
 * 기본 Mock 추세 데이터
 */
function getDefaultMockTrendData() {
  return [
    { week_id: '1', week_start_date: '2025-09-08', week_end_date: '2025-09-14', completion_rate: 72, total_habits: 5, completed_habits: 4 },
    { week_id: '2', week_start_date: '2025-09-15', week_end_date: '2025-09-21', completion_rate: 68, total_habits: 5, completed_habits: 3 },
    { week_id: '3', week_start_date: '2025-09-22', week_end_date: '2025-09-28', completion_rate: 75, total_habits: 5, completed_habits: 4 },
    { week_id: '4', week_start_date: '2025-09-29', week_end_date: '2025-10-05', completion_rate: 82, total_habits: 5, completed_habits: 4 },
    { week_id: '5', week_start_date: '2025-10-06', week_end_date: '2025-10-12', completion_rate: 88, total_habits: 5, completed_habits: 4 },
    { week_id: '6', week_start_date: '2025-10-13', week_end_date: '2025-10-19', completion_rate: 95, total_habits: 5, completed_habits: 5 },
  ];
}

/**
 * Fetch comparison data for all children
 */
export function useComparisonData(userId: string): UseQueryResult<any> {
  return useQuery({
    queryKey: ['comparison', userId],
    queryFn: async () => {
      if (!userId) return null;

      // 개발/테스트 환경에서는 실제 데이터베이스 기반 Mock 데이터 반환
      if (import.meta.env.DEV) {
        console.log('[Mock] Generating comparison data from actual children');
        return await generateMockComparisonData(userId);
      }

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
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // v5: cacheTime -> gcTime
    refetchInterval: 30 * 1000, // 30초마다 새로고침
  });
}

/**
 * Fetch trend data for a specific child
 */
export function useTrendData(
  childId: string,
  weeks: number = 8
): UseQueryResult<any> {
  return useQuery({
    queryKey: ['trend', childId, weeks],
    queryFn: async () => {
      if (!childId) return null;

      // 개발/테스트 환경에서는 실제 데이터베이스 기반 Mock 데이터 반환
      if (import.meta.env.DEV) {
        console.log('[Mock] Generating trend data from actual weeks');
        return await generateMockTrendData(childId, weeks);
      }

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
    enabled: !!childId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 15 * 60 * 1000, // v5: cacheTime -> gcTime
  });
}

/**
 * Fetch insights for a specific child
 */
export function useInsights(
  childId: string,
  weeks: number = 4
): UseQueryResult<any> {
  return useQuery({
    queryKey: ['insights', childId, weeks],
    queryFn: async () => {
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
    enabled: !!childId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 15 * 60 * 1000, // v5: cacheTime -> gcTime
  });
}

/**
 * Fetch monthly statistics for a specific child
 */
export function useMonthlyStats(
  childId: string,
  year: number,
  month: number
): UseQueryResult<any> {
  return useQuery({
    queryKey: ['monthly', childId, year, month],
    queryFn: async () => {
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
    enabled: !!childId && !!year && !!month,
    staleTime: 15 * 60 * 1000, // 15분
    gcTime: 30 * 60 * 1000, // v5: cacheTime -> gcTime
  });
}

/**
 * Invalidate all dashboard queries
 */
export function useInvalidateDashboardQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateComparison: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: ['comparison', userId] }),
    invalidateTrend: (childId: string) =>
      queryClient.invalidateQueries({ queryKey: ['trend', childId] }),
    invalidateInsights: (childId: string) =>
      queryClient.invalidateQueries({ queryKey: ['insights', childId] }),
    invalidateMonthly: (childId: string) =>
      queryClient.invalidateQueries({ queryKey: ['monthly', childId] }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: ['comparison'] }),
  };
}
