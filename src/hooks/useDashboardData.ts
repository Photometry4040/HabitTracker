import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
 * 실제 데이터베이스 기반 Mock 추세 데이터 생성
 * weeksCount 기간 동안의 모든 주를 생성하고, 실제 데이터가 있는 주만 채움
 */
async function generateMockTrendData(childId: string, weeksCount: number) {
  try {
    console.log(`[Trend] Fetching weeks for child: ${childId}, period: ${weeksCount} weeks`);

    // 해당 아이의 주 데이터 가져오기 (limit 없이 모든 주 조회)
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

    // 아이의 weeks가 없으면, 모든 weeks에서 선택
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
    console.log('[Trend] Actual weeks from DB:');
    weeks.forEach((w, idx) => {
      console.log(`  ${idx + 1}. ${w.week_start_date} (ID: ${w.id})`);
    });

    // 첫 주의 시작 날짜부터 weeksCount만큼 뒤의 날짜까지 모든 월요일 생성
    // 타임존 이슈 해결: YYYY-MM-DD 문자열을 그대로 사용
    const firstWeekDateStr = weeks[0].week_start_date;
    const [firstYear, firstMonth, firstDay] = firstWeekDateStr.split('-').map(Number);
    const firstWeekDate = new Date(firstYear, firstMonth - 1, firstDay);

    console.log(`[Trend] First week date string: ${firstWeekDateStr}`);
    console.log(`[Trend] First week date parsed: ${firstWeekDate.toDateString()}`);

    const lastWeekDate = new Date(firstWeekDate);
    lastWeekDate.setDate(lastWeekDate.getDate() + (weeksCount - 1) * 7);

    // 마지막 주 날짜도 YYYY-MM-DD 형식으로
    const lastYear = lastWeekDate.getFullYear();
    const lastMonth = String(lastWeekDate.getMonth() + 1).padStart(2, '0');
    const lastDay = String(lastWeekDate.getDate()).padStart(2, '0');
    const lastWeekDateStr = `${lastYear}-${lastMonth}-${lastDay}`;

    console.log(`[Trend] Date range: ${firstWeekDateStr} to ${lastWeekDateStr}`);

    // weeksCount개의 연속 주 생성 (YYYY-MM-DD 형식 유지)
    const allWeeksInRange = [];
    for (let i = 0; i < weeksCount; i++) {
      const weekStart = new Date(firstWeekDate);
      weekStart.setDate(weekStart.getDate() + i * 7);

      // 로컬 시간을 YYYY-MM-DD로 변환 (타임존 이슈 회피)
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartStr = `${year}-${month}-${day}`;

      allWeeksInRange.push(weekStartStr);
    }

    console.log(`[Trend] Generated ${allWeeksInRange.length} week slots for the period`);
    console.log('[Trend] Generated week slots:');
    allWeeksInRange.forEach((slot, idx) => {
      console.log(`  ${idx + 1}. ${slot}`);
    });

    // Map으로 실제 데이터 주를 빠르게 찾기
    const weekDataMap = new Map();
    weeks.forEach(w => {
      weekDataMap.set(w.week_start_date, w);
    });

    console.log('[Trend] Matching results:');
    allWeeksInRange.forEach((slot, idx) => {
      const found = weekDataMap.has(slot);
      console.log(`  ${idx + 1}. ${slot}: ${found ? '✓ FOUND' : '✗ MISSING'}`);
    });

    // 각 주별 완료율 시뮬레이션
    const completionRates = [72, 68, 75, 82, 88, 95, 80, 85];

    // 모든 주에 대해 데이터 생성 (있으면 데이터 채우고, 없으면 null/0으로 표현)
    const trendData = allWeeksInRange.map((weekStartStr, index) => {
      const weekData = weekDataMap.get(weekStartStr);
      const startDate = new Date(weekStartStr);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

      if (weekData) {
        // 실제 데이터가 있는 경우
        const completionRate = completionRates[index % completionRates.length];
        return {
          week_id: weekData.id,
          week_start_date: weekData.week_start_date,
          week_end_date: endDate.toISOString().split('T')[0],
          completion_rate: completionRate,
          total_habits: 5,
          completed_habits: Math.round((completionRate / 100) * 5),
          has_data: true,
        };
      } else {
        // 데이터가 없는 주 (누락된 주)
        return {
          week_id: null,
          week_start_date: weekStartStr,
          week_end_date: endDate.toISOString().split('T')[0],
          completion_rate: 0,
          total_habits: 0,
          completed_habits: 0,
          has_data: false,
        };
      }
    });

    console.log(`[Trend] Generated ${trendData.length} trend data points (${trendData.filter(d => d.has_data).length} with data, ${trendData.filter(d => !d.has_data).length} missing)`);
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
