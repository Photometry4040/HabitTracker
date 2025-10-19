/**
 * 실제 월간 데이터 조회 테스트 스크립트
 * Phase 1 구현 검증용
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env 파일 수동 파싱
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

/**
 * 실제 월간 데이터 조회 (useDashboardData.ts와 동일한 로직)
 */
async function testRealMonthlyData(childId, year, month) {
  try {
    console.log(`\n🔍 Testing real monthly data for child: ${childId}, ${year}-${month}`);
    console.log('─'.repeat(60));

    // Step 1: 해당 월의 weeks 조회
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    console.log(`📅 Query range: ${monthStart} ~ ${monthEnd}`);

    const { data: weeks, error: weeksError } = await supabase
      .from('weeks')
      .select('id, week_start_date')
      .eq('child_id', childId)
      .gte('week_start_date', monthStart)
      .lt('week_start_date', monthEnd)
      .order('week_start_date', { ascending: true });

    if (weeksError) {
      console.error('❌ Error fetching weeks:', weeksError);
      return null;
    }

    if (!weeks || weeks.length === 0) {
      console.log('⚪ No weeks found - Empty State 표시 예정');
      return null;
    }

    console.log(`✅ Found ${weeks.length} weeks:`);
    weeks.forEach((w, idx) => {
      console.log(`   ${idx + 1}. ${w.week_start_date} (ID: ${w.id})`);
    });

    // Step 2: 각 주의 habit records 조회
    console.log('\n📊 Calculating completion rates...');
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

        const completionRate = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;
        const hasData = totalCount > 0;

        console.log(`   Week ${index + 1} (${week.week_start_date}): ${completionRate}% (${greenCount}/${totalCount} records) ${hasData ? '✓' : '○'}`);

        return {
          week: index + 1,
          week_start: week.week_start_date,
          completion_rate: completionRate,
          total_records: totalCount,
          green_count: greenCount,
          has_data: hasData,
        };
      })
    );

    const validWeeks = weekStats.filter(w => w.has_data);

    if (validWeeks.length === 0) {
      console.log('\n⚪ No valid habit records found - Empty State 표시 예정');
      return null;
    }

    // Step 3: 통계 계산
    const avgCompletion = Math.round(
      validWeeks.reduce((sum, w) => sum + w.completion_rate, 0) / validWeeks.length
    );

    const bestWeek = validWeeks.reduce((prev, current) =>
      prev.completion_rate > current.completion_rate ? prev : current
    );

    const worstWeek = validWeeks.reduce((prev, current) =>
      prev.completion_rate < current.completion_rate ? prev : current
    );

    console.log('\n✅ Monthly Statistics:');
    console.log(`   📈 Average Completion: ${avgCompletion}%`);
    console.log(`   🟢 Best Week: ${bestWeek.completion_rate}% (Week ${bestWeek.week})`);
    console.log(`   🔴 Worst Week: ${worstWeek.completion_rate}% (Week ${worstWeek.week})`);
    console.log(`   📊 Total Valid Weeks: ${validWeeks.length}/${weekStats.length}`);

    return {
      summary: {
        year,
        month,
        month_name: `${year}년 ${month}월`,
        total_weeks: validWeeks.length,
        average_completion: avgCompletion,
        best_week: bestWeek,
        worst_week: worstWeek,
        weeks: weekStats,
      },
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * 모든 children 조회 후 테스트
 */
async function runTests() {
  console.log('🧪 Real Monthly Data Query Test');
  console.log('='.repeat(60));

  // 1. 모든 children 조회
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .limit(3);

  if (!children || children.length === 0) {
    console.log('⚠️ No children found in database');
    return;
  }

  console.log(`\n📋 Found ${children.length} children:`);
  children.forEach((child, idx) => {
    console.log(`   ${idx + 1}. ${child.name} (ID: ${child.id})`);
  });

  // 2. 현재 월 테스트
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  console.log(`\n🎯 Testing current month: ${currentYear}-${currentMonth}`);
  const firstChild = children[0];
  await testRealMonthlyData(firstChild.id, currentYear, currentMonth);

  // 3. 10월 테스트 (실제 데이터 있을 가능성 높음)
  console.log(`\n🎯 Testing October 2025 (likely has data)`);
  await testRealMonthlyData(firstChild.id, 2025, 10);

  // 4. 미래 월 테스트 (Empty State 예상)
  console.log(`\n🎯 Testing future month: 2026-6 (should be empty)`);
  await testRealMonthlyData(firstChild.id, 2026, 6);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed!');
}

runTests().catch(console.error);
