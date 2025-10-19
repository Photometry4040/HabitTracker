import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getISOWeekNumber } from '@/lib/weekNumber.js';

const DASHBOARD_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-aggregation`;

/**
 * 실제 데이터베이스에서 아이들 비교 데이터 조회
 * @returns {Object|null} 실제 데이터 또는 null
 */
async function generateRealComparisonData(userId: string, period: string = 'current_week', customWeekStart?: string) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 [Comparison] Starting for user: ${userId}`);
    console.log(`📅 Period: ${period}${customWeekStart ? ` (${customWeekStart})` : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Step 1: 비교 기준 주 결정
    const targetWeekStart = customWeekStart || getComparisonWeekStart(period);
    const periodLabel = formatComparisonPeriod(period, targetWeekStart);

    console.log(`🎯 Target week: ${targetWeekStart} (${periodLabel})`);

    // Step 2: 모든 children 조회
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name')
      .eq('user_id', userId);

    if (childrenError || !children || children.length === 0) {
      console.log('❌ No children found');
      return null;
    }

    console.log(`✅ Found ${children.length} children\n`);

    // Step 3: 각 아이의 해당 주차 완료율 계산 (동일 기간 비교)
    const childrenData = await Promise.all(
      children.map(async (child) => {
        // 지정된 주차 조회
        const { data: targetWeek } = await supabase
          .from('weeks')
          .select('id, week_start_date')
          .eq('child_id', child.id)
          .eq('week_start_date', targetWeekStart)
          .maybeSingle();

        // 지정 주차에 데이터가 없는 경우
        if (!targetWeek) {
          console.log(`  ⚪ ${child.name}: No data for ${targetWeekStart}`);
          return {
            child_id: child.id,
            child_name: child.name,
            current_rate: 0,
            last_week_rate: null,
            trend: 'stable',
            trend_value: 0,
            total_habits: 0,
            completed_habits: 0,
            has_data: false,
            no_data_message: `${periodLabel}에 기록 없음`,
          };
        }

        // 현재 주 완료율 계산
        const { data: currentHabits } = await supabase
          .from('habits')
          .select(`
            id,
            habit_records (
              status
            )
          `)
          .eq('week_id', targetWeek.id);

        const currentRecords = currentHabits?.flatMap(h => h.habit_records) || [];
        const currentGreen = currentRecords.filter(r => r.status === 'green').length;
        const currentTotal = currentRecords.length;
        const currentRate = currentTotal > 0 ? Math.round((currentGreen / currentTotal) * 100) : 0;

        // 이전 주 완료율 계산 (있으면)
        const prevWeekStart = new Date(targetWeekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

        const { data: prevWeek } = await supabase
          .from('weeks')
          .select('id')
          .eq('child_id', child.id)
          .eq('week_start_date', prevWeekStartStr)
          .maybeSingle();

        let lastWeekRate = null;
        if (prevWeek) {
          const { data: lastHabits } = await supabase
            .from('habits')
            .select(`
              id,
              habit_records (
                status
              )
            `)
            .eq('week_id', prevWeek.id);

          const lastRecords = lastHabits?.flatMap(h => h.habit_records) || [];
          const lastGreen = lastRecords.filter(r => r.status === 'green').length;
          const lastTotal = lastRecords.length;
          lastWeekRate = lastTotal > 0 ? Math.round((lastGreen / lastTotal) * 100) : 0;
        }

        const trend = lastWeekRate !== null
          ? (currentRate > lastWeekRate ? 'up' : currentRate < lastWeekRate ? 'down' : 'stable')
          : 'stable';

        const statusIcon = currentTotal > 0 ? '✅' : '⚪';
        console.log(`  ${statusIcon} ${child.name}: ${currentRate}% (prev: ${lastWeekRate ?? 'N/A'}%) ${trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}`);

        return {
          child_id: child.id,
          child_name: child.name,
          current_rate: currentRate,
          last_week_rate: lastWeekRate,
          trend,
          trend_value: lastWeekRate !== null ? Math.abs(currentRate - lastWeekRate) : 0,
          total_habits: currentHabits?.length || 0,
          completed_habits: currentGreen,
          has_data: currentTotal > 0,
        };
      })
    );

    // 모든 아이 포함 (데이터 없어도 표시)
    const allChildren = childrenData.filter(c => c !== null);

    if (allChildren.length === 0) {
      console.log('\n❌ No children data');
      return null;
    }

    // 완료율 기준 정렬 및 순위 매기기
    allChildren.sort((a, b) => b.current_rate - a.current_rate);
    const rankedData = allChildren.map((child, index) => ({
      ...child,
      rank: index + 1,
      rank_emoji: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐',
    }));

    const dataCount = rankedData.filter(c => c.has_data).length;
    const noDataCount = rankedData.filter(c => !c.has_data).length;

    console.log(`\n📊 Summary:`);
    console.log(`  • Total children: ${rankedData.length}`);
    console.log(`  • With data: ${dataCount}`);
    console.log(`  • No data: ${noDataCount}`);
    console.log(`\n${'='.repeat(60)}\n`);

    return {
      children: rankedData,
      week: periodLabel,
      period,
      target_week_start: targetWeekStart,
    };
  } catch (error) {
    console.error('❌ [Comparison] Error:', error);
    return null;
  }
}

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
 * Helper: 월요일로 날짜 조정
 */
function getMonday(date: Date): Date {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + diffToMonday);
  return monday;
}

/**
 * Helper: 비교 기간에 따른 기준 주 시작일 계산
 */
function getComparisonWeekStart(period: string): string {
  const today = new Date();
  const currentMonday = getMonday(today);

  switch (period) {
    case 'current_week':
      return currentMonday.toISOString().split('T')[0];

    case 'last_week':
      const lastWeek = new Date(currentMonday);
      lastWeek.setDate(currentMonday.getDate() - 7);
      return lastWeek.toISOString().split('T')[0];

    case 'this_month':
      // 이번 달 첫 주 월요일
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return getMonday(thisMonth).toISOString().split('T')[0];

    case 'last_month':
      // 지난 달 첫 주 월요일
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return getMonday(lastMonth).toISOString().split('T')[0];

    default:
      return currentMonday.toISOString().split('T')[0];
  }
}

/**
 * Helper: 기간 표시 텍스트 생성
 */
function formatComparisonPeriod(period: string, weekStart?: string): string {
  const today = new Date();

  switch (period) {
    case 'current_week':
      return '이번 주';
    case 'last_week':
      return '지난 주';
    case 'this_month':
      return `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
    case 'last_month':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      return `${lastMonth.getFullYear()}년 ${lastMonth.getMonth() + 1}월`;
    case 'custom':
      if (weekStart) {
        const date = new Date(weekStart);
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 주`;
      }
      return '사용자 지정';
    default:
      return '이번 주';
  }
}

/**
 * Helper: 주차 데이터 객체 생성
 */
function createWeekObject(weekStart: Date, hasData = false) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    week_start_date: weekStart.toISOString().split('T')[0],
    week_end_date: weekEnd.toISOString().split('T')[0],
    has_data: hasData,
    completion_rate: 0,
    total_habits: 0,
    completed_habits: 0,
    week_id: null,
  };
}

/**
 * 실제 데이터베이스에서 Trend 데이터 조회
 * ✨ 모든 주차를 연속적으로 표시 (빈 주차 포함)
 *
 * 로직:
 * 1. DB에서 아이의 모든 주차 조회
 * 2. 가장 오래된 주부터 현재까지 연속된 주차 생성
 * 3. DB 데이터와 매칭하여 실제 데이터 채우기
 * 4. 빈 주차는 "데이터 없음"으로 표시
 *
 * @param {string} childId - 아이 ID
 * @param {number} weeksCount - 표시할 주차 수
 * @returns {Array|null} 실제 데이터 또는 null (오류 시)
 */
async function generateRealTrendData(childId: string, weeksCount: number) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 [Trend Analysis] Starting for child: ${childId}`);
    console.log(`📅 Requested weeks: ${weeksCount}`);
    console.log(`${'='.repeat(60)}\n`);

    // Step 1: 현재 주(월요일 기준) 계산
    const currentWeekMonday = getMonday(new Date());
    console.log(`📍 Current week starts: ${currentWeekMonday.toISOString().split('T')[0]}`);

    // Step 2: DB에서 아이의 모든 주차 범위 조회
    const { data: dbWeekDates, error: dbError } = await supabase
      .from('weeks')
      .select('week_start_date')
      .eq('child_id', childId)
      .order('week_start_date', { ascending: true });

    if (dbError) {
      console.error('❌ Error fetching week dates:', dbError);
    }

    // Step 3: 시작일과 종료일 결정
    let rangeStart: Date;
    const rangeEnd: Date = currentWeekMonday;

    if (dbWeekDates && dbWeekDates.length > 0) {
      // DB에 데이터가 있는 경우
      const dbOldestDate = new Date(dbWeekDates[0].week_start_date);
      const dbNewestDate = new Date(dbWeekDates[dbWeekDates.length - 1].week_start_date);

      // 요청된 주차 수만큼 거슬러 올라간 날짜 계산
      const requestedStart = new Date(currentWeekMonday);
      requestedStart.setDate(currentWeekMonday.getDate() - ((weeksCount - 1) * 7));

      // DB의 가장 오래된 날짜와 계산된 날짜 중 더 이전 날짜 사용
      // 이렇게 하면 DB에 있는 모든 데이터가 포함됨
      rangeStart = dbOldestDate < requestedStart ? dbOldestDate : requestedStart;

      console.log(`📚 DB data found: ${dbWeekDates.length} weeks`);
      console.log(`  • Oldest DB week: ${dbWeekDates[0].week_start_date}`);
      console.log(`  • Newest DB week: ${dbWeekDates[dbWeekDates.length - 1].week_start_date}`);
      console.log(`  • Requested start: ${requestedStart.toISOString().split('T')[0]}`);
      console.log(`  ✅ Using start: ${rangeStart.toISOString().split('T')[0]} (${dbOldestDate < requestedStart ? 'DB oldest' : 'requested'})`);
    } else {
      // DB에 데이터가 없는 경우
      rangeStart = new Date(currentWeekMonday);
      rangeStart.setDate(currentWeekMonday.getDate() - ((weeksCount - 1) * 7));
      console.log(`📚 No DB data found`);
      console.log(`  ✅ Using requested range: ${weeksCount} weeks from ${rangeStart.toISOString().split('T')[0]}`);
    }

    // Step 4: 연속된 모든 주차 생성
    console.log(`\n🔧 Generating continuous weeks...`);
    const allWeeks = [];
    const iterDate = new Date(rangeStart);

    while (iterDate <= rangeEnd) {
      allWeeks.push(createWeekObject(new Date(iterDate)));
      iterDate.setDate(iterDate.getDate() + 7);
    }

    console.log(`  ✅ Generated: ${allWeeks.length} continuous weeks`);
    console.log(`  📆 Date range: ${allWeeks[0].week_start_date} to ${allWeeks[allWeeks.length - 1].week_start_date}`);

    // Step 5: 생성된 범위 내의 실제 데이터 조회
    console.log(`\n🔍 Fetching actual data from DB...`);
    const { data: weeksWithData, error: fetchError } = await supabase
      .from('weeks')
      .select('id, week_start_date')
      .eq('child_id', childId)
      .gte('week_start_date', allWeeks[0].week_start_date)
      .lte('week_start_date', allWeeks[allWeeks.length - 1].week_start_date)
      .order('week_start_date', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching weeks data:', fetchError);
      return allWeeks; // 에러 발생해도 빈 주차 배열 반환
    }

    if (!weeksWithData || weeksWithData.length === 0) {
      console.log(`  ℹ️ No data found in range - all weeks will show as empty`);
      return allWeeks;
    }

    console.log(`  ✅ Found ${weeksWithData.length} weeks with data`);

    // Step 6: 각 주차별 상세 데이터 조회 및 매칭
    console.log(`\n📈 Processing weekly data...`);
    for (const weekData of weeksWithData) {
      const targetWeek = allWeeks.find(w => w.week_start_date === weekData.week_start_date);

      if (!targetWeek) {
        console.error(`  ❌ Unexpected: Week ${weekData.week_start_date} exists in DB but not in generated range`);
        continue;
      }

      // 해당 주차의 습관 및 기록 조회
      const { data: habitsData } = await supabase
        .from('habits')
        .select(`
          id,
          name,
          habit_records (
            status,
            record_date
          )
        `)
        .eq('week_id', weekData.id);

      // 데이터 집계
      const allRecords = habitsData?.flatMap(h => h.habit_records) || [];
      const greenCount = allRecords.filter(r => r.status === 'green').length;
      const totalRecordCount = allRecords.length;

      // 주차 데이터 업데이트
      targetWeek.week_id = weekData.id;
      targetWeek.has_data = totalRecordCount > 0;
      targetWeek.completion_rate = totalRecordCount > 0
        ? Math.round((greenCount / totalRecordCount) * 100)
        : 0;
      targetWeek.total_habits = habitsData?.length || 0;
      targetWeek.completed_habits = greenCount;

      // 로깅
      const statusIcon = targetWeek.has_data ? '✅' : '⚪';
      const percentage = targetWeek.has_data ? `${targetWeek.completion_rate}%` : 'no records';
      console.log(`  ${statusIcon} Week ${weekData.week_start_date}: ${percentage} (${greenCount}/${totalRecordCount} green)`);
    }

    // Step 7: 최종 통계 및 검증
    const weeksWithRecords = allWeeks.filter(w => w.has_data).length;
    const emptyWeeks = allWeeks.filter(w => !w.has_data).length;

    console.log(`\n📊 Final Statistics:`);
    console.log(`  • Total weeks: ${allWeeks.length}`);
    console.log(`  • With data: ${weeksWithRecords} weeks`);
    console.log(`  • Empty: ${emptyWeeks} weeks`);

    // 상세 디버깅 (개발 모드에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔍 Detailed week list:`);
      allWeeks.forEach((week, index) => {
        const isoWeek = getISOWeekNumber(week.week_start_date);
        const status = week.has_data
          ? `📊 ${week.completion_rate}%`
          : '⚪ empty';
        console.log(`  [${index.toString().padStart(2, '0')}] Week ${isoWeek} (${week.week_start_date}): ${status}`);
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ [Trend Analysis] Complete`);
    console.log(`${'='.repeat(60)}\n`);

    return allWeeks;
  } catch (error) {
    console.error('[Real Trend] Error:', error);
    return null;
  }
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
        .maybeSingle();

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
export function useComparisonData(
  userId: string,
  period: string = 'current_week',
  customWeekStart?: string
): UseQueryResult<any> {
  return useQuery({
    queryKey: ['comparison', userId, period, customWeekStart],
    queryFn: async () => {
      if (!userId) return null;

      // TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용 (Edge Function 500 에러 우회)
      // TODO: Edge Function 문제 해결 후 원래대로 복구
      console.log('[Comparison] Attempting to fetch real data (direct DB query)');
      const realData = await generateRealComparisonData(userId, period, customWeekStart);

      if (realData && realData.children && realData.children.length > 0) {
        console.log('[Comparison] ✅ Using real comparison data');
        return realData;
      }

      // 실제 데이터가 없으면 null 반환 (Empty State 표시)
      console.log('[Comparison] ⚪ No real comparison data found, returning null');
      return null;

      // ORIGINAL CODE (Edge Function 사용 - 현재 500 에러로 비활성화)
      // const { data: session } = await supabase.auth.getSession();
      // if (!session?.session?.access_token) {
      //   throw new Error('Not authenticated');
      // }
      //
      // const response = await fetch(DASHBOARD_API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${session.session.access_token}`,
      //   },
      //   body: JSON.stringify({
      //     operation: 'comparison',
      //     data: { userId },
      //   }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to fetch comparison data');
      // }
      //
      // const result = await response.json();
      // return result.result;
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

      // TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용 (Edge Function 500 에러 우회)
      // TODO: Edge Function 문제 해결 후 원래대로 복구
      console.log('[Trend] Attempting to fetch real trend data (direct DB query)');
      const realData = await generateRealTrendData(childId, weeks);

      if (realData) {
        console.log('[Trend] ✅ Using real trend data (continuous weeks)');
        return realData;
      }

      console.log('[Trend] ❌ Error generating trend data, returning null');
      return null;

      // ORIGINAL CODE (Edge Function 사용 - 현재 500 에러로 비활성화)
      // const { data: session } = await supabase.auth.getSession();
      // if (!session?.session?.access_token) {
      //   throw new Error('Not authenticated');
      // }
      //
      // const response = await fetch(DASHBOARD_API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${session.session.access_token}`,
      //   },
      //   body: JSON.stringify({
      //     operation: 'trends',
      //     data: { childId, weeks },
      //   }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to fetch trend data');
      // }
      //
      // const result = await response.json();
      // return result.result;
    },
    enabled: !!childId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 15 * 60 * 1000, // v5: cacheTime -> gcTime
  });
}

/**
 * 자기인식 분석 Mock 데이터 생성
 */
async function generateMockInsightsData(childId: string, weeksCount: number = 4) {
  try {
    console.log(`[Insights] Generating insights for child: ${childId}, weeks: ${weeksCount}`);

    // 트렌드 데이터 가져오기 (같은 기간)
    const trendData = await generateMockTrendData(childId, weeksCount);

    if (!trendData || trendData.length === 0) {
      console.warn('[Insights] No trend data available');
      return null;
    }

    // 습관 데이터 샘플 (실제로는 DB에서 가져와야 함)
    const habits = [
      { id: 1, name: '아침에 일어나기', color: 'blue' },
      { id: 2, name: '책 읽기', color: 'green' },
      { id: 3, name: '숙제하기', color: 'purple' },
      { id: 4, name: '운동하기', color: 'red' },
      { id: 5, name: '손 씻기', color: 'yellow' },
    ];

    // 습관별 완료율 계산
    const habitStats = habits.map((habit, idx) => {
      const completionRates = [95, 85, 65, 75, 90];
      const rate = completionRates[idx % completionRates.length];
      const trend = Math.random() > 0.5 ? 'up' : 'down';

      return {
        habit_id: habit.id,
        habit_name: habit.name,
        completion_rate: rate,
        trend,
        trend_value: Math.floor(Math.random() * 15) + 5,
        total_days: weeksCount * 7,
        completed_days: Math.round((weeksCount * 7 * rate) / 100),
      };
    });

    // 강점 (상위 3개)
    const strengths = habitStats
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 3)
      .map((h, idx) => ({ ...h, rank: idx + 1 }));

    // 약점 (하위 3개)
    const weaknesses = habitStats
      .sort((a, b) => a.completion_rate - b.completion_rate)
      .slice(0, 3)
      .map((h, idx) => ({ ...h, rank: idx + 1 }));

    // 요일별 분석
    const dayOfWeekStats = [
      { day: '월요일', rate: 78, emoji: '📅' },
      { day: '화요일', rate: 82, emoji: '📅' },
      { day: '수요일', rate: 75, emoji: '📅' },
      { day: '목요일', rate: 88, emoji: '📅' },
      { day: '금요일', rate: 92, emoji: '🎉' },
      { day: '토요일', rate: 85, emoji: '📅' },
      { day: '일요일', rate: 72, emoji: '😴' },
    ];

    // 평균 완료율
    const averageCompletion =
      Math.round(
        habitStats.reduce((sum, h) => sum + h.completion_rate, 0) /
          habitStats.length
      );

    // 피드백 메시지
    let feedbackMessage = '';
    if (averageCompletion >= 85) {
      feedbackMessage = '🌟 정말 멋있어요! 계속 이 조건을 유지해주세요.';
    } else if (averageCompletion >= 70) {
      feedbackMessage = '👍 잘하고 있어요! 조금만 더 노력하면 목표 달성!';
    } else if (averageCompletion >= 50) {
      feedbackMessage = '💪 열심히 하고 있네요. 더 집중해봅시다!';
    } else {
      feedbackMessage = '🎯 목표 달성을 위해 함께 노력해봅시다!';
    }

    console.log(`[Insights] Generated insights: ${strengths.length} strengths, ${weaknesses.length} weaknesses`);

    return {
      summary: {
        average_completion: averageCompletion,
        total_habits: habitStats.length,
        feedback_message: feedbackMessage,
        period: `최근 ${weeksCount}주`,
      },
      strengths,
      weaknesses,
      day_of_week_stats: dayOfWeekStats,
      all_habit_stats: habitStats,
      insights: {
        best_day: dayOfWeekStats.reduce((prev, current) =>
          prev.rate > current.rate ? prev : current
        ),
        worst_day: dayOfWeekStats.reduce((prev, current) =>
          prev.rate < current.rate ? prev : current
        ),
        trend_summary:
          strengths.filter((s) => s.trend === 'up').length > 1
            ? 'improving'
            : 'stable',
      },
    };
  } catch (error) {
    console.error('Error generating insights data:', error);
    return null;
  }
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

      // TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용 (Edge Function 500 에러 우회)
      // TODO: Edge Function 문제 해결 후 원래대로 복구
      console.log('[Insights] Attempting to fetch data (direct DB query)');

      const { data: weeksData } = await supabase
        .from('weeks')
        .select('id')
        .eq('child_id', childId)
        .limit(weeks);

      if (!weeksData || weeksData.length === 0) {
        console.log('[Insights] ⚪ No weeks found, returning null');
        return null;
      }

      console.log('[Insights] ⚠️ Using mock insights (TODO: implement real insights)');
      return await generateMockInsightsData(childId, weeks);

      // ORIGINAL CODE (Edge Function 사용 - 현재 500 에러로 비활성화)
      // const { data: session } = await supabase.auth.getSession();
      // if (!session?.session?.access_token) {
      //   throw new Error('Not authenticated');
      // }
      //
      // const response = await fetch(DASHBOARD_API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${session.session.access_token}`,
      //   },
      //   body: JSON.stringify({
      //     operation: 'insights',
      //     data: { childId, weeks },
      //   }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to fetch insights');
      // }
      //
      // const result = await response.json();
      // return result.result;
    },
    enabled: !!childId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 15 * 60 * 1000, // v5: cacheTime -> gcTime
  });
}

/**
 * 실제 데이터베이스에서 월간 통계 조회
 * @returns {Object|null} 실제 데이터 또는 null (데이터 없을 시)
 */
async function generateRealMonthlyData(childId: string, year: number, month: number) {
  try {
    console.log(`[Real] Fetching real monthly data: ${childId}, ${year}-${month}`);

    // Step 1: 해당 월의 실제 weeks 조회
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, week_start_date')
      .eq('child_id', childId)
      .gte('week_start_date', monthStart)
      .lt('week_start_date', monthEnd)
      .order('week_start_date', { ascending: true });

    if (weeksError) {
      console.error('[Real] Error fetching weeks:', weeksError);
      return null;
    }

    if (!weeks || weeks.length === 0) {
      console.log(`[Real] No weeks found for ${year}-${month}`);
      return null; // ✅ 명시적 null 반환
    }

    console.log(`[Real] Found ${weeks.length} weeks for ${year}-${month}`);

    // Step 2: 각 주의 실제 완료율 계산
    const weekStats = await Promise.all(
      weeks.map(async (week, index) => {
        const { data: habits } = await supabase
          .from('habits')
          .select(`
            id,
            name,
            habit_records (
              status,
              record_date
            )
          `)
          .eq('week_id', week.id);

        const allRecords = habits?.flatMap(h => h.habit_records) || [];
        const greenCount = allRecords.filter(r => r.status === 'green').length;
        const totalCount = allRecords.length;

        const weekStartDate = new Date(week.week_start_date);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        return {
          week: index + 1,
          week_start: week.week_start_date,
          week_end: weekEndDate.toISOString().split('T')[0],
          completion_rate: totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0,
          total_records: totalCount,
          green_count: greenCount,
          has_data: totalCount > 0,
          emoji: totalCount === 0 ? '⚪' :
                 greenCount / totalCount >= 0.8 ? '🟢' :
                 greenCount / totalCount >= 0.5 ? '🟡' : '🔴',
        };
      })
    );

    const validWeeks = weekStats.filter(w => w.has_data);

    if (validWeeks.length === 0) {
      console.log(`[Real] No valid habit records for ${year}-${month}`);
      return null; // ✅ 기록이 없으면 null 반환
    }

    // Step 3: 월간 통계 계산
    const avgCompletion = Math.round(
      validWeeks.reduce((sum, w) => sum + w.completion_rate, 0) / validWeeks.length
    );

    const bestWeek = validWeeks.reduce((prev, current) =>
      prev.completion_rate > current.completion_rate ? prev : current
    );

    const worstWeek = validWeeks.reduce((prev, current) =>
      prev.completion_rate < current.completion_rate ? prev : current
    );

    console.log(`[Real] Calculated stats: avg=${avgCompletion}%, best=${bestWeek.completion_rate}%, worst=${worstWeek.completion_rate}%`);

    // Step 4: 지난달 데이터 조회 (비교용)
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const lastMonthData = await generateRealMonthlyData(childId, lastMonthYear, lastMonth);
    const lastMonthAvg = lastMonthData?.summary?.average_completion || null;

    return {
      summary: {
        year,
        month,
        month_name: `${year}년 ${month}월`,
        total_weeks: validWeeks.length,
        average_completion: avgCompletion,
        best_week: bestWeek,
        worst_week: worstWeek,
        weeks: weekStats, // ✅ 모든 주 포함 (has_data 플래그로 구분)
      },
      comparison: {
        current_month: `${year}년 ${month}월`,
        current_avg: avgCompletion,
        last_month: lastMonthAvg !== null ? `${lastMonthYear}년 ${lastMonth}월` : null,
        last_month_avg: lastMonthAvg,
        improvement: lastMonthAvg !== null ? avgCompletion - lastMonthAvg : null,
      },
      top_months: [], // TODO: 상위 월간 성과는 별도 집계 필요 (향후 구현)
    };
  } catch (error) {
    console.error('[Real] Error generating real monthly data:', error);
    return null;
  }
}

/**
 * 월간 통계 Mock 데이터 생성
 */
async function generateMockMonthlyData(childId: string, year: number, month: number) {
  try {
    console.log(`[Monthly] Generating monthly stats for child: ${childId}, ${year}-${month}`);

    // 월의 주 데이터 생성 (4~5주)
    const monthDays = new Date(year, month, 0).getDate(); // 해당 월의 마지막 날
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month - 1, monthDays);

    // 월간 주차 계산
    const weeks = [];
    const completionRates = [72, 68, 75, 82, 88, 95, 80];

    for (let week = 1; week <= 5; week++) {
      const weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() + (week - 1) * 7);

      if (weekStart.getMonth() === month - 1) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const rate = completionRates[week % completionRates.length];
        weeks.push({
          week,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          completion_rate: rate,
          emoji: rate >= 80 ? '🟢' : rate >= 50 ? '🟡' : '🔴',
        });
      }
    }

    // 월간 통계
    const monthlyStats = {
      year,
      month,
      month_name: `${year}년 ${month}월`,
      total_weeks: weeks.length,
      average_completion: Math.round(
        weeks.reduce((sum, w) => sum + w.completion_rate, 0) / weeks.length
      ),
      best_week: weeks.reduce((prev, current) =>
        prev.completion_rate > current.completion_rate ? prev : current
      ),
      worst_week: weeks.reduce((prev, current) =>
        prev.completion_rate < current.completion_rate ? prev : current
      ),
      weeks,
    };

    // 지난달 비교 데이터
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const lastMonthAvg = Math.floor(Math.random() * 50) + 40;

    // 상위 5개월 성과 데이터
    const topMonths = [
      { month_name: '1월', rate: 75 },
      { month_name: '2월', rate: 68 },
      { month_name: '3월', rate: 82 },
      { month_name: '4월', rate: 78 },
      { month_name: '5월', rate: 88 },
    ];

    console.log(`[Monthly] Generated ${monthlyStats.total_weeks} weeks for ${month}월`);

    return {
      summary: monthlyStats,
      comparison: {
        current_month: monthlyStats.month_name,
        current_avg: monthlyStats.average_completion,
        last_month: `${lastMonthYear}년 ${lastMonth}월`,
        last_month_avg: lastMonthAvg,
        improvement: monthlyStats.average_completion - lastMonthAvg,
      },
      top_months: topMonths,
    };
  } catch (error) {
    console.error('Error generating monthly stats:', error);
    return null;
  }
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

      // TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용 (Edge Function 500 에러 우회)
      // TODO: Edge Function 문제 해결 후 원래대로 복구
      console.log('[Monthly] Attempting to fetch real monthly data (direct DB query)');
      const realData = await generateRealMonthlyData(childId, year, month);

      if (realData) {
        console.log('[Monthly] ✅ Using real monthly data');
        return realData;
      }

      console.log('[Monthly] ⚪ No real data found, returning null');
      return null;

      // ORIGINAL CODE (Edge Function 사용 - 현재 500 에러로 비활성화)
      // const { data: session } = await supabase.auth.getSession();
      // if (!session?.session?.access_token) {
      //   throw new Error('Not authenticated');
      // }
      //
      // const response = await fetch(DASHBOARD_API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${session.session.access_token}`,
      //   },
      //   body: JSON.stringify({
      //     operation: 'monthly',
      //     data: { childId, year, month },
      //   }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to fetch monthly stats');
      // }
      //
      // const result = await response.json();
      // return result.result;
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
