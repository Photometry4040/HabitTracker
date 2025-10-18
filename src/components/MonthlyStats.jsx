/**
 * MonthlyStats Component
 * Displays monthly statistics for a child's habits
 * Agent 2: Statistics Engineer
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, TrendingUp, TrendingDown, Award, Target } from 'lucide-react'
import { WeeklyTrendChart } from '@/components/charts/WeeklyTrendChart.jsx'
import { SuccessRateDonut } from '@/components/charts/SuccessRateDonut.jsx'
import { HabitProgressBars } from '@/components/charts/HabitProgressBars.jsx'
import { calculateMonthStats } from '@/lib/statistics.js'

/**
 * Summary Card Component
 */
const SummaryCard = ({ icon: Icon, title, value, subtitle, color = 'purple' }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50'
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * MonthlyStats Component
 * @param {Object} props
 * @param {string} props.childName - Child name
 * @param {string} props.month - Month in YYYY-MM format
 */
export const MonthlyStats = ({ childName, month }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!childName || !month) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await calculateMonthStats(childName, month)
        setStats(data)
      } catch (err) {
        console.error('Failed to load monthly stats:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [childName, month])

  // Loading state
  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center text-gray-600">월간 통계 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">통계 로딩 실패: {error}</div>
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!stats || !stats.exists) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-600">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>해당 월의 데이터가 없습니다</p>
            <p className="text-sm mt-1">습관을 기록하면 통계가 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { overall, weeks, habitBreakdown } = stats

  // Format month for display
  const monthName = new Date(month + '-01').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-purple-800">
                월간 통계
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {monthName} • {childName}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {overall.successRate}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              주별 성공률 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyTrendChart weeklyData={weeks} height={250} />
          </CardContent>
        </Card>

        {/* Monthly Donut */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              월간 성과 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SuccessRateDonut
              distribution={overall.distribution}
              successRate={overall.successRate}
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          icon={Award}
          title="최고의 주"
          value={`${overall.bestWeek.number}주차`}
          subtitle={`${overall.bestWeek.rate}%`}
          color="green"
        />
        <SummaryCard
          icon={TrendingDown}
          title="최저의 주"
          value={`${overall.worstWeek.number}주차`}
          subtitle={`${overall.worstWeek.rate}%`}
          color="red"
        />
        <SummaryCard
          icon={Target}
          title="평균 성공률"
          value={`${overall.successRate}%`}
          color="purple"
        />
        <SummaryCard
          icon={Calendar}
          title="총 습관 수"
          value={`${overall.totalHabits}개`}
          subtitle="이번 달"
          color="blue"
        />
        <SummaryCard
          icon={TrendingUp}
          title="총 완료 수"
          value={`${overall.totalCompleted}개`}
          subtitle="완료/체크"
          color="orange"
        />
      </div>

      {/* Habit Breakdown */}
      {habitBreakdown && habitBreakdown.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              습관별 월간 성과
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              각 습관의 이번 달 달성률
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HabitProgressBars habitData={habitBreakdown} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
