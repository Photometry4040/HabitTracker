/**
 * SuccessRateDonut Component
 * Agent 2: Statistics Engineer - Day 2
 *
 * Displays success rate distribution as a donut chart
 * - Segments: Green (잘했어요), Yellow (보통), Red (아쉬워요)
 * - Center text: Overall success rate percentage
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

/**
 * SuccessRateDonut Component
 *
 * @param {Object} props
 * @param {Object} props.distribution - Color distribution from useWeekStats hook
 *   {green: 15, yellow: 8, red: 3, none: 2}
 * @param {number} props.successRate - Overall success rate percentage
 * @param {number} props.height - Chart height in pixels (default: 300)
 */
export function SuccessRateDonut({ distribution, successRate, height = 300 }) {
  // Prepare data for donut chart (exclude 'none' from display)
  const chartData = [
    { name: '잘했어요', value: distribution.green, color: '#10B981', emoji: '🟢' },
    { name: '보통', value: distribution.yellow, color: '#F59E0B', emoji: '🟡' },
    { name: '아쉬워요', value: distribution.red, color: '#EF4444', emoji: '🔴' }
  ].filter(item => item.value > 0)

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-gray-400"
        style={{ height }}
      >
        <div className="text-4xl mb-2">📊</div>
        <div className="text-sm font-medium">아직 데이터가 없어요</div>
      </div>
    )
  }

  /**
   * Custom tooltip with emoji and percentage
   */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]
    const total = chartData.reduce((sum, item) => sum + item.value, 0)
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0

    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
        <div className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1">
          <span>{data.payload.emoji}</span>
          <span>{data.name}</span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>횟수: <span className="font-semibold">{data.value}회</span></div>
          <div>비율: <span className="font-semibold">{percentage}%</span></div>
        </div>
      </div>
    )
  }

  /**
   * Custom legend with emoji
   */
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex justify-center gap-4 mt-4 flex-wrap">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-700">
              {entry.payload.emoji} {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  /**
   * Custom label showing percentage inside donut
   */
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  /**
   * Center label showing overall success rate
   */
  const CenterLabel = () => {
    return (
      <g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-3xl font-bold fill-purple-800"
        >
          {successRate}%
        </text>
        <text
          x="50%"
          y="50%"
          dy="24"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs fill-gray-600"
        >
          전체 달성률
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={renderCustomLabel}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <CenterLabel />
      </PieChart>
    </ResponsiveContainer>
  )
}
