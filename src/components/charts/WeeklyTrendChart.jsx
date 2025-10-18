/**
 * WeeklyTrendChart Component
 * Shows weekly success rate trend over a month (4-5 weeks)
 * Agent 2: Statistics Engineer
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/**
 * Get color based on success rate
 */
const getLineColor = (rate) => {
  if (rate >= 80) return '#10B981' // green-500
  if (rate >= 50) return '#F59E0B' // yellow-500
  return '#EF4444' // red-500
}

/**
 * Custom Tooltip
 */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900">{data.week}</p>
      <p className="text-sm text-gray-600 mt-1">
        성공률: <span className="font-medium text-purple-600">{data.successRate}%</span>
      </p>
      <p className="text-sm text-gray-600">
        완료: {data.completedHabits}/{data.totalHabits}
      </p>
    </div>
  )
}

/**
 * WeeklyTrendChart Component
 * @param {Object} props
 * @param {Array} props.weeklyData - Array of week stats
 * @param {number} props.height - Chart height (default 300)
 */
export const WeeklyTrendChart = ({ weeklyData = [], height = 300 }) => {
  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-lg">📊</p>
          <p className="text-sm mt-2">주간 데이터가 없습니다</p>
        </div>
      </div>
    )
  }

  // Calculate average for line color
  const avgRate = Math.round(
    weeklyData.reduce((sum, w) => sum + w.successRate, 0) / weeklyData.length
  )

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={weeklyData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="week"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="successRate"
            stroke={getLineColor(avgRate)}
            strokeWidth={3}
            dot={{ fill: getLineColor(avgRate), r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
