/**
 * WeeklyBarChart Component
 * Agent 2: Statistics Engineer - Day 2
 *
 * Displays daily habit completion as a bar chart
 * - X-axis: Days of week (월, 화, 수, 목, 금, 토, 일)
 * - Y-axis: Number of completed habits
 * - Color-coded bars based on success rate
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

/**
 * WeeklyBarChart Component
 *
 * @param {Object} props
 * @param {Array} props.dailyStats - Daily statistics from useWeekStats hook
 *   [{dayOfWeek: '월', successRate: 85, completedCount: 6, totalHabits: 7}, ...]
 * @param {number} props.height - Chart height in pixels (default: 300)
 */
export function WeeklyBarChart({ dailyStats, height = 300 }) {
  // Transform data for Recharts
  const chartData = dailyStats.map(day => ({
    day: day.dayOfWeek,
    completed: day.completedCount,
    total: day.totalHabits,
    successRate: day.successRate
  }))

  /**
   * Get bar color based on success rate
   * Green: >80%, Yellow: 50-80%, Red: <50%
   */
  const getBarColor = (successRate) => {
    if (successRate >= 80) return '#10B981' // green-500
    if (successRate >= 50) return '#F59E0B' // yellow-500
    return '#EF4444' // red-500
  }

  /**
   * Custom tooltip showing detailed stats
   */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
        <div className="text-sm font-bold text-gray-800 mb-1">{data.day}요일</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>완료: <span className="font-semibold">{data.completed}/{data.total}</span></div>
          <div>달성률: <span className="font-semibold">{data.successRate}%</span></div>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#D1D5DB' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#D1D5DB' }}
          label={{
            value: '완료 습관 수',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12, fill: '#6B7280' }
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="completed" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.successRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
