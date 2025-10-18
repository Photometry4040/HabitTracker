/**
 * HabitProgressBars Component
 * Shows monthly performance for each habit as horizontal progress bars
 * Agent 2: Statistics Engineer
 */

/**
 * Get color based on success rate
 */
const getProgressColor = (rate) => {
  if (rate >= 80) return 'bg-green-500'
  if (rate >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

/**
 * Get emoji based on success rate
 */
const getEmoji = (rate) => {
  if (rate >= 80) return '🟢'
  if (rate >= 50) return '🟡'
  return '🔴'
}

/**
 * Single Habit Progress Bar
 */
const HabitBar = ({ habitName, completed, total, successRate }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const colorClass = getProgressColor(successRate)
  const emoji = getEmoji(successRate)

  return (
    <div className="py-3 border-b last:border-b-0 border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-medium text-gray-700 truncate">
            {habitName}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900 ml-3">
          {successRate}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Details */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">
          {completed}/{total} 완료
        </span>
        <span className="text-xs text-gray-500">
          {percentage}% 달성
        </span>
      </div>
    </div>
  )
}

/**
 * HabitProgressBars Component
 * @param {Object} props
 * @param {Array} props.habitData - Array of habit breakdown stats
 */
export const HabitProgressBars = ({ habitData = [] }) => {
  if (!habitData || habitData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">📊</p>
        <p className="text-sm mt-2">습관 데이터가 없습니다</p>
      </div>
    )
  }

  // Sort by success rate (highest first)
  const sortedHabits = [...habitData].sort((a, b) => b.successRate - a.successRate)

  return (
    <div className="space-y-1">
      {sortedHabits.map((habit, index) => (
        <HabitBar
          key={index}
          habitName={habit.name}
          completed={habit.completed}
          total={habit.total}
          successRate={habit.successRate}
        />
      ))}
    </div>
  )
}
