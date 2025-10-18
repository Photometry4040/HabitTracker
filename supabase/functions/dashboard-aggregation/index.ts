import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, data } = await req.json();

    let result;

    switch (operation) {
      case 'comparison':
        result = await getComparisonData(supabase, data.userId);
        break;

      case 'trends':
        result = await getTrendData(supabase, data.childId, data.weeks || 8);
        break;

      case 'insights':
        result = await generateInsights(supabase, data.childId, data.weeks || 4);
        break;

      case 'monthly':
        result = await getMonthlyStats(supabase, data.childId, data.year, data.month);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Dashboard aggregation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Get comparison data for all children of a user
 * Returns current week completion rates for each child
 */
async function getComparisonData(supabase: any, userId: string) {
  console.log(`[Comparison] Fetching data for user: ${userId}`);

  // Get all children for this user
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId);

  if (childError) {
    throw new Error(`Failed to fetch children: ${childError.message}`);
  }

  if (!children || children.length === 0) {
    return {
      children: [],
      message: 'No children found',
    };
  }

  // Get current week for each child
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0];

  // Query comparison data from view
  const { data: comparisonData, error: compError } = await supabase
    .from('v_weekly_completion')
    .select('child_id, child_name, completion_rate, week_start_date, total_habits, completed_habits')
    .eq('user_id', userId)
    .eq('week_start_date', currentWeekStartStr);

  if (compError) {
    throw new Error(`Failed to fetch comparison data: ${compError.message}`);
  }

  // Get last week data for comparison
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];

  const { data: lastWeekData, error: lastWeekError } = await supabase
    .from('v_weekly_completion')
    .select('child_id, completion_rate')
    .eq('user_id', userId)
    .eq('week_start_date', lastWeekStartStr);

  if (lastWeekError) {
    console.warn('Failed to fetch last week data:', lastWeekError.message);
  }

  // Combine data with trend comparison
  const childrenWithData = children.map((child: any) => {
    const thisWeek = comparisonData?.find((d: any) => d.child_id === child.id);
    const lastWeek = lastWeekData?.find((d: any) => d.child_id === child.id);

    const thisRate = thisWeek?.completion_rate || 0;
    const lastRate = lastWeek?.completion_rate || 0;
    const trend = thisRate - lastRate;

    return {
      child_id: child.id,
      child_name: child.name,
      current_rate: thisRate,
      last_week_rate: lastRate,
      trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      trend_value: Math.abs(trend),
      total_habits: thisWeek?.total_habits || 0,
      completed_habits: thisWeek?.completed_habits || 0,
      week_start_date: currentWeekStartStr,
    };
  });

  // Sort by current rate (descending) for ranking
  childrenWithData.sort((a: any, b: any) => b.current_rate - a.current_rate);

  // Add ranking
  const rankedChildren = childrenWithData.map((child: any, index: number) => ({
    ...child,
    rank: index + 1,
    rank_emoji: ['🥇', '🥈', '🥉'][index] || '👤',
  }));

  console.log(`[Comparison] Generated data for ${rankedChildren.length} children`);

  return {
    children: rankedChildren,
    week: currentWeekStartStr,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get trend data for a specific child
 * Returns weekly completion rates over N weeks
 */
async function getTrendData(supabase: any, childId: string, weeks: number) {
  console.log(`[Trends] Fetching ${weeks} weeks of data for child: ${childId}`);

  const { data: trendData, error } = await supabase
    .from('v_weekly_completion')
    .select('week_start_date, completion_rate, total_habits, completed_habits, days_tracked')
    .eq('child_id', childId)
    .order('week_start_date', { ascending: false })
    .limit(weeks);

  if (error) {
    throw new Error(`Failed to fetch trend data: ${error.message}`);
  }

  if (!trendData || trendData.length === 0) {
    return {
      weeks: [],
      message: 'No data available',
      stats: { average: 0, max: 0, min: 0 },
    };
  }

  // Reverse to get chronological order
  const weeklyData = trendData.reverse();

  // Calculate statistics
  const rates = weeklyData.map((w: any) => w.completion_rate);
  const average = rates.reduce((a: any, b: any) => a + b, 0) / rates.length;
  const max = Math.max(...rates);
  const min = Math.min(...rates);

  // Calculate trend (linear regression)
  let trend = 0;
  if (weeklyData.length > 1) {
    const lastRate = weeklyData[weeklyData.length - 1].completion_rate;
    const firstRate = weeklyData[0].completion_rate;
    trend = lastRate - firstRate;
  }

  console.log(`[Trends] Generated trend data: avg=${average.toFixed(1)}%, trend=${trend.toFixed(1)}%`);

  return {
    weeks: weeklyData,
    stats: {
      average: Math.round(average * 100) / 100,
      max: max,
      min: min,
      trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      trend_value: Math.abs(Math.round(trend * 100) / 100),
    },
    count: weeklyData.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate self-awareness insights
 * Analyzes strengths, weaknesses, and patterns
 */
async function generateInsights(supabase: any, childId: string, weeks: number) {
  console.log(`[Insights] Generating insights for child: ${childId}`);

  // Get habit-level data
  const { data: habitData, error: habitError } = await supabase
    .from('habits h')
    .select('id, name')
    .join('weeks w', 'h.week_id = w.id')
    .eq('w.child_id', childId);

  if (habitError) {
    throw new Error(`Failed to fetch habits: ${habitError.message}`);
  }

  // Get recent completion data
  const { data: recentData, error: recentError } = await supabase
    .from('v_daily_completion')
    .select('record_date, completed_habits, total_habits, completion_rate')
    .eq('child_id', childId)
    .order('record_date', { ascending: false })
    .limit(weeks * 7);

  if (recentError) {
    throw new Error(`Failed to fetch recent data: ${recentError.message}`);
  }

  // Get failure patterns
  const { data: patterns, error: patternError } = await supabase
    .from('v_habit_failure_patterns')
    .select('habit_name, day_name, failure_rate, success_rate')
    .eq('child_id', childId);

  if (patternError) {
    throw new Error(`Failed to fetch patterns: ${patternError.message}`);
  }

  // Analyze patterns
  const habitStats = new Map();
  if (patterns) {
    patterns.forEach((p: any) => {
      if (!habitStats.has(p.habit_name)) {
        habitStats.set(p.habit_name, { name: p.habit_name, failures: [], successes: [] });
      }
      const stat = habitStats.get(p.habit_name);
      stat.failures.push({ day: p.day_name, rate: p.failure_rate });
      stat.successes.push({ day: p.day_name, rate: p.success_rate });
    });
  }

  // Identify weaknesses (lowest success rates)
  const weaknesses = Array.from(habitStats.values())
    .map((stat: any) => ({
      habit: stat.name,
      avg_success: stat.successes.reduce((sum: any, s: any) => sum + s.rate, 0) / stat.successes.length,
      hardest_day: stat.failures.reduce((max: any, f: any) => f.rate > max.rate ? f : max, { day: '', rate: 0 }).day,
    }))
    .sort((a: any, b: any) => a.avg_success - b.avg_success)
    .slice(0, 3);

  // Identify strengths (highest success rates)
  const strengths = Array.from(habitStats.values())
    .map((stat: any) => ({
      habit: stat.name,
      avg_success: stat.successes.reduce((sum: any, s: any) => sum + s.rate, 0) / stat.successes.length,
    }))
    .sort((a: any, b: any) => b.avg_success - a.avg_success)
    .slice(0, 3);

  // Calculate overall trend
  let overallTrend = 'stable';
  if (recentData && recentData.length > 2) {
    const recent = recentData[0].completion_rate;
    const older = recentData[Math.floor(recentData.length / 2)].completion_rate;
    if (recent > older) overallTrend = 'improving';
    else if (recent < older) overallTrend = 'declining';
  }

  console.log(`[Insights] Generated: ${weaknesses.length} weaknesses, ${strengths.length} strengths`);

  return {
    strengths,
    weaknesses,
    overall_trend: overallTrend,
    total_habits: habitData?.length || 0,
    data_points: recentData?.length || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get monthly statistics
 * Returns detailed data for a specific month
 */
async function getMonthlyStats(supabase: any, childId: string, year: number, month: number) {
  console.log(`[Monthly] Fetching stats for ${year}-${month} for child: ${childId}`);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  // Get daily data for the month
  const { data: dailyData, error: dailyError } = await supabase
    .from('v_daily_completion')
    .select('record_date, completion_rate, total_habits, completed_habits')
    .eq('child_id', childId)
    .gte('record_date', monthStartStr)
    .lte('record_date', monthEndStr)
    .order('record_date', { ascending: true });

  if (dailyError) {
    throw new Error(`Failed to fetch daily data: ${dailyError.message}`);
  }

  // Get weekly summary for the month
  const { data: weeklyData, error: weeklyError } = await supabase
    .from('v_weekly_completion')
    .select('week_start_date, completion_rate, total_habits, completed_habits')
    .eq('child_id', childId)
    .gte('week_start_date', monthStartStr)
    .lte('week_start_date', monthEndStr)
    .order('week_start_date', { ascending: true });

  if (weeklyError) {
    throw new Error(`Failed to fetch weekly data: ${weeklyError.message}`);
  }

  // Calculate monthly statistics
  const dailyRates = dailyData?.map((d: any) => d.completion_rate) || [];
  const monthlyAverage = dailyRates.length > 0
    ? dailyRates.reduce((a: any, b: any) => a + b, 0) / dailyRates.length
    : 0;
  const maxRate = dailyRates.length > 0 ? Math.max(...dailyRates) : 0;
  const minRate = dailyRates.length > 0 ? Math.min(...dailyRates) : 0;

  console.log(`[Monthly] Generated stats: avg=${monthlyAverage.toFixed(1)}%`);

  return {
    year,
    month,
    daily_data: dailyData || [],
    weekly_summary: weeklyData || [],
    stats: {
      average_completion: Math.round(monthlyAverage * 100) / 100,
      max_completion: maxRate,
      min_completion: minRate,
      total_days: dailyData?.length || 0,
      total_weeks: weeklyData?.length || 0,
    },
    timestamp: new Date().toISOString(),
  };
}
